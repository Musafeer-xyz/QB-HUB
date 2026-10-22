import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode, serviceRoleKey, supabasePublicEnv } from "@/lib/mode";

/**
 * User-scoped Supabase client (RLS applies). Returns null in local mode or
 * when Supabase is not configured.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const env = supabasePublicEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — middleware refreshes the session.
        }
      },
    },
  });
}

/** Service-role client. Server-only, bypasses RLS — never ship to the browser. */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const env = supabasePublicEnv();
  const serviceKey = serviceRoleKey();
  if (!env || !serviceKey) return null;
  return createClient(env.url, serviceKey, { auth: { persistSession: false } });
}

/** Signed-in user (null when anonymous or in local mode). */
export async function getAuthUser(): Promise<{ id: string; email?: string } | null> {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email } : null;
}

/** Whether the signed-in user is in `public.admins`. */
export async function isAdminUser(): Promise<boolean> {
  if (isLocalMode()) return true;
  const client = await createSupabaseServerClient();
  if (!client) return false;
  const user = await getAuthUser();
  if (!user) return false;
  const { data } = await client.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return Boolean(data);
}
