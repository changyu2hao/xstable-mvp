import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

async function supabaseServer() {
    const cookieStore = await cookies(); // ✅ 一定要 await
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll() {
                    // Route Handler 中一般不需要 set
                },
            },
        }
    );
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const batchId = url.searchParams.get("batchId");

        if (!batchId) {
            return NextResponse.json({ error: "Missing batchId" }, { status: 400 });
        }

        const supabase = await supabaseServer();

        // 1) must be logged in
        const { data: u, error: uErr } = await supabase.auth.getUser();
        if (uErr || !u?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2) must be owner of the company for this batch
        // We look up the batch's company_id, then verify companies.owner_user_id = user.id
        const { data: batch, error: bErr } = await supabase
            .from("payroll_batches")
            .select("id, company_id")
            .eq("id", batchId)
            .single();

        if (bErr || !batch) {
            return NextResponse.json({ error: "Batch not found" }, { status: 404 });
        }

        const { data: company, error: cErr } = await supabase
            .from("companies")
            .select("id")
            .eq("id", batch.company_id)
            .eq("owner_user_id", u.user.id)
            .maybeSingle();

        if (cErr || !company) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 3) fetch items in this batch (include employee info)
        const { data: items, error: iErr } = await supabase
            .from("payroll_items")
            .select(
                `
        id,
        batch_id,
        employee_id,
        amount_usdc,
        status,
        tx_hash,
        created_at,
        paid_at,
        employees:employee_id (
          id,
          name,
          email,
          wallet_address
        )
      `
            )
            .eq("batch_id", batchId)
            .order("created_at", { ascending: false });



        if (iErr) {
            return NextResponse.json({ error: iErr.message }, { status: 500 });
        }

        // 4) fetch employees for dropdown (same company)
        const { data: employees, error: eErr } = await supabase
            .from("employees")
            .select("id, name, email, wallet_address")
            .eq("company_id", batch.company_id)
            .order("created_at", { ascending: true });

        if (eErr) {
            return NextResponse.json({ error: eErr.message }, { status: 500 });
        }


        return NextResponse.json(
            {
                items: items ?? [],
                employees: employees ?? [],
            },
            { status: 200 }
        );
    } catch (e: any) {
        return NextResponse.json(
            { error: "Failed to load payroll items", detail: String(e?.message ?? e) },
            { status: 500 }
        );
    }
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

/**
 * POST /api/admin/payroll-items
 * body: { batchId: string, employeeId: string, amountUsdc: number }
 */
export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    // 1) must be logged in
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) parse body
    const body = await req.json().catch(() => null);
    const batchId = body?.batchId;
    const employeeId = body?.employeeId;
    const amountUsdc = body?.amountUsdc;

    if (!batchId || !employeeId || amountUsdc == null) {
      return NextResponse.json(
        { error: "Missing batchId / employeeId / amountUsdc" },
        { status: 400 }
      );
    }

    if (!isUuid(batchId) || !isUuid(employeeId)) {
      return NextResponse.json({ error: "Invalid UUID" }, { status: 400 });
    }

    const amountNumber = Number(amountUsdc);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: "Invalid amountUsdc" }, { status: 400 });
    }

    // 3) batch -> company_id
    const { data: batch, error: bErr } = await supabase
      .from("payroll_batches")
      .select("id, company_id")
      .eq("id", batchId)
      .single();

    if (bErr || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // 4) verify owner of company
    const { data: company, error: cErr } = await supabase
      .from("companies")
      .select("id")
      .eq("id", batch.company_id)
      .eq("owner_user_id", u.user.id)
      .maybeSingle();

    if (cErr || !company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 5) verify employee belongs to same company
    const { data: emp, error: eErr } = await supabase
      .from("employees")
      .select("id, company_id, name, email, wallet_address")
      .eq("id", employeeId)
      .single();

    if (eErr || !emp) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (emp.company_id !== batch.company_id) {
      return NextResponse.json(
        { error: "Employee does not belong to this company" },
        { status: 403 }
      );
    }

    // 6) insert payroll item (pending, paid_at must be null)
    const { data: inserted, error: insErr } = await supabase
      .from("payroll_items")
      .insert({
        batch_id: batchId,
        employee_id: employeeId,
        amount_usdc: amountNumber, // numeric -> ok
        status: "pending",
        paid_at: null,
        tx_hash: null,
      })
      .select(
        `
        id,
        batch_id,
        employee_id,
        amount_usdc,
        status,
        tx_hash,
        created_at,
        paid_at,
        employees:employee_id (
          id,
          name,
          email,
          wallet_address
        )
      `
      )
      .single();

    if (insErr || !inserted) {
      return NextResponse.json(
        { error: insErr?.message ?? "Insert failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ item: inserted }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to create payroll item", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
