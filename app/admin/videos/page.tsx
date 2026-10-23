import Link from "next/link";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { getAuthUser, isAdminUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import { VideoAdmin } from "./video-admin";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  if (!isLocalMode()) {
    const user = await getAuthUser();
    if (!user) redirect("/admin");
    if (!(await isAdminUser())) redirect("/admin");
  }

  const store = await getStore();
  const videos = await store.listVideos();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ভিডিও তালিকা</h1>
        <Link href="/videos" className="btn-secondary">
          পাবলিক পেজ
        </Link>
      </div>
      <VideoAdmin initialVideos={videos} />
    </div>
  );
}
