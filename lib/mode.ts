/**
 * Which data source the app uses.
 *
 * - `supabase` — the real thing (Postgres + Auth + Storage).
 * - `local`    — development/demo mode: questions are read from ./data and
 *                papers/edits are kept in ./local-data. Useful before a
 *                Supabase project exists; no login is required in this mode.
 *
 * With no configuration at all the app falls back to `local` so a fresh clone
 * runs immediately; production deployments should set DATA_SOURCE=supabase
 * (or, simply, the NEXT_PUBLIC_SUPABASE_* variables).
 */
export type DataMode = "supabase" | "local";

export function getDataMode(): DataMode {
  const explicit = process.env.DATA_SOURCE;
  if (explicit === "supabase" || explicit === "local") return explicit;
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return configured ? "supabase" : "local";
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
