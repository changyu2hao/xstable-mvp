// app/api/cron/confirm-submitted/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // ✅ 1) Auth guard (Cron secret)
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ 2) Env check
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;

    if (!supabaseUrl || !serviceKey || !rpcUrl) {
      return NextResponse.json(
        { error: "Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / BASE_SEPOLIA_RPC_URL" },
        { status: 500 }
      );
    }

    // ✅ 3) Supabase admin client
    const supabase = createClient(supabaseUrl, serviceKey);

    // ✅ 4) Fetch all submitted items with tx_hash
    const { data: items, error } = await supabase
      .from("payroll_items")
      .select("id, tx_hash, status, created_at")
      .eq("status", "submitted")
      .not("tx_hash", "is", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ ok: true, scanned: 0, paid: 0, failed: 0, stillSubmitted: 0 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    let paid = 0;
    let failed = 0;
    let stillSubmitted = 0;

    // ✅ 5) Loop and confirm
    for (const it of items) {
      const txHash = it.tx_hash!;
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        stillSubmitted++;
        continue;
      }

      if (receipt.status === 0) {
        await supabase.from("payroll_items").update({ status: "failed" }).eq("id", it.id);
        failed++;
        continue;
      }

      // receipt.status === 1
      await supabase
        .from("payroll_items")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", it.id);

      paid++;
    }

    return NextResponse.json({
      ok: true,
      scanned: items.length,
      paid,
      failed,
      stillSubmitted,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Cron confirm failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
