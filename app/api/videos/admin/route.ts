import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getStore } from "@/lib/data/store";
import { videoInputFromBody } from "@/lib/video";

export const dynamic = "force-dynamic";

/** List every video, drafts included (admin only). */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const store = await getStore();
    const videos = await store.listVideos();
    return NextResponse.json({ videos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ভিডিও লোড করা যায়নি।" },
      { status: 500 },
    );
  }
}

/** Create a video from a pasted YouTube link (admin only). */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const parsed = videoInputFromBody(await req.json().catch(() => ({})));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const store = await getStore();
    const video = await store.createVideo(parsed.values);
    return NextResponse.json({ video });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ভিডিও তৈরি করা যায়নি।" },
      { status: 500 },
    );
  }
}
