import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/serverRoute";

function isUuid(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
function clean(s: unknown) {
    return typeof s === "string" ? s.trim() : "";
}

export async function GET(req: Request) {
    try {
        const supabase = await createSupabaseRouteClient();

        // 1) must be logged in
        const { data: u, error: uErr } = await supabase.auth.getUser();
        if (uErr || !u?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2) query param
        const url = new URL(req.url);
        const companyId = clean(url.searchParams.get("companyId"));

        if (!companyId || !isUuid(companyId)) {
            return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
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

        // 4) fetch employees
        const { data: employees, error: eErr } = await supabase
            .from("employees")
            .select("id, name, email, wallet_address, created_at,invite_token,invite_expires_at,user_id")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

        if (eErr) {
            return NextResponse.json({ error: eErr.message }, { status: 500 });
        }

        return NextResponse.json({ employees: employees ?? [] }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json(
            { error: "Failed to load employees", detail: String(e?.message ?? e) },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseRouteClient();

        // 1) must be logged in
        const { data: u, error: uErr } = await supabase.auth.getUser();
        if (uErr || !u?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2) body
        const body = await req.json().catch(() => null);
        const companyId = clean(body?.companyId);
        const name = clean(body?.name);
        const email = clean(body?.email);
        const walletAddress = clean(body?.walletAddress);

        if (!companyId || !isUuid(companyId)) {
            return NextResponse.json({ error: "Invalid companyId" }, { status: 400 });
        }
        if (!name) {
            return NextResponse.json({ error: "Employee name is required" }, { status: 400 });
        }
        if (!walletAddress) {
            return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
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

        // 4) create employee + invite token
        const inviteToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        const { data: emp, error: eErr } = await supabase
            .from("employees")
            .insert({
                company_id: companyId,
                name,
                email: email || null,
                wallet_address: walletAddress,
                invite_token: inviteToken,
                invite_expires_at: expiresAt,
                user_id: null,
            })
            .select("id, company_id, name, email, wallet_address, invite_token, invite_expires_at, created_at")
            .single();

        if (eErr || !emp) {
            return NextResponse.json({ error: eErr?.message ?? "Insert failed" }, { status: 400 });
        }

        return NextResponse.json({ employee: emp }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json(
            { error: "Failed to create employee", detail: String(e?.message ?? e) },
            { status: 500 }
        );
    }
}
