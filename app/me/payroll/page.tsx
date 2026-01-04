import { Suspense } from "react";
import MePayrollClient from "./MePayrollClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function MePayrollPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
      <MePayrollClient />
    </Suspense>
  );
}
