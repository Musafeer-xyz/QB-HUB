import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<div className="card w-full max-w-sm text-center text-sm text-muted">লোড হচ্ছে…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
