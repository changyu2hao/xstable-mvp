// app/api/me/payroll/[id]/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

// ✅ Next 15: params 有时是 Promise，所以用这个最稳
type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id } = await Promise.resolve(ctx.params);

    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: "Invalid payslip id" }, { status: 400 });
    }

    const supabase = await supabaseServer();

    // 1) must be logged in
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) user -> employee
    const { data: employee, error: eErr } = await supabase
      .from("employees")
      .select("id, name, email, wallet_address")
      .eq("user_id", u.user.id)
      .maybeSingle();

    if (eErr) {
      return NextResponse.json({ error: eErr.message }, { status: 500 });
    }
    if (!employee) {
      return NextResponse.json({ error: "Employee profile not linked." }, { status: 403 });
    }

    // 3) load ONE payroll item, and lock to this employee
    const { data: item, error: iErr } = await supabase
      .from("payroll_items")
      .select("id, employee_id, amount_usdc, status, created_at, paid_at, tx_hash, batch_id")
      .eq("id", id)
      .eq("employee_id", employee.id) // 🔒 关键：只能读自己的
      .maybeSingle();

    if (iErr) {
      return NextResponse.json({ error: iErr.message }, { status: 500 });
    }
    if (!item) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    }

    return NextResponse.json({ employee, item }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load payslip", detail: msg }, { status: 500 });
  }
}
