// app/company/CompanyCreateForm.tsx
'use client';

import { useState, useTransition, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function CompanyCreateForm() {
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

    async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedEmail = ownerEmail.trim();

    if (!trimmedName) {
      setErrorMsg('Company name is required');
      return;
    }

    const { error } = await supabase.from('companies').insert({
      name: trimmedName,
      owner_email: trimmedEmail || null,
    });

    if (error) {
      console.error('Error inserting company:', error);

      // 如果是唯一约束冲突（重复公司名）
      // Supabase 基于 Postgres，一般 code 是 '23505'
      // （如果 TS 报错可以把 error 类型临时用 any）
      if (error.code === '23505') {
        setErrorMsg('A company with this name already exists.');
      } else {
        setErrorMsg(error.message);
      }
      return;
    }

    // 成功：清空表单
    setName('');
    setOwnerEmail('');

    // 刷新公司列表
    startTransition(() => {
      router.refresh();
    });
  }


  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded border border-slate-700 bg-slate-900 p-4"
    >
      <h2 className="text-lg font-semibold text-slate-300">Add a new company (demo)</h2>

      <div className="space-y-1">
        <label className="block text-sm text-slate-300">
          Company name <span className="text-red-400">*</span>
        </label>
        <input
          className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. XStable Labs"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm text-slate-300">Owner email</label>
        <input
          className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="e.g. founder@xstable.io"
        />
      </div>

      {errorMsg && (
        <p className="text-sm text-red-400">Error: {errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
      >
        {isPending ? 'Creating...' : 'Create company'}
      </button>
    </form>
  );
}
