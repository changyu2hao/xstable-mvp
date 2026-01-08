// app/onboarding/OnboardingClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function extractToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1) If user pasted a full URL, parse token from query
  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get("token");
    if (token) return token;
  } catch {
    // not a URL, fall through
  }

  // 2) Maybe they pasted `token=xxx`
  const m = trimmed.match(/token=([^&\s]+)/);
  if (m?.[1]) return m[1];

  // 3) Otherwise assume it's a raw token
  return trimmed;
}

export default function OnboardingClient() {
  const router = useRouter();
  const [inviteInput, setInviteInput] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const token = useMemo(() => extractToken(inviteInput), [inviteInput]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-semibold">Welcome to XStable</h1>
        <p className="mt-2 text-slate-300">
          Your account is created. Next, link it to a company (admin) or an
          employee invitation.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Admin */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">I’m a Company (Admin)</h2>
            <p className="mt-2 text-sm text-slate-300">
              Go to your company dashboard, create a company, then add employees
              to generate invite links.
            </p>

            <button
              onClick={() => router.push("/company")}
              className="mt-5 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Go to Company Dashboard
            </button>
          </div>

          {/* Employee */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">I’m an Employee</h2>
            <p className="mt-2 text-sm text-slate-300">
              Paste the invite link (or token) from your admin to claim your
              employee profile.
            </p>

            <label className="mt-4 block text-sm text-slate-300">
              Invite link or token
            </label>
            <input
              value={inviteInput}
              onChange={(e) => {
                setInviteInput(e.target.value);
                setErr(null);
              }}
              placeholder="https://.../claim?token=...  or  token..."
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />

            {err && <p className="mt-2 text-sm text-rose-400">{err}</p>}

            <button
              disabled={!token}
              onClick={() => {
                if (!token) {
                  setErr("Please paste a valid invite link or token.");
                  return;
                }
                router.push(`/claim?token=${encodeURIComponent(token)}`);
              }}
              className="mt-5 w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
            >
              Claim invitation
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
          <div className="font-medium text-slate-200">Tip</div>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>
              Admin: create employees in <code>/company-detail</code> to get an
              invite link.
            </li>
            <li>
              Employee: once claimed, your account will redirect to{" "}
              <code>/me/payroll</code>.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
