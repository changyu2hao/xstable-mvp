// import { NextResponse } from "next/server";
// import { createSupabaseRouteClient } from "@/lib/supabase/serverRoute";
// import crypto from "crypto";

// function isUuid(v: string) {
//   return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
//     v
//   );
// }

// export async function POST(
//   req: Request,
//   ctx: { params: Promise<{ id: string }> } // ✅ params 是 Promise
// ) {
//   try {
//     const { id } = await ctx.params; // ✅ 必须 await

//     if (!id || !isUuid(id)) {
//       return NextResponse.json(
//         { error: "Invalid payroll item id" },
//         { status: 400 }
//       );
//     }

//     const supabase = await createSupabaseRouteClient();

//     // 1) must be logged in
//     const { data: u, error: uErr } = await supabase.auth.getUser();
//     if (uErr || !u?.user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // 2) load item -> batch -> company and verify owner
//     const { data: item, error: itemErr } = await supabase
//       .from("payroll_items")
//       .select("id, status, employee_id, batch_id")
//       .eq("id", id)
//       .single();

//     if (itemErr || !item) {
//       return NextResponse.json(
//         { error: "Payroll item not found" },
//         { status: 404 }
//       );
//     }

//     const { data: batch, error: bErr } = await supabase
//       .from("payroll_batches")
//       .select("id, company_id")
//       .eq("id", item.batch_id)
//       .single();

//     if (bErr || !batch) {
//       return NextResponse.json({ error: "Batch not found" }, { status: 404 });
//     }

//     const { data: company, error: cErr } = await supabase
//       .from("companies")
//       .select("id")
//       .eq("id", batch.company_id)
//       .eq("owner_user_id", u.user.id)
//       .maybeSingle();

//     if (cErr || !company) {
//       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//     }

//     // optional: avoid double-pay
//     if (item.status === "paid") {
//       return NextResponse.json(
//         { error: "Already paid" },
//         { status: 409 }
//       );
//     }

//     // 3) update (must write paid_at when status=paid)
//     const nowIso = new Date().toISOString();
//     const txHash = "0xFAKE_TX_" + crypto.randomUUID().replace(/-/g, "");

//     const { data: updated, error: updErr } = await supabase
//       .from("payroll_items")
//       .update({
//         status: "paid",
//         paid_at: nowIso, // ✅ satisfies DB constraint
//         tx_hash: txHash,
//       })
//       .eq("id", id)
//       .select("id, status, paid_at, tx_hash")
//       .single();

//     if (updErr || !updated) {
//       return NextResponse.json(
//         { error: updErr?.message ?? "Update failed" },
//         { status: 500 }
//       );
//     }

//     return NextResponse.json({ item: updated }, { status: 200 });
//   } catch (e: any) {
//     return NextResponse.json(
//       { error: "Failed to mark paid", detail: String(e?.message ?? e) },
//       { status: 500 }
//     );
//   }
// }
