// app/sign-up/page.tsx
import { Suspense } from "react";
import SignUpClient from "./SignUpClient";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <SignUpClient />
    </Suspense>
  );
}
