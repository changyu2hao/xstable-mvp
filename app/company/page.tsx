// app/company/page.tsx
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import CompanyCreateForm from './CompanyCreateForm';

export default async function CompanyDashboardPage() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching companies:', error);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Company Portal</h1>
      <p className="text-black-300">
        Companies registered in the system (MVP demo):
      </p>

      {/* 新增公司表单 */}
      {/* 注意这一行保留你之前的 CompanyCreateForm */}
      {/* <CompanyCreateForm /> */}
      
      {/* 如果你已经有 CompanyCreateForm，这里记得保留 */}
      {/* 例如： */}
      <CompanyCreateForm />

      {/* 公司列表 */}
      <div className="space-y-2">
        {data && data.length > 0 ? (
          data.map((company) => (
            <Link
              key={company.id}
              href={`/company-detail?companyId=${company.id}`}
              className="block rounded border border-slate-700 bg-slate-800 p-4 hover:border-emerald-400"
            >
              <p className="text-lg font-medium text-slate-400">{company.name}</p>
              <p className="text-sm text-slate-400">
                {company.owner_email || 'No owner email'}
              </p>
              <p className="text-xs text-slate-500">
                Created at:{' '}
                {company.created_at
                  ? new Date(company.created_at).toLocaleString()
                  : '-'}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-slate-400">No companies found.</p>
        )}
      </div>
    </div>
  );
}
