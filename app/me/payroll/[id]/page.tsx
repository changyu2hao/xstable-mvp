import { Suspense } from "react";
import MePayrollDetailClient from "./MePayrollDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MePayrollDetailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
      <MePayrollDetailClient />
    </Suspense>
  );
}
