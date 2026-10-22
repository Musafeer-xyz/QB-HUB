/**
 * Which data source the app uses.
 *
 * - `supabase` — the real thing (Postgres + Auth + Storage).
 * - `local`    — development/demo mode: questions are read from ./data and
 *                papers/edits are kept in ./local-data. Useful before a
 *                Supabase project exists; no login is required in this mode.
 *
 * Local mode is deliberately narrow: it needs an explicit `DATA_SOURCE=local`
 * AND either a non-production `NODE_ENV` or `ALLOW_LOCAL_DEMO=1`. A production
 * server that sets `DATA_SOURCE=local` by accident therefore runs against
 * Supabase instead of silently serving the demo bank to the internet.
 */
export type DataMode = "supabase" | "local";

/** Env vars a Supabase-mode server cannot work without. */
export const REQUIRED_SUPABASE_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/** True only for an explicitly allowed local demo. */
export function isLocalDemoEnabled(): boolean {
  if (process.env.DATA_SOURCE !== "local") return false;
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return true;
  return process.env.ALLOW_LOCAL_DEMO === "1";
}

export function getDataMode(): DataMode {
  return isLocalDemoEnabled() ? "local" : "supabase";
}

export function isLocalMode(): boolean {
  return getDataMode() === "local";
}

/** True when Supabase Auth is actually protecting the routes. */
export function isAuthEnabled(): boolean {
  return getDataMode() === "supabase";
}

export function supabasePublicEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function serviceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? null;
}

export function missingSupabaseEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!serviceRoleKey()) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

/**
 * Fail fast at server start (see instrumentation.ts) instead of serving pages
 * that can only return "Supabase কনফিগার করা নেই" later.
 */
export function assertRuntimeConfig(): void {
  if (getDataMode() === "local") return;
  const missing = missingSupabaseEnv();
  if (missing.length === 0) return;
  throw new Error(
    `\n[QB Hub] Supabase mode is selected but these environment variables are missing: ${missing.join(", ")}.\n` +
      "Set them on the host (NEXT_PUBLIC_* values are inlined at BUILD time, so they must exist before `npm run build`).\n" +
      "For a local demo server instead, set DATA_SOURCE=local and ALLOW_LOCAL_DEMO=1.\n",
  );
}
