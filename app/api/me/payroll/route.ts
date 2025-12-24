import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function GET() {
  try {
    const supabase = await supabaseServer();

    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: employee, error: eErr } = await supabase
      .from("employees")
      .select("id, name, email, wallet_address")
      .eq("user_id", u.user.id)
      .maybeSingle();

    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });
    if (!employee) {
      return NextResponse.json({ error: "Employee profile not linked." }, { status: 403 });
    }

    const { data: items, error: iErr } = await supabase
      .from("payroll_items")
      .select("id, employee_id, amount_usdc, status, created_at, paid_at, tx_hash")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false });

    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

    return NextResponse.json(
      { employee, items: items ?? [] },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to load my payroll", detail: msg }, { status: 500 });
  }
}
