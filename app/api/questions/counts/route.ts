import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { isAdminUser, getAuthUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import { SUBJECTS } from "@/lib/subjects";

/**
 * Question totals per registered subject, for the admin subject switcher's
 * "has data" indicator. One count query per subject (no rows), admin-only.
 */
export async function GET() {
  if (!isLocalMode()) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "লগইন প্রয়োজন।" }, { status: 401 });
    if (!(await isAdminUser())) return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 403 });
  }

  try {
    const store = await getStore();
    const totals = await Promise.all(
      SUBJECTS.map(async (s) => {
        const result = await store.listQuestions({ subject: s.id, page: 1, pageSize: 1 });
        return [s.id, result.total] as const;
      }),
    );
    return NextResponse.json({ counts: Object.fromEntries(totals) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "গণনা লোড করা যায়নি।" },
      { status: 500 },
    );
  }
}
