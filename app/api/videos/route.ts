import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";

export const dynamic = "force-dynamic";

/**
 * Public video list (no login required). Students have no session and no RLS
 * access to `videos`, so this reads with the service-role store and only ever
 * returns published entries — nothing admin-only exists on the payload.
 */
export async function GET() {
  try {
    const store = await getStore({ system: true });
    const videos = await store.listVideos({ publishedOnly: true });
    return NextResponse.json({ videos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ভিডিও লোড করা যায়নি।" },
      { status: 500 },
    );
  }
}
