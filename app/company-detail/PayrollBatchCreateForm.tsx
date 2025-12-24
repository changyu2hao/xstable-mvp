// app/company-detail/PayrollBatchCreateForm.tsx
"use client";

import { FormEvent, useState } from "react";

interface Props {
  companyId: string;
  onCreated?: () => void | Promise<void>;
}

export default function PayrollBatchCreateForm({ companyId, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [payDate, setPayDate] = useState("");
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedTitle = title.trim();
    const trimmedNote = note.trim();

    if (!trimmedTitle) {
      setErrorMsg("Title is required");
      return;
    }
    if (!payDate) {
      setErrorMsg("Pay date is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/payroll-batches", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          title: trimmedTitle,
          payDate, // yyyy-mm-dd
          note: trimmedNote || null,
        }),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;

      if (!res.ok) {
        setErrorMsg(json?.error ?? `Failed to create batch (${res.status})`);
        return;
      }

      // success
      setTitle("");
      setPayDate("");
      setNote("");

      await onCreated?.();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message ?? "Failed to create batch");
    } finally {
      setLoading(false);
    }
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

      {errorMsg && <p className="text-sm text-red-400">Error: {errorMsg}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create batch"}
      </button>
    </form>
  );
}
