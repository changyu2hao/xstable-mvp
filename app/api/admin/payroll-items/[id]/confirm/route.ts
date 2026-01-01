// app/api/admin/payroll-items/[id]/confirm/route.ts
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await Promise.resolve(ctx.params);
    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: "Invalid payroll item id" }, { status: 400 });
    }

    const supabase = await supabaseServer();

    // 1) must be logged in
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2) load payroll item
    const { data: item, error: itemErr } = await supabase
      .from("payroll_items")
      .select("id, batch_id, status, tx_hash")
      .eq("id", id)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Payroll item not found" }, { status: 404 });
    }

    // ✅ 已 paid：幂等
    if (item.status === "paid") {
      return NextResponse.json(
        { ok: true, status: "paid", alreadyPaid: true, itemId: id, txHash: item.tx_hash },
        { status: 200 }
      );
    }

    // ✅ failed：不要再 confirm / 不要改状态（你也可以允许“重试”但那是另一个 API）
    if (item.status === "failed") {
      return NextResponse.json(
        { ok: true, status: "failed", itemId: id, txHash: item.tx_hash },
        { status: 200 }
      );
    }

    // ✅ 关键：只允许确认 submitted
    // - 如果你之后加了 created/draft，这里也会挡住
    if (item.status !== "submitted") {
      return NextResponse.json(
        { ok: true, notConfirmable: true, status: item.status, itemId: id, txHash: item.tx_hash ?? null },
        { status: 200 }
      );
    }

    // ✅ submitted 但没有 tx_hash：这属于数据异常（按你的新流程应该不会发生）
    if (!item.tx_hash) {
      return NextResponse.json(
        { ok: true, status: "submitted", missingTx: true, itemId: id },
        { status: 200 }
      );
    }

    // ownership check（你原来的逻辑保留）
    const { data: batch, error: bErr } = await supabase
      .from("payroll_batches")
      .select("id, company_id")
      .eq("id", item.batch_id)
      .single();
    if (bErr || !batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    const { data: company, error: cErr } = await supabase
      .from("companies")
      .select("id")
      .eq("id", batch.company_id)
      .eq("owner_user_id", u.user.id)
      .maybeSingle();
    if (cErr || !company) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 3) check chain receipt
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
    if (!rpcUrl) return NextResponse.json({ error: "Missing BASE_SEPOLIA_RPC_URL" }, { status: 500 });

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const receipt = await provider.getTransactionReceipt(item.tx_hash);

    // not mined yet -> 仍是 submitted
    if (!receipt) {
      return NextResponse.json(
        { ok: true, status: "submitted", mined: false, itemId: id, txHash: item.tx_hash },
        { status: 200 }
      );
    }

    // mined but reverted -> failed
    if (receipt.status === 0) {
      await supabase.from("payroll_items").update({ status: "failed" }).eq("id", id);
      return NextResponse.json(
        { ok: true, status: "failed", mined: true, itemId: id, txHash: item.tx_hash, blockNumber: receipt.blockNumber },
        { status: 200 }
      );
    }

    // mined success -> paid
    const paidAt = new Date().toISOString();
    await supabase.from("payroll_items").update({ status: "paid", paid_at: paidAt }).eq("id", id);

    return NextResponse.json(
      { ok: true, status: "paid", mined: true, itemId: id, txHash: item.tx_hash, paidAt, blockNumber: receipt.blockNumber },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: "Confirm failed", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
