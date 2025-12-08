'use client';

import EmployeeCreateForm from './EmployeeCreateForm';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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

export default function CompanyDetailClient() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get('companyId'); // ⭐ 这里从 URL 里拿参数
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!companyId) {
        setErrorMsg('No companyId in URL');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      // 1) 查公司
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();

      if (companyError) {
        console.error('Error fetching company:', companyError);
        setErrorMsg(companyError.message);
        setLoading(false);
        return;
      }

      if (!companyData) {
        setErrorMsg('Company not found');
        setLoading(false);
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
        setLoading(false);
        return;
      }

      setEmployees((employeesData || []) as Employee[]);
      setLoading(false);
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

return (
  <div className="p-6 space-y-6 max-w-4xl mx-auto">
    <div>
      <h1 className="text-2xl font-semibold">{company.name}</h1>
      <p className="text-slate-400">
        Owner: {company.owner_email || 'No owner email'}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Company ID (from URL): {companyId}
      </p>
    </div>

    {/* ✅ 在这里插入“新增员工”表单 */}
    <EmployeeCreateForm companyId={companyId} />

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
  </div>
);
}
