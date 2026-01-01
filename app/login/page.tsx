// app/login/page.tsx
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; redirectTo?: string }> | { next?: string; redirectTo?: string };
}) {
  const sp = searchParams && typeof (searchParams as any).then === "function"
    ? await (searchParams as Promise<any>)
    : (searchParams as any);

  const redirectTo = sp?.redirectTo ?? sp?.next ?? null;

  return <LoginClient redirectTo={redirectTo} />;
}
