// app/sign-up/SignUpClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignUpClient() {
  const router = useRouter();
  const sp = useSearchParams();

  // keep next for the "Log in" link only (optional)
  const next = sp?.get("next") || "/";

  // ✅ create client once
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMsg("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Email confirm enabled => user will come back to /login after clicking email link
        emailRedirectTo: `${location.origin}/login`,
      },
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    // If email confirmation is enabled, session is usually null
    if (!data.session) {
      setMsg(
        "✅ A confirmation email has been sent. Please verify your email before logging in."
      );
      return;
    }

    // Email confirmation disabled => already signed in
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-white">Create account</h1>
        <p className="mt-1 text-sm text-slate-300">
          Sign up with email + password.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
              autoComplete="email"
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
              minLength={6}
              required
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
            />
            <p className="mt-2 text-xs text-slate-500">
              Use at least 6 characters.
            </p>
          </div>

          {msg ? (
            // If it's your success message, show green; otherwise show rose.
            <p
              className={`text-sm ${
                msg.startsWith("✅")
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {msg}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Signing up…" : "Sign up"}
          </button>
        </form>

        <div className="mt-5 text-sm text-slate-300">
          Already have an account?{" "}
          <a
            className="text-indigo-400 underline hover:text-indigo-300"
            href={`/login?next=${encodeURIComponent(next)}`}
          >
            Sign in
          </a>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          After sign up, you will be redirected to your dashboard.
        </p>
      </div>
    </div>
  );
}
