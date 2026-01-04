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

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await Promise.resolve(ctx.params);

  // ✅ 真正的“客户端错误”才 4xx
  if (!id || !isUuid(id)) {
    return NextResponse.json({ ok: false, error: "Invalid payroll item id" }, { status: 400 });
  }

  const supabase = await supabaseServer();

  // 1) must be logged in
  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr || !u?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // 2) load payroll item
  const { data: item, error: itemErr } = await supabase
    .from("payroll_items")
    .select("id, batch_id, status, tx_hash")
    .eq("id", id)
    .single();

  if (itemErr || !item) {
    return NextResponse.json({ ok: false, error: "Payroll item not found" }, { status: 404 });
  }

  // ✅ 幂等：paid / failed / notConfirmable 都是 200
  if (item.status === "paid") {
    return NextResponse.json(
      { ok: true, status: "paid", alreadyPaid: true, itemId: id, txHash: item.tx_hash },
      { status: 200 }
    );
  }

  if (item.status === "failed") {
    return NextResponse.json(
      { ok: true, status: "failed", itemId: id, txHash: item.tx_hash },
      { status: 200 }
    );
  }

  if (item.status !== "submitted") {
    return NextResponse.json(
      { ok: true, notConfirmable: true, status: item.status, itemId: id, txHash: item.tx_hash ?? null },
      { status: 200 }
    );
  }

  if (!item.tx_hash) {
    return NextResponse.json(
      { ok: true, status: "submitted", missingTx: true, itemId: id },
      { status: 200 }
    );
  }

  // ownership check
  const { data: batch, error: bErr } = await supabase
    .from("payroll_batches")
    .select("id, company_id")
    .eq("id", item.batch_id)
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

  // 3) check chain receipt
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
  if (!rpcUrl) {
    // ✅ 这里也返回 200（服务暂不可用），让前端不炸
    return NextResponse.json(
      { ok: false, retryable: true, status: "submitted", reason: "Missing BASE_SEPOLIA_RPC_URL", itemId: id },
      { status: 200 }
    );
  }

  const provider = new ethers.JsonRpcProvider(
    rpcUrl,
    { chainId: 84532, name: "base-sepolia" }
  );

  try {
    const receipt = await withRetry(
      () => withTimeout(provider.getTransactionReceipt(item.tx_hash!), 8000, "getTransactionReceipt"),
      2
    );

    if (!receipt) {
      return NextResponse.json(
        { ok: true, status: "submitted", mined: false, itemId: id, txHash: item.tx_hash },
        { status: 200 }
      );
    }

    if (receipt.status === 0) {
      await supabase.from("payroll_items").update({ status: "failed" }).eq("id", id);
      return NextResponse.json(
        { ok: true, status: "failed", mined: true, itemId: id, txHash: item.tx_hash, blockNumber: receipt.blockNumber },
        { status: 200 }
      );
    }

    const paidAt = new Date().toISOString();
    await supabase.from("payroll_items").update({ status: "paid", paid_at: paidAt }).eq("id", id);

    return NextResponse.json(
      { ok: true, status: "paid", mined: true, itemId: id, txHash: item.tx_hash, paidAt, blockNumber: receipt.blockNumber },
      { status: 200 }
    );
  } catch (e: any) {
    // ✅ 核心：RPC 失败也 200，让前端“温柔失败”
    const detail = String(e?.shortMessage ?? e?.message ?? e);
    const retryable = isRetryableRpcError(e);

    return NextResponse.json(
      {
        ok: false,
        retryable,
        status: "submitted",
        itemId: id,
        txHash: item.tx_hash,
        reason: retryable ? "RPC_BUSY" : "RPC_ERROR",
        detail,
      },
      { status: 200 }
    );
  }
}
