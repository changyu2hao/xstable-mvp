'use client';

import PayrollBatchCreateForm from './PayrollBatchCreateForm';
import EmployeeCreateForm from './EmployeeCreateForm';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import Link from 'next/link'; // 👈 新增

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
}

const supabase = createSupabaseBrowserClient();

export default function CompanyDetailClient() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId'); // ⭐ 这里从 URL 里拿参数
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [batchStats, setBatchStats] = useState<
    Record<string, { itemCount: number; totalAmount: number }>
  >({});

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
        // 1) 查公司
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .maybeSingle();

        if (companyError) {
          console.error('Error fetching company:', companyError);
          setErrorMsg(companyError.message);
          return;
        }

        if (!companyData) {
          setErrorMsg('Company not found');
          return;
        }

        setCompany(companyData as Company);

        // 2) 查员工
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (employeesError) {
          console.error('Error fetching employees:', employeesError);
          setErrorMsg(employeesError.message);
          return;
        }

        setEmployees((employeesData || []) as Employee[]);

        // 3) 查 payroll_batches
        const { data: batchData, error: batchError } = await supabase
          .from('payroll_batches')
          .select('*')
          .eq('company_id', companyId)
          .order('pay_date', { ascending: false });

        if (batchError) {
          console.error('Error fetching payroll_batches:', batchError);
        } else {
          const safeBatches = batchData || [];
          setBatches(safeBatches);

          // ⭐ 新增：如果有 batch，再去查这些 batch 对应的 payroll_items
          const batchIds = safeBatches.map((b: any) => b.id).filter(Boolean);

          if (batchIds.length > 0) {
            const { data: itemsData, error: itemsError } = await supabase
              .from('payroll_items')
              .select('batch_id, amount_usdc')
              .in('batch_id', batchIds);

            if (itemsError) {
              console.error('Error fetching payroll_items stats:', itemsError);
              setBatchStats({});
            } else {
              // 在前端按 batch_id 聚合：统计条数 + 总金额
              const stats: Record<string, { itemCount: number; totalAmount: number }> =
                {};

              (itemsData || []).forEach((item: any) => {
                const bId = item.batch_id as string;
                const amount = Number(item.amount_usdc ?? 0);

                if (!stats[bId]) {
                  stats[bId] = { itemCount: 0, totalAmount: 0 };
                }

                stats[bId].itemCount += 1;
                stats[bId].totalAmount += amount;
              });

              setBatchStats(stats);
            }
          } else {
            // 没有 batch，就清空统计
            setBatchStats({});
          }
        }

      } catch (err: any) {
        console.error('Unexpected error in fetchData:', err);
        setErrorMsg(err?.message ?? 'Failed to load company data');
      } finally {
        // ✅ 无论成功还是出错，最后都关掉 loading
        setLoading(false);
      }
    }
    fetchData();
  }, [companyId]);

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
      <EmployeeCreateForm companyId={companyIdStr} />

      {/* 员工列表 */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Employees</h2>
        {employees.length > 0 ? (
          employees.map((emp) => (
            <div
              key={emp.id}
              className="rounded border border-slate-700 bg-slate-800 p-3"
            >
              <p className="font-medium text-slate-300">{emp.name}</p>
              <p className="text-sm text-slate-300">
                {emp.email || 'No email'}
              </p>
              <p className="text-xs text-slate-400">
                Wallet: {emp.wallet_address}
              </p>
            </div>
          ))
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

        <PayrollBatchCreateForm companyId={companyIdStr} />

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
