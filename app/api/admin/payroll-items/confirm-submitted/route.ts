// app/api/admin/payroll-items/confirm-submitted/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ethers } from "ethers";

export const runtime = "nodejs";

async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function isRetryableRpcError(e: any) {
  const msg = String(e?.shortMessage ?? e?.message ?? e ?? "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("network") ||
    msg.includes("socket") ||
    msg.includes("connection") ||
    msg.includes("cannot start up") ||
    msg.includes("failed to detect network") ||
    msg.includes("failed to detect") ||
    msg.includes("rate") ||
    msg.includes("429") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504")
  );
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 350): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      attempt++;
      if (attempt > retries || !isRetryableRpcError(e)) throw e;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const batchId = url.searchParams.get("batchId") ?? "";

    if (!batchId || !isUuid(batchId)) {
      return NextResponse.json({ ok: false, error: "Invalid batchId" }, { status: 400 });
    }

    const supabase = await supabaseServer();

    // 1) must be logged in
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2) ownership check: batch -> company -> owner_user_id
    const { data: batch, error: bErr } = await supabase
      .from("payroll_batches")
      .select("id, company_id")
      .eq("id", batchId)
      .single();

    if (bErr || !batch) {
      return NextResponse.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }

    const { data: company, error: cErr } = await supabase
      .from("companies")
      .select("id")
      .eq("id", batch.company_id)
      .eq("owner_user_id", u.user.id)
      .maybeSingle();

    if (cErr || !company) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // 3) load submitted items in this batch
    const { data: items, error: itemsErr } = await supabase
      .from("payroll_items")
      .select("id, tx_hash, status")
      .eq("batch_id", batchId)
      .eq("status", "submitted")
      .not("tx_hash", "is", null);

    if (itemsErr) {
      return NextResponse.json({ ok: false, error: "Failed to load items", detail: itemsErr.message }, { status: 500 });
    }

    const list = items ?? [];
    if (list.length === 0) {
      // ✅ 永远 200，方便前端不报红字
      return NextResponse.json(
        { ok: true, checked: 0, updated: 0, notMined: 0, minedPaid: 0, minedFailed: 0, skippedClaim: 0, rpcBusy: 0 },
        { status: 200 }
      );
    }

    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
    if (!rpcUrl) {
      // ✅ 软失败：200
      return NextResponse.json(
        { ok: false, retryable: true, error: "Missing BASE_SEPOLIA_RPC_URL" },
        { status: 200 }
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl, { chainId: 84532, name: "base-sepolia" });

    let checked = 0;
    let updated = 0;

    let skippedClaim = 0;
    let notMined = 0;
    let minedPaid = 0;
    let minedFailed = 0;
    let rpcBusy = 0;

    for (const it of list) {
      checked++;

      const tx = String(it.tx_hash ?? "");
      if (!tx || tx.startsWith("CLAIM:")) {
        skippedClaim++;
        continue;
      }

      try {
        const receipt = await withRetry(
          () => withTimeout(provider.getTransactionReceipt(tx), 8000, "getTransactionReceipt"),
          2
        );

        if (!receipt) {
          notMined++;
          continue;
        }

        if (receipt.status === 0) {
          await supabase.from("payroll_items").update({ status: "failed" }).eq("id", it.id);
          minedFailed++;
          updated++;
          continue;
        }

        await supabase
          .from("payroll_items")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", it.id);

        minedPaid++;
        updated++;
      } catch (e: any) {
        // RPC jitter → 留给下次再确认
        rpcBusy++;
        console.warn("[confirm-submitted] rpc fail", it.id, e?.shortMessage ?? e?.message ?? e);
      }
    }

    return NextResponse.json(
      {
        ok: true,
        batchId,
        checked,
        updated,
        notMined,
        minedPaid,
        minedFailed,
        skippedClaim,
        rpcBusy,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Confirm submitted failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
