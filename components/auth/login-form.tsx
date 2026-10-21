"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        push("error", "ইমেইল বা পাসওয়ার্ড ভুল।");
        return;
      }
      push("success", "লগইন সফল হয়েছে।");
      router.push(params.get("next") ?? "/admin");
      router.refresh();
    } catch {
      push("error", "Supabase কনফিগার করা নেই।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-sm">
      <h1 className="text-xl font-bold">লগইন</h1>
      <p className="mt-1 text-sm text-slate-600">শিক্ষক/অ্যাডমিন হিসেবে প্রবেশ করুন।</p>

      <label className="field-label mt-4" htmlFor="email">
        ইমেইল
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        className="field-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label className="field-label mt-3" htmlFor="password">
        পাসওয়ার্ড
      </label>
      <input
        id="password"
        type="password"
        required
        autoComplete="current-password"
        className="field-input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit" className="btn-primary mt-5 w-full" disabled={busy}>
        {busy ? "প্রবেশ করা হচ্ছে…" : "প্রবেশ করুন"}
      </button>

      <p className="mt-4 text-center text-xs text-slate-500">
        নতুন প্রতিষ্ঠান সেটআপ করতে{" "}
        <Link href="/setup" className="underline">
          সেটআপ পাতা
        </Link>{" "}
        দেখুন।
      </p>
    </form>
  );
}
