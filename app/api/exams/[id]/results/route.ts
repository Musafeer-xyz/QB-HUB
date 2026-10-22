import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { requireAdmin } from "@/lib/admin-guard";

/**
 * Get results for an exam (admin only).
 * Returns list of attempts with score, sorted by score desc.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

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
