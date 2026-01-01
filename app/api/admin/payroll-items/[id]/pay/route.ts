import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";

const USDC_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
];

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: Ctx) {
  const { id: payrollItemId } = await context.params;

  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
  const pk = process.env.PAYROLL_SENDER_PRIVATE_KEY;
  const usdcAddress = process.env.BASE_SEPOLIA_USDC_ADDRESS;

  if (!rpcUrl || !pk || !usdcAddress) {
    return NextResponse.json(
      { error: "Missing env variables" },
      { status: 500 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /* -------------------------------------------------
     1) Load payroll item
  ------------------------------------------------- */
  const { data: item, error: itemErr } = await supabase
    .from("payroll_items")
    .select("id, amount_usdc, status, employee_id, tx_hash")
    .eq("id", payrollItemId)
    .single();

  if (itemErr || !item) {
    return NextResponse.json(
      { error: "Payroll item not found" },
      { status: 404 }
    );
  }

  /* -------------------------------------------------
     2) Idempotency guard (NO double pay)
  ------------------------------------------------- */
  // 1) already paid
  if (item.status === "paid") {
    return NextResponse.json(
      { ok: true, message: "Already paid", txHash: item.tx_hash },
      { status: 200 }
    );
  }

  // 2) already submitted (best guard)
  if (item.tx_hash) {
    return NextResponse.json(
      { ok: true, message: "Already submitted", txHash: item.tx_hash, status: item.status },
      { status: 200 }
    );
  }

  // Optional: only allow pay when status is "pending" (meaning created/draft) OR "failed"
  if (!["pending", "failed"].includes(item.status)) {
    return NextResponse.json(
      { error: "Item not payable in current status", status: item.status },
      { status: 400 }
    );
  }


  /* -------------------------------------------------
     3) Load employee wallet
  ------------------------------------------------- */
  const { data: emp, error: empErr } = await supabase
    .from("employees")
    .select("wallet_address")
    .eq("id", item.employee_id)
    .single();

  if (empErr || !emp?.wallet_address) {
    return NextResponse.json(
      { error: "Employee wallet not found" },
      { status: 404 }
    );
  }

  const to = emp.wallet_address.trim();

  if (!ethers.isAddress(to)) {
    return NextResponse.json({ error: "Invalid wallet address", to }, { status: 400 });
  }

  /* -------------------------------------------------
     4) Prepare ethers
  ------------------------------------------------- */
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const sender = await wallet.getAddress();
  const usdc = new ethers.Contract(usdcAddress, USDC_ABI, wallet);

  const decimals = Number(await usdc.decimals());
  const amountHuman = String(item.amount_usdc);
  const amountOnchain = ethers.parseUnits(amountHuman, decimals);

  /* -------------------------------------------------
     5) Balance check
  ------------------------------------------------- */
  const balance = await usdc.balanceOf(sender);
  if (balance < amountOnchain) {
    return NextResponse.json(
      {
        error: "Insufficient USDC balance",
        sender,
        balance: ethers.formatUnits(balance, decimals),
        required: amountHuman,
      },
      { status: 400 }
    );
  }

  /* -------------------------------------------------
     6) Send tx → mark submitted
  ------------------------------------------------- */
  try {
    const tx = await usdc.transfer(to, amountOnchain);

    // ✅ 只保存 tx_hash + 改成 submitted
    await supabase
      .from("payroll_items")
      .update({
        tx_hash: tx.hash,
        status: "submitted",   // ✅ 关键：submitted 才能被 confirm
        paid_at: null,
      })
      .eq("id", payrollItemId);

    // ✅ 立刻返回（不等确认）
    return NextResponse.json({
      ok: true,
      message: "Submitted",
      txHash: tx.hash,
      sender,
      to,
      amount: amountHuman,
      status: "submitted",
    });
  } catch (e: any) {
    await supabase
      .from("payroll_items")
      .update({ status: "failed" })
      .eq("id", payrollItemId);

    return NextResponse.json(
      {
        error: "Transfer failed",
        message: String(e?.shortMessage ?? e?.message ?? e),
      },
      { status: 500 }
    );
  }
}
