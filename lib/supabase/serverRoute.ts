import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase client for Next.js Route Handlers
 * IMPORTANT:
 * - In current Next.js versions, cookies() returns a Promise
 * - So this function MUST be async
 */
export async function createSupabaseRouteClient() {
  const cookieStore = await cookies(); // ✅ 必须 await

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll(); // ✅ OK
        },
        setAll(cookiesToSet) {
          // Route Handlers usually don't need to set cookies,
          // but this keeps the type system happy and future-proof.
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Safe to ignore in route handlers
          }
        },
      },
    }
  );
}
