"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

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

        // 1) must be logged in
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        const user = authData.user;

        if (authErr || !user) {
          router.replace(`/login?next=/claim?token=${encodeURIComponent(token)}`);
          return;
        }

        if (cancelled) return;
        setMsg("Claiming your employee profile…");

        // 2) claim via RPC (server-side, atomic, RLS-friendly)
        const { data, error } = await supabase.rpc("claim_employee", {
          p_token: token,
        });

        if (cancelled) return;

        if (error) {
          const m = (error.message || "").toLowerCase();

          if (m.includes("already claimed")) {
            setMsg("This account is already linked to an employee. Redirecting…");
            setTimeout(() => router.replace("/me/payroll"), 1200);
            return;
          }

          if (m.includes("invalid or expired token")) {
            setMsg("Invite link is invalid or expired. Please request a new invite.");
            return;
          }

          if (m.includes("not authenticated")) {
            router.replace(`/login?next=/claim?token=${encodeURIComponent(token)}`);
            return;
          }

          setMsg(`Claim failed: ${error.message}`);
          return;
        }

        // data is the employees row (returned by RPC) - optional to use
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
