// app/company-detail/PayrollBatchCreateForm.tsx
'use client';

import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
const supabase = createSupabaseBrowserClient();

interface Props {
  companyId: string;
}

export default function PayrollBatchCreateForm({ companyId }: Props) {
  const [title, setTitle] = useState('');
  const [payDate, setPayDate] = useState('');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg('Title is required');
      return;
    }
    if (!payDate) {
      setErrorMsg('Pay date is required');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('payroll_batches').insert({
      company_id: companyId,
      title: trimmedTitle,
      pay_date: payDate,     // yyyy-mm-dd
      note: note.trim() || null,
      // status 让它用默认的 draft
    });

    setLoading(false);

    if (error) {
      console.error('Error creating payroll batch:', error);
      setErrorMsg(error.message);
      return;
    }

    setTitle('');
    setPayDate('');
    setNote('');

    // 简单粗暴：刷新页面，让批次列表更新
    window.location.reload();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded border border-slate-700 bg-slate-900 p-4"
    >
      <h2 className="text-lg font-semibold text-white">Create payroll batch</h2>

      <div className="space-y-1">
        <label className="block text-sm text-slate-300">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. January 2026 Payroll"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm text-slate-300">
          Pay date <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          value={payDate}
          onChange={(e) => setPayDate(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm text-slate-300">Note</label>
        <textarea
          className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional description"
          rows={2}
        />
      </div>

      {errorMsg && (
        <p className="text-sm text-red-400">Error: {errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
      >
        {loading ? 'Creating...' : 'Create batch'}
      </button>
    </form>
  );
}
