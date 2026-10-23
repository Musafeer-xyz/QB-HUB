import type { Metadata } from "next";
import { BrandHeader } from "@/components/brand-header";
import { getStore } from "@/lib/data/store";
import { BRAND_NAME } from "@/lib/brand";
import { groupVideosBySection, youtubeThumbnailUrl } from "@/lib/video";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: BRAND_NAME,
};

/**
 * Public video library. Only published videos are read (service role, since
 * students have no session). Sections follow the same fixed subject order as
 * the exam list; clicking a card opens /videos/[id].
 */
export default async function VideosPage() {
  const store = await getStore({ system: true });
  const sections = groupVideosBySection(await store.listVideos({ publishedOnly: true }));

  return (
    <div className="min-h-screen bg-[#F6F5F2]">
      <BrandHeader />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-ink">ভিডিও ক্লাস</h1>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.25em] text-muted">VIDEO</p>
        </div>

        <div className="space-y-6">
          {sections.map(({ section, topics }) => (
            <section
              key={section.id}
              data-video-section={section.id}
              className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
            >
              <div
                className="flex items-center gap-3 border-b px-4 py-3"
                style={{ borderColor: `${section.accent}33`, backgroundColor: `${section.accent}12` }}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: section.accent }}
                  aria-hidden="true"
                />
                <h2 className="text-sm font-bold tracking-[0.18em]" style={{ color: section.accent }}>
                  {section.english}
                </h2>
                <span className="text-sm text-muted">{section.bangla}</span>
              </div>

              <div className="px-4 py-4">
                {topics.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-muted">
                    শীঘ্রই আসছে
                  </p>
                ) : (
                  <div className="space-y-6">
                    {topics.map(({ topic, videos }) => (
                      <div key={topic}>
                        <h3 className="mb-3 text-lg font-medium">{topic}</h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {videos.map((video) => (
                            <a
                              key={video.id}
                              href={`/videos/${video.id}`}
                              className="group block overflow-hidden rounded-lg border border-line bg-surface shadow-sm transition-shadow hover:shadow-md"
                            >
                              {/* Thumbnail only; the player loads on the video page. */}
                              <img
                                src={youtubeThumbnailUrl(video.youtubeId)}
                                alt=""
                                width={480}
                                height={360}
                                loading="lazy"
                                className="aspect-video w-full object-cover"
                              />
                              <p className="p-3 text-sm font-semibold text-ink group-hover:underline">
                                {video.title}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
