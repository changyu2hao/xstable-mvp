// app/payroll-items/page.tsx
import { Suspense } from "react";
import PayrollItemsClient from "./PayrollItemsClient";

// ✅ 防止 Next.js 在 build 时尝试静态生成（useSearchParams 必须）
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PayrollItemsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Payroll items</h1>

        {/* ✅ 所有 useSearchParams / useRouter 都只在 Client Component 里 */}
        <PayrollItemsClient />
      </div>
    </Suspense>
  );
}
