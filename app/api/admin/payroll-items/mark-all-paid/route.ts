// app/api/admin/payroll-items/mark-all-paid/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import crypto from "crypto";

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
                    // route handler usually doesn't need set
                },
            },
        }
    );
}

function isUuid(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v
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
        const batchId = body?.batchId;

        if (!batchId) {
            return NextResponse.json({ error: "Missing batchId" }, { status: 400 });
        }
        if (!isUuid(batchId)) {
            return NextResponse.json({ error: "Invalid batchId" }, { status: 400 });
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

        // 4) verify owner
        const { data: company, error: cErr } = await supabase
            .from("companies")
            .select("id")
            .eq("id", batch.company_id)
            .eq("owner_user_id", u.user.id)
            .maybeSingle();

        if (cErr || !company) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 5) find pending items in this batch
        const { data: pending, error: pErr } = await supabase
            .from("payroll_items")
            .select("id")
            .eq("batch_id", batchId)
            .eq("status", "pending");

        if (pErr) {
            return NextResponse.json({ error: pErr.message }, { status: 500 });
        }

        const ids = (pending ?? []).map((x) => x.id);
        if (ids.length === 0) {
            return NextResponse.json(
                { updatedCount: 0, alreadyPaid: true },
                { status: 200 }
            );
        }

        // 6) One-shot RPC: update pending -> paid + unique tx_hash
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
            "admin_mark_all_paid",
            { p_batch_id: batchId }
        );

        if (rpcErr) {
            return NextResponse.json(
                { error: "Failed to mark all paid", detail: rpcErr.message },
                { status: 500 }
            );
        }

        const updatedCount = rpcData?.[0]?.updated_count ?? 0;
        const paidAt = rpcData?.[0]?.paid_at ?? null;

        // 7) 关键：重新拉完整 items（保持和 GET 一样的 join 结构）
        const { data: items, error: iErr } = await supabase
            .from("payroll_items")
            .select(`
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
  `)
            .eq("batch_id", batchId)
            .order("created_at", { ascending: false });

        if (iErr) {
            return NextResponse.json(
                { error: "Updated but failed to reload items", detail: iErr.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { updatedCount, paid_at: paidAt, items: items ?? [] },
            { status: 200 }
        );
    } catch (e: any) {
        return NextResponse.json(
            { error: "Failed to mark all paid", detail: String(e?.message ?? e) },
            { status: 500 }
        );
    }
}
