'use client';

import PayrollBatchCreateForm from './PayrollBatchCreateForm';
import EmployeeCreateForm from './EmployeeCreateForm';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  owner_email: string | null;
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  wallet_address: string;

  invite_token: string | null;
  invite_expires_at: string | null;
  user_id: string | null;
  created_at?: string; // 你 API 也返回了 created_at，可选
}


export default function CompanyDetailClient({ companyId }: { companyId: string | null }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [batchStats, setBatchStats] = useState<
    Record<string, { itemCount: number; totalAmount: number }>
  >({});
  const [openInviteFor, setOpenInviteFor] = useState<string | null>(null);
  const [copiedFor, setCopiedFor] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) {
        setErrorMsg('No companyId in URL');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(
          `/api/admin/company-detail?companyId=${encodeURIComponent(companyId)}`,
          { credentials: 'include' }
        );

        const text = await res.text();
        const json = text ? JSON.parse(text) : null;

        if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`);

        setCompany(json.company ?? null);
        setEmployees(json.employees ?? []);
        setBatches(json.batches ?? []);
        setBatchStats(json.batchStats ?? {});
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err?.message ?? 'Failed to load company data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId]);


  async function refetchAll() {
    if (!companyId) return;
    const res = await fetch(
      `/api/admin/company-detail?companyId=${encodeURIComponent(companyId)}`,
      { credentials: 'include' }
    );
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`);
    setCompany(json.company ?? null);
    setEmployees(json.employees ?? []);
    setBatches(json.batches ?? []);
    setBatchStats(json.batchStats ?? {});
  }

  // ✅ 下面是 UI 渲染部分

  if (!companyId) {
    return (
      <div className="p-6">
        <h1 className="text-red-400 text-xl mb-4">
          No companyId in URL (client)
        </h1>
        <p className="text-slate-300">
          当前地址栏没有 <code>?companyId=...</code> 参数。
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-slate-300">Loading company data...</p>
        <p className="mt-2 text-xs text-slate-500">
          companyId from URL: {companyId}
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6">
        <h1 className="text-red-400 text-xl mb-4">Error</h1>
        <p className="text-slate-300">{errorMsg}</p>
        <p className="mt-2 text-xs text-slate-500">
          companyId from URL: {companyId}
        </p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6">
        <h1 className="text-red-400 text-xl mb-4">Company not found</h1>
        <p className="mt-2 text-xs text-slate-500">
          companyId from URL: {companyId}
        </p>
      </div>
    );
  }

  const companyIdStr = companyId as string;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">{company.name}</h1>
        <p className="text-slate-400">
          Owner: {company.owner_email || 'No owner email'}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Company ID (from URL): {companyIdStr}
        </p>
      </div>

      {/* ✅ 在这里插入“新增员工”表单 */}
      <EmployeeCreateForm companyId={companyIdStr} onCreated={refetchAll} />

      {/* 员工列表 */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Employees</h2>
        {employees.length > 0 ? (
          employees.map((emp) => {
            const isClaimed = !!emp.user_id;
            const hasToken = !!emp.invite_token;

            const isExpired =
              emp.invite_expires_at
                ? new Date(emp.invite_expires_at) < new Date()
                : false;

            const inviteLink =
              emp.invite_token
                ? `${window.location.origin}/claim?token=${emp.invite_token}`
                : "";

            const isOpen = openInviteFor === emp.id;

            return (
              <div
                key={emp.id}
                className="rounded border border-slate-700 bg-slate-800 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-300">{emp.name}</p>
                    <p className="text-sm text-slate-300">
                      {emp.email || "No email"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Wallet: {emp.wallet_address}
                    </p>

                    {/* 状态显示 */}
                    <p className="mt-1 text-xs">
                      {isClaimed ? (
                        <span className="text-emerald-400">Claimed</span>
                      ) : isExpired ? (
                        <span className="text-rose-400">Invite expired</span>
                      ) : (
                        <span className="text-slate-400">Not claimed</span>
                      )}
                    </p>
                  </div>

                  {/* 右侧按钮 */}
                  <button
                    type="button"
                    disabled={!hasToken || isClaimed}
                    onClick={() => setOpenInviteFor(isOpen ? null : emp.id)}
                    className="
    rounded bg-slate-900 px-3 py-2 text-xs font-medium text-white
    disabled:opacity-50
    enabled:hover:bg-slate-700
  "
                    title={
                      isClaimed
                        ? "Already claimed"
                        : !hasToken
                          ? "No invite token"
                          : "Show invite link"
                    }
                  >
                    {isOpen ? "Hide" : "Invite link"}
                  </button>
                </div>
                {/* 展开区域：Invite link + Copy + Open */}
                {isOpen && !isClaimed && hasToken && (
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-700 bg-slate-950 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-300">
                        Invite link{" "}
                        {isExpired ? (
                          <span className="text-rose-400">(expired)</span>
                        ) : (
                          <span className="text-emerald-400">(valid)</span>
                        )}
                      </p>

                      {emp.invite_expires_at && (
                        <p className="text-xs text-slate-500">
                          Expires: {new Date(emp.invite_expires_at).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={inviteLink}
                        className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                      />

                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(inviteLink);
                          setCopiedFor(emp.id);
                          setTimeout(() => setCopiedFor(null), 1200);
                        }}
                        className="rounded bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500"
                      >
                        {copiedFor === emp.id ? "Copied!" : "Copy"}
                      </button>

                      <a
                        href={inviteLink}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
                      >
                        Open
                      </a>
                    </div>

                    {isExpired && (
                      <p className="text-xs text-rose-400">
                        This invite link is expired. (MVP) You may need to recreate the employee invite.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-slate-400">No employees yet.</p>
        )}

      </div>

      {/* 发薪批次：创建表单 + 列表 */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Payroll batches</h2>
        <p className="text-sm text-slate-400">
          Create and view payroll runs for this company.
        </p>

        <PayrollBatchCreateForm companyId={companyIdStr} onCreated={refetchAll} />

        {/* 批次列表 */}
        <div className="space-y-2">
          {batches.length > 0 ? (
            batches.map((batch) => {
              const stat = batchStats[batch.id as string]; // ⭐ 取出该 batch 的统计

              return (
                <div
                  key={batch.id}
                  className="rounded border border-slate-700 bg-slate-800 p-3"
                >
                  <p className="font-medium text-slate-300">{batch.title}</p>
                  <p className="text-sm text-slate-300">
                    Pay date:{' '}
                    {batch.pay_date
                      ? new Date(batch.pay_date).toLocaleDateString()
                      : '-'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Status: {batch.status || 'draft'}
                  </p>

                  {/* ⭐ 新增：发薪明细条数 + 总金额 */}
                  <p className="text-xs text-slate-400 mt-1">
                    Items: <span className="font-semibold">
                      {stat?.itemCount ?? 0}
                    </span>{' '}
                    | Total:{' '}
                    <span className="font-semibold">
                      {(stat?.totalAmount ?? 0).toFixed(2)} USDC
                    </span>
                  </p>

                  {batch.note && (
                    <p className="text-xs text-slate-400 mt-1">Note: {batch.note}</p>
                  )}

                  <Link
                    href={`/payroll-items?batchId=${batch.id}&companyId=${companyIdStr}`}
                    className="text-xs text-blue-400 underline mt-2 inline-block"
                  >
                    View payroll items
                  </Link>

                </div>
              );
            })
          ) : (
            <p className="text-slate-400 text-sm">No payroll batches yet.</p>
          )}

        </div>
      </div>
    </div>
  );
}
