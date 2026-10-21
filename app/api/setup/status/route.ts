import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";

/** Whether a first-run admin already exists (and whether auth is active). */
export async function GET() {
  if (isLocalMode()) {
    return NextResponse.json({ hasAdmin: true, authEnabled: false });
  }
  const client = createSupabaseAdminClient();
  if (!client) {
    return NextResponse.json({ hasAdmin: false, authEnabled: true, serviceConfigured: false });
  }
  const { data, error } = await client.from("admins").select("user_id").limit(1);
  return NextResponse.json({
    hasAdmin: Boolean(data && data.length > 0),
    authEnabled: true,
    serviceConfigured: true,
    error: error?.message,
  });
}
