// app/api/admin/payroll-items/[id]/pay/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ethers } from "ethers";
import crypto from "crypto";

export const runtime = "nodejs";

const USDC_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
];

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

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

// ------------ RPC jitter helpers (same pattern as confirm) ------------
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

// timeout wrapper
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// retry wrapper (ONLY use for READ calls; never use for transfer)
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
  const supabase = await supabaseServer();

  // claim token tracked outside try blocks so outer catch can release it
  let claimToken: string | null = null;
  let idForRelease: string | null = null;

  async function releaseClaimIfOwned() {
    if (!claimToken || !idForRelease) return;
    await supabase
      .from("payroll_items")
      .update({ tx_hash: null })
      .eq("id", idForRelease)
      .eq("tx_hash", claimToken);
  }

  try {
    const { id } = await Promise.resolve(ctx.params);
    idForRelease = id;

    // 客户端错误 -> 4xx
    if (!id || !isUuid(id)) {
      return NextResponse.json({ ok: false, error: "Invalid payroll item id" }, { status: 400 });
    }

    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
    const pk = process.env.PAYROLL_SENDER_PRIVATE_KEY;
    const usdcAddress = process.env.BASE_SEPOLIA_USDC_ADDRESS;

    if (!rpcUrl || !pk || !usdcAddress) {
      // 服务缺配置：也返回 200，让前端温柔失败
      return NextResponse.json(
        { ok: false, retryable: true, reason: "MISSING_ENV", detail: "Missing env variables", itemId: id },
        { status: 200 }
      );
    }

    // 1) must be logged in
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2) load item
    const { data: item, error: itemErr } = await supabase
      .from("payroll_items")
      .select("id, batch_id, employee_id, amount_usdc, status, tx_hash")
      .eq("id", id)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ ok: false, error: "Payroll item not found" }, { status: 404 });
    }

    // idempotent exits
    if (item.status === "paid") {
      return NextResponse.json({ ok: true, status: "paid", txHash: item.tx_hash, itemId: id }, { status: 200 });
    }
    if (item.status === "submitted" && item.tx_hash) {
      return NextResponse.json({ ok: true, status: "submitted", txHash: item.tx_hash, itemId: id }, { status: 200 });
    }

    if (item.status !== "created") {
      // 业务错误：也用 200，避免前端红字
      return NextResponse.json(
        { ok: false, retryable: false, reason: "NOT_PAYABLE", status: item.status, txHash: item.tx_hash ?? null, itemId: id },
        { status: 200 }
      );
    }

    // 3) ownership check
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

    // 4) claim (concurrency safe)
    claimToken = `CLAIM:${crypto.randomUUID()}`;

    const { data: claimed, error: claimErr } = await supabase
      .from("payroll_items")
      .update({ tx_hash: claimToken })
      .eq("id", id)
      .eq("status", "created")
      .is("tx_hash", null)
      .select("id, employee_id, amount_usdc, tx_hash, status")
      .maybeSingle();

    if (claimErr) {
      claimToken = null;
      return NextResponse.json(
        { ok: false, retryable: true, reason: "CLAIM_FAILED", detail: claimErr.message, itemId: id },
        { status: 200 }
      );
    }

    if (!claimed) {
      claimToken = null;
      const { data: fresh } = await supabase
        .from("payroll_items")
        .select("id,status,tx_hash")
        .eq("id", id)
        .single();

      return NextResponse.json(
        { ok: true, idempotent: true, status: fresh?.status, txHash: fresh?.tx_hash ?? null, itemId: id },
        { status: 200 }
      );
    }

    // 5) load employee wallet
    const { data: emp, error: empErr } = await supabase
      .from("employees")
      .select("wallet_address")
      .eq("id", item.employee_id)
      .single();

    if (empErr || !emp?.wallet_address) {
      await releaseClaimIfOwned();
      claimToken = null;
      return NextResponse.json({ ok: false, retryable: false, reason: "NO_WALLET", detail: "Employee wallet not found", itemId: id }, { status: 200 });
    }

    const to = emp.wallet_address.trim();
    if (!ethers.isAddress(to)) {
      await releaseClaimIfOwned();
      claimToken = null;
      return NextResponse.json({ ok: false, retryable: false, reason: "BAD_WALLET", detail: "Invalid wallet address", to, itemId: id }, { status: 200 });
    }

    // 6) init provider with static network (reduces detect network flakiness)
    const provider = new ethers.JsonRpcProvider(rpcUrl, { chainId: 84532, name: "base-sepolia" });

    // ✅ READ calls: retry + timeout
    const wallet = new ethers.Wallet(pk, provider);
    const sender = await wallet.getAddress();
    const usdc = new ethers.Contract(usdcAddress, USDC_ABI, wallet);

    const decimals = Number(
      await withRetry(() => withTimeout(usdc.decimals(), 8000, "decimals"), 2)
    );

    const amountHuman = String(item.amount_usdc);
    const amountOnchain = ethers.parseUnits(amountHuman, decimals);

    const balance = await withRetry(
      () => withTimeout(usdc.balanceOf(sender), 8000, "balanceOf"),
      2
    );

    if (balance < amountOnchain) {
      await releaseClaimIfOwned();
      claimToken = null;
      return NextResponse.json(
        {
          ok: false,
          retryable: false,
          reason: "INSUFFICIENT_BALANCE",
          sender,
          balance: ethers.formatUnits(balance, decimals),
          required: amountHuman,
          itemId: id,
        },
        { status: 200 }
      );
    }

    // ✅ SEND call: DO NOT RETRY transfer (avoid double pay)
    try {
      const tx = await withTimeout(usdc.transfer(to, amountOnchain), 15000, "transfer");

      // persist real tx hash + submitted (only if we still own the claim)
      const { error: updErr } = await supabase
        .from("payroll_items")
        .update({
          tx_hash: tx.hash,
          status: "submitted",
          paid_at: null,
        })
        .eq("id", id)
        .eq("tx_hash", claimToken);

      if (updErr) {
        // db update failed: release claim so UI doesn't show CLAIM forever
        await releaseClaimIfOwned();
        claimToken = null;

        return NextResponse.json(
          { ok: false, retryable: true, reason: "DB_PERSIST_FAILED", txHash: tx.hash, detail: updErr.message, itemId: id },
          { status: 200 }
        );
      }

      claimToken = null;
      return NextResponse.json(
        { ok: true, status: "submitted", txHash: tx.hash, sender, to, amount: amountHuman, itemId: id },
        { status: 200 }
      );
    } catch (e: any) {
      const detail = String(e?.shortMessage ?? e?.message ?? e);
      const retryable = isRetryableRpcError(e);

      // ⚠️ timeout 类错误可能“不确定是否发出交易”
      // - 如果是明显 RPC busy（failed to fetch / 429 / 502...）：安全释放 claim 允许重试
      // - 如果是 timeout：保守起见不释放 claim，避免下一次点 Pay double-pay
      const isTimeout = detail.toLowerCase().includes("timeout");

      if (retryable && !isTimeout) {
        await releaseClaimIfOwned();
        claimToken = null;
        return NextResponse.json(
          { ok: false, retryable: true, reason: "RPC_BUSY", detail, itemId: id },
          { status: 200 }
        );
      }

      // timeout / unknown state: keep CLAIM (safer)
      return NextResponse.json(
        { ok: false, retryable: true, reason: isTimeout ? "RPC_TIMEOUT_UNCERTAIN" : "RPC_ERROR", detail, itemId: id },
        { status: 200 }
      );
    }
  } catch (e: any) {
    // ✅ if anything unexpected happens after claim, try release claim (best effort)
    try { await releaseClaimIfOwned(); } catch {}
    return NextResponse.json(
      { ok: false, retryable: true, reason: "PAY_FAILED", detail: String(e?.message ?? e), itemId: idForRelease },
      { status: 200 }
    );
  }
}
