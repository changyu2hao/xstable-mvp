// app/claim/page.tsx
import ClaimClient from "./ClaimClient";

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const sp = await searchParams;
  const tokenRaw = sp?.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;

  return <ClaimClient token={token ?? ""} />;
}
