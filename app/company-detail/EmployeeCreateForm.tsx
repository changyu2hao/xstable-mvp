// app/company-detail/EmployeeCreateForm.tsx
'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface EmployeeCreateFormProps {
  companyId: string;
}

export default function EmployeeCreateForm({
  companyId,
}: EmployeeCreateFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedWallet = walletAddress.trim();

    const normalizedWallet = trimmedWallet.toLowerCase();

    // ✅ 基础校验
    if (!trimmedName) {
      setErrorMsg('Employee name is required');
      return;
    }

    if (!trimmedWallet) {
      setErrorMsg('Wallet address is required');
      return;
    }

    setLoading(true);

    const { data: existing, error: dupCheckError } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('wallet_address', normalizedWallet);

    if (dupCheckError) {
      console.error('Error checking duplicate wallet:', dupCheckError);
      setErrorMsg('Failed to validate wallet address, please try again.');
      setLoading(false);
      return;
    }

    if (existing && existing.length > 0) {
      setErrorMsg(
        'This wallet address is already used by another employee in this company.'
      );
      setLoading(false);
      return;
    }

    // 2️⃣ 再真正插入
    const { error } = await supabase.from('employees').insert({
      company_id: companyId,
      name: trimmedName,
      email: email.trim() || null,
      wallet_address: normalizedWallet, // 注意这里用 normalizedWallet
    });

    setLoading(false);

    if (error) {
      console.error('Error inserting employee:', error);

      // 如果数据库开了唯一约束，重复会报 23505
      if ((error as any).code === '23505') {
        setErrorMsg(
          'This wallet address is already used by another employee in this company.'
        );
      } else {
        setErrorMsg(error.message);
      }
      return;
    }


    // ✅ 成功后清空表单
    setName('');
    setEmail('');
    setWalletAddress('');

    // ✅ 简单粗暴刷新，保证员工列表立刻更新
    window.location.reload();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded border border-slate-700 bg-slate-900 p-4"
    >
      <h2 className="text-lg font-semibold">Add employee</h2>

      {/* 员工姓名 */}
      <div className="space-y-1">
        <label className="block text-sm text-slate-300">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alice"
        />
      </div>

      {/* 员工邮箱 */}
      <div className="space-y-1">
        <label className="block text-sm text-slate-300">Email</label>
        <input
          className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. alice@example.com"
        />
      </div>

      {/* 钱包地址 */}
      <div className="space-y-1">
        <label className="block text-sm text-slate-300">
          Wallet address <span className="text-red-400">*</span>
        </label>
        <input
          className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="0x123..."
        />
      </div>

      {/* 错误提示 */}
      {errorMsg && (
        <p className="text-sm text-red-400">Error: {errorMsg}</p>
      )}

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
      >
        {loading ? 'Creating...' : 'Add employee'}
      </button>
    </form>
  );
}
