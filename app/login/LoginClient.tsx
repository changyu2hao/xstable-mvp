// app/login/LoginClient.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const next =
    sp?.get("next") ||
    sp?.get("redirectTo") ||
    "/company";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    if (data.user) {
      router.replace(next);
      router.refresh();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setMsg("Signed out.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-white">Sign in</h1>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              placeholder="••••••••"
            />
          </div>

          {msg && <p className="text-sm text-rose-400">{msg}</p>}

          <button
            type="submit"
            className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white"
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-md border border-slate-700 py-2 text-sm font-medium text-slate-300"
          >
            Sign out
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-500">
          After login, you will be redirected to{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">
            {next}
          </code>
        </p>
      </div>
    </div>
  );
}
