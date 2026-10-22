import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { isAdminUser, getAuthUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";

/**
 * Get results for an exam (admin only).
 * Returns list of attempts with score, sorted by score desc.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isLocalMode()) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "লগইন প্রয়োজন।" }, { status: 401 });
    if (!(await isAdminUser())) return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const store = await getStore();
    const attempts = await store.listAttempts(id);
    return NextResponse.json({ attempts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ফলাফল লোড করা যায়নি।" },
      { status: 500 },
    );
  }
}
