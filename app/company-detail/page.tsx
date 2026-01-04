import { Suspense } from "react";
import CompanyDetailClient from "./CompanyDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompanyDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const sp = await searchParams;

  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
      <CompanyDetailClient companyId={sp.companyId ?? null} />
    </Suspense>
  );
}
