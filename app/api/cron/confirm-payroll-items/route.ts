// app/api/cron/confirm-payroll-items/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

export const runtime = "nodejs";

// 🔐 用于 GitHub Actions 的简单鉴权
function isAuthorized(req: Request) {
  const token = req.headers.get("authorization");
  return token === `Bearer ${process.env.CRON_SECRET}`;
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

export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1) 找所有 submitted + 有 tx_hash 的 item
    const { data: items, error } = await supabase
      .from("payroll_items")
      .select("id, tx_hash")
      .eq("status", "submitted")
      .not("tx_hash", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ ok: true, message: "No submitted items" }, { status: 200 });
    }

    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
    if (!rpcUrl) {
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

    for (const item of items) {
      checked++;

      const tx = String(item.tx_hash ?? "");
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
          // reverted -> failed
          await supabase.from("payroll_items").update({ status: "failed" }).eq("id", item.id);
          minedFailed++;
          updated++;
          continue;
        }

        // success -> paid
        await supabase
          .from("payroll_items")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        minedPaid++;
        updated++;
      } catch (e: any) {
        // RPC 抖动 → 留给下次 cron
        rpcBusy++;
        console.warn("Cron confirm failed for", item.id, e?.shortMessage ?? e?.message ?? e);
        continue;
      }
    }

    return NextResponse.json(
      {
        ok: true,
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
      { error: "Cron confirm failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
