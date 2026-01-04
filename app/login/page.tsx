// app/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./LoginClient";

// ✅ 防止 Next.js 在 build 时尝试静态生成 /login
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
      <LoginClient />
    </Suspense>
  );
}
