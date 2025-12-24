import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

function clean(s: unknown) {
  return typeof s === "string" ? s.trim() : "";
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

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    // must be logged in
    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const token = clean(body?.token);

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // call RPC on server
    const { data, error } = await supabase.rpc("claim_employee", { p_token: token });

    if (error) {
      const msg = error.message || "Claim failed";
      // 409 更适合“已被 claim / token 无效”这种业务冲突
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    return NextResponse.json({ ok: true, employee: data ?? null }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to claim", detail: msg }, { status: 500 });
  }
}
