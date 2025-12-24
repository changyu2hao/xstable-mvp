// app/api/admin/payroll-batches/route.ts
import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/serverRoute";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}
function clean(s: unknown) {
  return typeof s === "string" ? s.trim() : "";
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseRouteClient();

    // 1) must be logged in
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) parse body
    const body = await req.json().catch(() => null);
    const companyId = clean(body?.companyId);
    const title = clean(body?.title);
    const payDate = clean(body?.payDate); // yyyy-mm-dd
    const note = clean(body?.note);

    if (!companyId || !isUuid(companyId)) {
      return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!payDate) {
      return NextResponse.json({ error: "Pay date is required" }, { status: 400 });
    }

    // 3) verify owner owns company
    const { data: company, error: cErr } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("owner_user_id", u.user.id)
      .maybeSingle();

    if (cErr || !company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4) insert batch (status uses default 'draft' if you set default in DB)
    const { data: batch, error: bErr } = await supabase
      .from("payroll_batches")
      .insert({
        company_id: companyId,
        title,
        pay_date: payDate,
        note: note || null,
        status: "draft", // 如果 DB 没有 default，就打开这行
      })
      .select("id, company_id, title, pay_date, note, status, created_at")
      .single();

    if (bErr || !batch) {
      return NextResponse.json({ error: bErr?.message ?? "Insert failed" }, { status: 400 });
    }

    return NextResponse.json({ batch }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to create payroll batch", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
