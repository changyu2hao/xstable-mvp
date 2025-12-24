import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/company", "/company-detail", "/payroll-items", "/me"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 不要拦截 API / 静态资源
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // ✅ 触发 refresh，把 session 写进 cookie，server 才能读到
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  // 未登录访问受保护页面 → 跳 login，并带 next（包含 querystring）
  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${search || ""}`);
    return NextResponse.redirect(loginUrl);
  }

  // 已登录访问 /login：如果带 next 就去 next，否则去 /company
  if (user && pathname === "/login") {
    const nextParam = request.nextUrl.searchParams.get("next");
    const dest = nextParam && nextParam.startsWith("/") ? nextParam : "/company";

    const url = request.nextUrl.clone();
    url.pathname = dest;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
