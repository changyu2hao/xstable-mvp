"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
const supabase = createSupabaseBrowserClient();
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useParams } from "next/navigation";


type Employee = {
    id: string;
    name: string | null;
    email: string | null;
    wallet_address: string | null;
};

type PayrollItem = {
    id: string;
    employee_id: string;
    amount_usdc: string;
    status: "pending" | "paid" | "failed";
    created_at: string;
    paid_at: string | null;
    tx_hash: string | null;
    batch_id: string;
};

export default function MePayrollDetailClient() {
    const params = useParams<{ id?: string | string[] }>();
    const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;
    const isUuid =
        typeof id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [item, setItem] = useState<PayrollItem | null>(null);

    const displayName = useMemo(() => employee?.name || employee?.email || "Employee", [employee]);

    useEffect(() => {
        if (!isUuid) {
            setLoading(false);
            setErrorMsg("Invalid payslip link.");
            return;
        }
        async function run() {
            setLoading(true);
            setErrorMsg(null);

            // must be logged in
            const { data: authData, error: authErr } = await supabase.auth.getUser();
            if (authErr || !authData.user) {
                router.replace(`/login?next=/me/payroll`);
                return;
            }

            // find my employee and payroll items record
            const [empRes, itemRes] = await Promise.all([
                supabase
                    .from("employees")
                    .select("id, name, email, wallet_address")
                    .eq("user_id", authData.user.id)
                    .maybeSingle(),

                supabase
                    .from("payroll_items")
                    .select("id, employee_id, amount_usdc, status, created_at, paid_at, tx_hash, batch_id")
                    .eq("id", id)
                    .maybeSingle(),
            ]);
            const emp = empRes.data;
            const it = itemRes.data;

            if (empRes.error) {
                setErrorMsg(empRes.error.message);
                setLoading(false);
                return;
            }
            if (!emp) {
                setErrorMsg("No employee profile linked to this account.");
                setLoading(false);
                return;
            }

            if (itemRes.error) {
                setErrorMsg(itemRes.error.message);
                setLoading(false);
                return;
            }
            if (!it || it.employee_id !== emp.id) {
                setErrorMsg("Payslip not found (or you don't have access).");
                setLoading(false);
                return;
            }
            setEmployee(emp);
            setItem(it);
            setLoading(false);
        }
        run();
    }, [id, router]);

    return (
        <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
            <div className="mx-auto w-full max-w-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <Link href="/me/payroll" className="text-sm text-slate-300 hover:text-slate-100">
                        ← Back
                    </Link>
                    <div className="text-xs text-slate-400">Signed in as {displayName}</div>
                    {isUuid ? (
                        <a
                            href={`/api/me/payroll/${encodeURIComponent(id)}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500"
                        >
                            Download PDF
                        </a>
                    ) : (
                        <span className="text-xs text-rose-300">Invalid payslip id</span>
                    )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <h1 className="text-xl font-semibold">Payslip</h1>
                    <p className="mt-1 text-sm text-slate-300">ID: {id}</p>
                </div>

                {loading ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-300">
                        Loading…
                    </div>
                ) : errorMsg ? (
                    <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-5 text-rose-200">
                        {errorMsg}
                    </div>
                ) : item ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Amount (USDC)</span>
                            <span className="font-semibold">{Number(item.amount_usdc).toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-400">Status</span>
                            <span className="font-medium">{item.status}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-400">Created</span>
                            <span>{new Date(item.created_at).toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-slate-400">Paid at</span>
                            <span>{item.paid_at ? new Date(item.paid_at).toLocaleString() : "—"}</span>
                        </div>

                        <div>
                            <div className="text-slate-400">Tx hash</div>
                            <div className="mt-1 break-all text-slate-200">{item.tx_hash ?? "—"}</div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
