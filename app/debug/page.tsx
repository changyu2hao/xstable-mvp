// app/debug/page.tsx
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Suspense } from "react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function DebugInner() {
  // ✅ 上线建议禁用（可选）
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    return (
      <pre style={{ padding: 16 }}>
        Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
      </pre>
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(url, anon, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });

  const { data, error } = await supabase.auth.getUser();

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>/debug</h1>
      <pre style={{ marginTop: 12 }}>
        {JSON.stringify(
          { user: data?.user ?? null, error: error?.message ?? null },
          null,
          2
        )}
      </pre>
    </div>
  );
}

export default async function DebugPage() {
  // ✅ 直接在 async page 里用 Suspense 包 JSX 就行
  return (
    <Suspense
      fallback={<div style={{ padding: 16, color: "#94a3b8" }}>Loading debug...</div>}
    >
      <DebugInner />
    </Suspense>
  );
}
