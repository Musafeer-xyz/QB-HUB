import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { isAdminUser, getAuthUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import { availableImageFiles } from "@/lib/images-server";

/**
 * Returns every question (with parts) plus the ids already used by saved
 * papers. Used by the paper builder for auto-generation, shuffling and
 * "exclude questions used before". Admin-only.
 */
export async function GET() {
  if (!isLocalMode()) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "লগইন প্রয়োজন।" }, { status: 401 });
    if (!(await isAdminUser())) return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 403 });
  }

  try {
    const store = await getStore();
    const [result, usedIds, boards] = await Promise.all([
      store.listQuestions({ subject: "chemistry", page: 1, pageSize: 1000 }),
      store.usedQuestionIds(),
      store.listBoards(),
    ]);
    const images = await availableImageFiles(
      result.items.map((q) => q.imagePath).filter((p): p is string => Boolean(p)),
    );
    return NextResponse.json({
      items: result.items,
      usedIds: [...usedIds],
      boards,
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
