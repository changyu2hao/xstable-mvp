// app/company-detail/EmployeeCreateForm.tsx
'use client';

import { FormEvent, useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
const supabase = createSupabaseBrowserClient();


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
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false); // 可选，用来显示 Copied!

  useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    console.log("current user:", data.user?.id, data.user?.email);
  });
}, []);


  async function handleSubmit(e: FormEvent) {
    setInviteLink(null);
    setCopied(false);
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
    const { data: inserted, error } = await supabase
      .from('employees')
      .insert({
        company_id: companyId,
        name: trimmedName,
        email: email.trim() || null,
        wallet_address: normalizedWallet,
      })
      .select('id')
      .single();



    setLoading(false);

    if (error || !inserted) {
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

    // 3️⃣ generate invite token + expires
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // 4️⃣ write token back to employees
    const { data: updated, error: inviteErr } = await supabase
      .from('employees')
      .update({
        invite_token: token,
        invite_expires_at: expiresAt,
      })
      .eq('id', inserted.id)
      .select('id, invite_token')
      .single();

    console.log('invite update:', { updated, inviteErr, insertedId: inserted.id, token });


    if (inviteErr) {
      console.error('Error generating invite token:', inviteErr);
      setErrorMsg(`Employee created, but failed to generate invite link: ${inviteErr.message}`);
      setLoading(false);
      return;
    }

    // 5️⃣ build link + store in state
    const link = `${window.location.origin}/claim?token=${token}`;
    setInviteLink(link);
    setCopied(false);

    // ✅ 成功后清空表单
    setName('');
    setEmail('');
    setWalletAddress('');

    // ✅ 简单粗暴刷新，保证员工列表立刻更新
    // window.location.reload();
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
