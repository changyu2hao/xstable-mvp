// app/debug/page.tsx
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export default async function DebugPage() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) {
      return (
        <pre style={{ padding: 16 }}>
          Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
        </pre>
      );
    }

    // ✅ 你的 Next 版本里 cookies() 是 Promise，所以必须 await
    const cookieStore = await cookies();

    // ⚠️ 在 Server Component 里 cookies 通常是只读的
    // 所以 set/remove 这里做成 no-op 就行（真正写 cookie 用 middleware/route handler）
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
  } catch (e: any) {
    return (
      <pre style={{ padding: 16, color: "crimson" }}>
        Debug crashed: {e?.message ?? String(e)}
      </pre>
    );
  }
}
