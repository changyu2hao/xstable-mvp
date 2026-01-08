// app/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1️⃣ 未登录 → login
  if (!user) {
    redirect("/login");
  }

  // 2️⃣ 是否是 admin（company owner）
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (company) {
    // 你的 admin 界面是 /company
    redirect("/company");
  }

  // 3️⃣ 是否是 employee
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (employee) {
    redirect("/me/payroll");
  }

  // 4️⃣ 新用户（已注册但未绑定）
  redirect("/onboarding");
}
