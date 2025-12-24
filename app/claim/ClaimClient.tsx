"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimClient({ token }: { token: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("Checking your invite…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!token) {
          setMsg("Missing token. Please check your invite link.");
          return;
        }

        setMsg("Claiming your employee profile…");

        const res = await fetch("/api/me/claim", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const text = await res.text();
        const json = text ? JSON.parse(text) : null;

        if (cancelled) return;

        if (res.status === 401) {
          router.replace(`/login?next=/claim?token=${encodeURIComponent(token)}`);
          return;
        }

        if (!res.ok) {
          const m = String(json?.error ?? `Claim failed (${res.status})`).toLowerCase();

          if (m.includes("already claimed")) {
            setMsg("This account is already linked to an employee. Redirecting…");
            setTimeout(() => router.replace("/me/payroll"), 1200);
            return;
          }

          if (m.includes("invalid") || m.includes("expired")) {
            setMsg("Invite link is invalid or expired. Please request a new invite.");
            return;
          }

          setMsg(`Claim failed: ${json?.error ?? `(${res.status})`}`);
          return;
        }

        setMsg("Claim successful! Redirecting…");
        setTimeout(() => router.replace("/me/payroll"), 1200);
      } catch (e: any) {
        setMsg(`Claim failed: ${String(e?.message ?? e)}`);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-xl font-semibold text-white">Claim your account</h1>
        <p className="mt-3 text-sm text-slate-300">{msg}</p>
      </div>
    </div>
  );
}
