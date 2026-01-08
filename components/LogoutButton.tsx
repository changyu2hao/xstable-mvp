"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

export default function LogoutButton({
  className = "rounded border border-rose-500/40 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10",
  label = "Log out",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);

    try {
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
      router.refresh(); // ✅ 关键：让 server/middleware 立刻感知“已退出”
    }
  }

  return (
    <button type="button" onClick={handleLogout} disabled={loading} className={className}>
      {loading ? "Signing out…" : label}
    </button>
  );
}
