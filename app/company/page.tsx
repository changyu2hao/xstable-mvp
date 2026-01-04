import { Suspense } from "react";
import CompanyDashboardClient from "./CompanyDashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CompanyDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
      <CompanyDashboardClient />
    </Suspense>
  );
}
