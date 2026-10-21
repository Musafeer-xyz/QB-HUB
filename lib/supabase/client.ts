"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser client for auth + uploads. Only used in supabase mode. */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase কনফিগার করা নেই।");
  return createBrowserClient(url, anonKey);
}
