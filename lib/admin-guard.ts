import { NextResponse } from "next/server";
import { isLocalMode } from "@/lib/mode";
import { getAuthUser, isAdminUser } from "@/lib/supabase/server";

/**
 * The one admin gate for API route handlers.
 *
 * Admin APIs were previously copy-guarded handler by handler, which is easy to
 * forget on a new verb. This is a route-level check (not a middleware prefix):
 * a prefix would also match the public student endpoints under
 * `/api/exams/[id]/start` and `/api/attempts/[id]`.
 *
 * Local mode (no Supabase Auth) allows everything, exactly as before.
 */
export type AdminDecision = "allow" | "login" | "forbidden";

export function adminDecision(input: {
  local: boolean;
  signedIn: boolean;
  admin: boolean;
}): AdminDecision {
  if (input.local) return "allow";
  if (!input.signedIn) return "login";
  return input.admin ? "allow" : "forbidden";
}

/** Null when the caller may proceed, otherwise the 401/403 JSON response. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const local = isLocalMode();
  if (local) return null;

  const user = await getAuthUser();
  const decision = adminDecision({
    local,
    signedIn: Boolean(user),
    admin: user ? await isAdminUser() : false,
  });

  if (decision === "allow") return null;
  return decision === "login"
    ? NextResponse.json({ error: "লগইন প্রয়োজন।" }, { status: 401 })
    : NextResponse.json({ error: "অনুমতি নেই।" }, { status: 403 });
}
