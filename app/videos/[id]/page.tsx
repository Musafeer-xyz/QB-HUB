import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandHeader } from "@/components/brand-header";
import { getStore } from "@/lib/data/store";
import { BRAND_NAME } from "@/lib/brand";
import { isYoutubeId, youtubeEmbedUrl } from "@/lib/video";
import { examSectionFor } from "@/lib/subjects";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: BRAND_NAME };

/** Public player page: only a published video with a validated id is embedded. */
export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore({ system: true });
  const video = await store.getVideo(id);

  if (!video || !video.published || !isYoutubeId(video.youtubeId)) notFound();

  const section = examSectionFor(video.subject);

  return (
    <div className="min-h-screen bg-[#F6F5F2]">
      <BrandHeader />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Link href="/videos" className="mb-4 inline-block text-sm text-muted hover:text-ink">
          ← ভিডিও তালিকা
        </Link>

        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <div className="aspect-video w-full bg-black">
            <iframe
              src={youtubeEmbedUrl(video.youtubeId)}
              title={video.title}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
          <div className="p-4">
            <h1 className="text-xl font-bold text-ink">{video.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span className="font-medium" style={{ color: section.accent }}>
                {section.english}
              </span>
              <span aria-hidden="true">·</span>
              <span>{section.bangla}</span>
              {video.topic ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{video.topic}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
