"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

/**
 * First-run setup: creates the first admin account. Guarded by the
 * SETUP_SECRET environment variable on the server (/api/setup).
 */
export default function SetupPage() {
  const router = useRouter();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((d: { hasAdmin: boolean; authEnabled: boolean }) => setHasAdmin(d.hasAdmin))
      .catch(() => setHasAdmin(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, secret }),
      });
      const data: { ok: boolean; message: string } = await res.json();
      if (!data.ok) {
        push("error", data.message);
        return;
      }
      push("success", "অ্যাডমিন তৈরি হয়েছে — এখন লগইন করুন।");
      router.push("/login");
    } catch {
      push("error", "সেটআপ ব্যর্থ হয়েছে।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm">
        <h1 className="text-xl font-bold">প্রথম অ্যাডমিন তৈরি</h1>
        {hasAdmin === true ? (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            সেটআপ সম্পন্ন — ইতিমধ্যে একজন অ্যাডমিন আছে, তাই এই পাতা আর ব্যবহার করা যায় না।{" "}
            <Link href="/login" className="underline">
              লগইন করুন
            </Link>
            ।
          </p>
        ) : null}

        <label className="field-label mt-4" htmlFor="email">ইমেইল</label>
        <input id="email" type="email" required className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="field-label mt-3" htmlFor="password">পাসওয়ার্ড (৮+ অক্ষর)</label>
        <input id="password" type="password" required minLength={8} className="field-input" value={password} onChange={(e) => setPassword(e.target.value)} />

        <label className="field-label mt-3" htmlFor="secret">সেটআপ সিক্রেট</label>
        <input id="secret" type="password" required className="field-input" value={secret} onChange={(e) => setSecret(e.target.value)} />
        <p className="mt-1 text-xs text-muted">.env-এর SETUP_SECRET মান দিন।</p>

        <button
          type="submit"
          className="btn-primary mt-5 w-full"
          disabled={busy || hasAdmin === true}
        >
          {busy ? "তৈরি হচ্ছে…" : "অ্যাডমিন তৈরি করুন"}
        </button>
      </form>
    </main>
  );
}
