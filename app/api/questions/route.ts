import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { isAdminUser, getAuthUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import { availableImageFiles } from "@/lib/images-server";
import { DEFAULT_SUBJECT } from "@/lib/subjects";
import { isSubjectId } from "@/lib/admin-subject";

/**
 * Returns one subject's questions (with parts) plus the ids already used by
 * saved papers. Used by the paper builder and the command palette for
 * auto-generation, shuffling and "exclude questions used before". `?subject=`
 * selects the subject; a missing or unknown value means the default subject.
 * Admin-only.
 */
export async function GET(request: Request) {
  if (!isLocalMode()) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "লগইন প্রয়োজন।" }, { status: 401 });
    if (!(await isAdminUser())) return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 403 });
  }

  const requested = new URL(request.url).searchParams.get("subject");
  const subject = isSubjectId(requested) ? requested : DEFAULT_SUBJECT;

  try {
    const store = await getStore();
    const [result, usedIds] = await Promise.all([
      store.listQuestions({ subject, page: 1, pageSize: 1000 }),
      store.usedQuestionIds(),
    ]);
    const items = result.items;
    const images = await availableImageFiles(
      items.map((q) => q.imagePath).filter((p): p is string => Boolean(p)),
    );
    return NextResponse.json({
      subject,
      items,
      usedIds: [...usedIds],
      // Boards present in this subject only, so the builder's filter matches.
      boards: [...new Set(items.flatMap((q) => q.boards))].sort(),
      images: [...images],
      total: result.total,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "প্রশ্ন লোড করা যায়নি।" },
      { status: 500 },
    );
  }
}
