// app/company-detail/page.tsx
import CompanyDetailClient from "./CompanyDetailClient";

export const dynamic = "force-dynamic"; // ✅ 防止 build 阶段静态预渲染导致 searchParams 丢失
export const revalidate = 0;

export default async function CompanyDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const sp = await searchParams; // ✅ Next 15/16: searchParams 可能是 Promise
  return <CompanyDetailClient companyId={sp.companyId ?? null} />;
}
