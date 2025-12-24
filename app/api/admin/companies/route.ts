import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseRouteClient } from "@/lib/supabase/serverRoute";

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
        setAll() {
          // route handler: usually no need
        },
      },
    }
  );
}

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
    const name = String(body?.name ?? "").trim();
    const ownerEmailRaw = body?.ownerEmail;
    const ownerEmail =
      ownerEmailRaw == null ? null : String(ownerEmailRaw).trim() || null;

    if (!name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    // 3) server decides owner_user_id (never trust client)
    const { data: inserted, error: insErr } = await supabase
      .from("companies")
      .insert({
        name,
        owner_email: ownerEmail ?? u.user.email ?? null,
        owner_user_id: u.user.id,
      })
      .select("id, name, owner_email, owner_user_id, created_at")
      .single();

    if (insErr || !inserted) {
      // optional: map common postgres codes
      if ((insErr as any)?.code === "23505") {
        return NextResponse.json({ error: "A company with this name already exists." }, { status: 409 });
      }
      return NextResponse.json(
        { error: insErr?.message ?? "Insert failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ company: inserted }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to create company", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient();

    const { data: u, error: uErr } = await supabase.auth.getUser();
    if (uErr || !u?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 只返回当前 owner 的公司（更干净）
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id,name,owner_email,created_at,owner_user_id")
      .eq("owner_user_id", u.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ companies: companies ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to load companies", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

