"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";


type Employee = {
    id: string;
    name: string | null;
    email: string | null;
    wallet_address: string | null;
};

type PayrollItem = {
    id: string;
    employee_id: string;
    amount_usdc: string; // ⚠️ Supabase numeric → string
    status: "pending" | "paid" | "failed";
    created_at: string;
    paid_at: string | null;
    tx_hash: string | null;
};

function StatusBadge({ status }: { status: "pending" | "paid" | "failed" }) {
    const map = {
        pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
        paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        failed: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    };

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[status]}`}
        >
            {status.toUpperCase()}
        </span>
    );
}

export default function MePayrollClient() {
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [items, setItems] = useState<PayrollItem[]>([]);
    const router = useRouter();


    const displayName = useMemo(() => {
        return employee?.name || employee?.email || "Employee";
    }, [employee]);

    useEffect(() => {
        async function run() {
            setLoading(true);
            setErrorMsg(null);
            try {
                const res = await fetch("/api/me/payroll", {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                });

                const text = await res.text();
                const json = text ? JSON.parse(text) : null;

                // 未登录：跳 login
                if (res.status === 401) {
                    router.replace(`/login?next=/me/payroll`);
                    return;
                }

                if (!res.ok) {
                    throw new Error(json?.error ?? `Failed (${res.status})`);
                }

                setEmployee(json.employee ?? null);
                setItems(json.items ?? []);
            } catch (e: any) {
                console.error(e);
                setErrorMsg(e?.message ?? "Failed to load payroll");
            } finally {
                setLoading(false);
            }
        }

        run();
    }, [router]);


    return (
        <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
            <div className="mx-auto w-full max-w-3xl space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-2xl font-semibold">My Payroll</h1>
                            <p className="mt-1 text-sm text-slate-300">
                                Signed in as: <span className="text-slate-100">{displayName}</span>
                            </p>
                            {employee?.wallet_address ? (
                                <p className="mt-1 text-xs text-slate-400 break-all">
                                    Wallet: {employee.wallet_address}
                                </p>
                            ) : null}
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                            <Link
                                href="/company"
                                className="inline-flex items-center rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
                            >
                                Go to company dashboard
                            </Link>

                            <LogoutButton />
                        </div>
                    </div>
                </div>
                {loading ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-300">
                        Loading…
                    </div>
                ) : errorMsg ? (
                    <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-5 text-rose-200">
                        {errorMsg}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                        <div className="border-b border-slate-800 px-5 py-3 text-sm text-slate-300">
                            {items.length} item(s)
                        </div>

                        {items.length === 0 ? (
                            <div className="px-5 py-6 text-sm text-slate-300">
                                No payroll items yet.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {items.map((it) => (
                                    <div key={it.id} className="px-5 py-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/me/payroll/${it.id}`}
                                                    className="text-sm text-slate-200 hover:underline"
                                                >
                                                    Payroll payment
                                                </Link>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    Created at {it.created_at ? new Date(it.created_at).toLocaleString() : "—"}
                                                    {" · "}
                                                    <StatusBadge status={it.status} />
                                                </p>
                                                {it.tx_hash ? (
                                                    <div className="mt-1 flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                await navigator.clipboard.writeText(it.tx_hash!);
                                                                setCopiedTxId(it.id);
                                                                setTimeout(() => setCopiedTxId(null), 1200);
                                                            }}
                                                            className="block text-xs text-slate-400 hover:text-slate-200"
                                                            title="Click to copy transaction hash"
                                                        >
                                                            {copiedTxId === it.id ? (
                                                                <span className="text-emerald-400">Copied!</span>
                                                            ) : (
                                                                <>Tx: {it.tx_hash.slice(0, 8)}…{it.tx_hash.slice(-6)}</>
                                                            )}
                                                        </button>

                                                        <a
                                                            href={`https://sepolia.basescan.org/tx/${it.tx_hash}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs text-indigo-300 hover:underline"
                                                        >
                                                            BaseScan ↗
                                                        </a>

                                                        {it.status === "pending" ? (
                                                            <span className="text-xs text-slate-400">Confirming…</span>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-sm font-semibold">
                                                    {it.amount_usdc != null ? Number(it.amount_usdc).toFixed(2) : "—"}
                                                </p>

                                                {it.paid_at ? (
                                                    <p className="mt-1 text-xs text-slate-400">
                                                        Paid at {new Date(it.paid_at).toLocaleString()}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
