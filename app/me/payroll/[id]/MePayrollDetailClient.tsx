"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

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

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default function MePayrollDetailClient() {
  // ✅ Hook 一定要在组件函数体内
  const params = useParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const idStr = typeof rawId === "string" ? rawId : "";

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [item, setItem] = useState<PayrollItem | null>(null);

  const displayName = useMemo(
    () => employee?.name || employee?.email || "Employee",
    [employee]
  );

  useEffect(() => {
    async function run() {
      if (!idStr || !isUuid(idStr)) {
        setErrorMsg("Invalid payslip link.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(`/api/me/payroll/${encodeURIComponent(idStr)}`, {
        credentials: "include",
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (res.status === 401) {
        router.replace(`/login?next=/me/payroll`);
        return;
      }

      if (!res.ok) {
        setErrorMsg(json?.error ?? `Failed (${res.status})`);
        setLoading(false);
        return;
      }

      setEmployee(json.employee ?? null);
      setItem(json.item ?? null);
      setLoading(false);
    }

    run();
  }, [idStr, router]);

  const canDownload = !!idStr && isUuid(idStr);
  const pdfHref = canDownload ? `/api/me/payroll/${encodeURIComponent(idStr)}/pdf` : "";
  const basescanTx = item?.tx_hash
    ? `https://sepolia.basescan.org/tx/${item.tx_hash}`
    : null;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/me/payroll" className="text-sm text-slate-300 hover:text-slate-100">
            ← Back
          </Link>

          <div className="text-xs text-slate-400">Signed in as {displayName}</div>

          {canDownload ? (
            <a
              href={pdfHref}
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
          <p className="mt-1 text-sm text-slate-300">ID: {idStr || "—"}</p>
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
              {item.tx_hash ? (
                <div className="mt-1 space-y-1">
                  <div className="break-all text-slate-200">{item.tx_hash}</div>

                  <a
                    href={`https://sepolia.basescan.org/tx/${item.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs text-indigo-300 hover:underline"
                  >
                    View on BaseScan ↗
                  </a>

                  {item.status === "pending" ? (
                    <p className="text-xs text-slate-400">Confirming on-chain…</p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-1 text-slate-300">—</div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-slate-300">
            No item.
          </div>
        )}
      </div>
    </div>
  );
}
