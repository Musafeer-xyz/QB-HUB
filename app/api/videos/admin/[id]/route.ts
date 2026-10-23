import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getStore } from "@/lib/data/store";
import { videoInputFromBody } from "@/lib/video";

export const dynamic = "force-dynamic";

/** Update one video (admin only). The body is the full editable record. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const parsed = videoInputFromBody(await req.json().catch(() => ({})));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const store = await getStore();
    const video = await store.updateVideo(id, parsed.values);
    return NextResponse.json({ video });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ভিডিও হালনাগাদ করা যায়নি।" },
      { status: 500 },
    );
  }
}

/** Delete one video (admin only). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const store = await getStore();
    await store.deleteVideo(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ভিডিও মুছে ফেলা যায়নি।" },
      { status: 500 },
    );
  }
}
