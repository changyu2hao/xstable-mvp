// app/company-detail/EmployeeCreateForm.tsx
'use client';

import { FormEvent, useState, useEffect } from 'react';


interface EmployeeCreateFormProps {
  companyId: string;
  onCreated?: () => void | Promise<void>;
}

export default function EmployeeCreateForm({
  companyId,onCreated
}: EmployeeCreateFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false); // 可选，用来显示 Copied!

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setInviteLink(null);
    setCopied(false);
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedWallet = walletAddress.trim().toLowerCase();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMsg("Employee name is required");
      return;
    }
    if (!trimmedWallet) {
      setErrorMsg("Wallet address is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name: trimmedName,
          email: trimmedEmail,
          walletAddress: trimmedWallet,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json?.error ?? "Failed to create employee");
        return;
      }

      // server 返回 employee + invite_token
      const token = json.employee.invite_token;
      const link = `${window.location.origin}/claim?token=${token}`;

      setInviteLink(link);
      setCopied(false);
      
      setName("");
      setEmail("");
      setWalletAddress("");
      await onCreated?.();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Failed to create employee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded border border-slate-700 bg-slate-900 p-4"
    >
      <h2 className="text-lg font-semibold text-white">Add employee</h2>

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
      {/* ✅ Invite link 展示 + Copy */}
      {inviteLink && (
        <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-950 p-3">
          <p className="text-sm text-slate-300">Invite link (expires in 7 days)</p>

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
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
