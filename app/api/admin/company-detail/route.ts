// app/api/admin/company-detail/route.ts
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/serverRoute";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId") ?? "";

    if (!companyId || !isUuid(companyId)) {
      return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
    }

    const supabase = await createSupabaseRouteClient();

    // 1) must be logged in
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) verify owner owns this company
    const { data: company, error: cErr } = await supabase
      .from("companies")
      .select("id, name, owner_email, owner_user_id, created_at")
      .eq("id", companyId)
      .eq("owner_user_id", u.user.id)
      .maybeSingle();

    if (cErr) {
      return NextResponse.json({ error: cErr.message }, { status: 500 });
    }
    if (!company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3) employees
    const { data: employees, error: eErr } = await supabase
      .from("employees")
      .select("id, company_id, name, email, wallet_address, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (eErr) {
      return NextResponse.json({ error: eErr.message }, { status: 500 });
    }

    // 4) batches
    const { data: batches, error: bErr } = await supabase
      .from("payroll_batches")
      .select("id, company_id, title, pay_date, status, note, created_at")
      .eq("company_id", companyId)
      .order("pay_date", { ascending: false });

    if (bErr) {
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }

    // 5) batchStats (聚合 payroll_items)
    const batchIds = (batches ?? []).map((b) => b.id);
    const batchStats: Record<string, { itemCount: number; totalAmount: number }> = {};

    if (batchIds.length > 0) {
      const { data: items, error: iErr } = await supabase
        .from("payroll_items")
        .select("batch_id, amount_usdc")
        .in("batch_id", batchIds);

      if (iErr) {
        return NextResponse.json({ error: iErr.message }, { status: 500 });
      }

      for (const it of items ?? []) {
        const bId = it.batch_id as string;
        const amount = Number(it.amount_usdc ?? 0);
        if (!batchStats[bId]) batchStats[bId] = { itemCount: 0, totalAmount: 0 };
        batchStats[bId].itemCount += 1;
        batchStats[bId].totalAmount += amount;
      }
    }

    return NextResponse.json(
      {
        company,
        employees: employees ?? [],
        batches: batches ?? [],
        batchStats,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to load company detail", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
