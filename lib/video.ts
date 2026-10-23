import type { VideoInput, VideoRecord } from "@/lib/types";
import { EXAM_SECTIONS, OTHER_EXAM_SECTION, examSectionFor, type ExamSection } from "@/lib/subjects";

/**
 * YouTube helpers.
 *
 * Only the 11-character YouTube id is ever stored or placed in an iframe src;
 * everything else (channel links, playlists, javascript: URLs, stray text) is
 * rejected here before it can reach the database or a player.
 */

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function isYoutubeId(value: string): boolean {
  return ID_RE.test(value);
}

/**
 * Accept a bare id, youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID or
 * /embed/ID (with or without scheme/subdomain) and return the 11-char id.
 * Anything else returns null.
 */
export function parseYoutubeId(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;
  if (ID_RE.test(raw)) return raw;

  // Reject non-web schemes outright; a scheme-less host is treated as https.
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  const path = url.pathname.replace(/\/+$/, "");

  if (host === "youtu.be") {
    const id = path.split("/")[1] ?? "";
    return ID_RE.test(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "music.youtube.com" && host !== "youtube-nocookie.com") {
    return null;
  }
  if (path === "/watch") {
    const id = url.searchParams.get("v") ?? "";
    return ID_RE.test(id) ? id : null;
  }
  const match = /^\/(?:shorts|embed)\/([^/]+)$/.exec(path);
  const id = match?.[1] ?? "";
  return ID_RE.test(id) ? id : null;
}

/** Thumbnail for a stored id (validated by the write APIs). */
export function youtubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Privacy-friendly embed URL; the only thing ever put in an iframe src. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

/** Validated admin input; the YouTube link is reduced to its 11-char id. */
export type VideoInputResult =
  | { ok: true; values: VideoInput }
  | { ok: false; error: string };

export function videoInputFromBody(body: unknown): VideoInputResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const subject = typeof b.subject === "string" ? b.subject.trim() : "";
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const topic = typeof b.topic === "string" ? b.topic.trim() : "";
  const link =
    typeof b.youtubeId === "string" ? b.youtubeId : typeof b.url === "string" ? b.url : "";
  const youtubeId = parseYoutubeId(link);
  const position =
    typeof b.position === "number"
      ? Math.trunc(b.position)
      : typeof b.position === "string" && b.position.trim()
        ? Number(b.position)
        : 0;
  const published = typeof b.published === "boolean" ? b.published : true;

  if (!subject) return { ok: false, error: "বিষয় প্রয়োজন।" };
  if (!title) return { ok: false, error: "শিরোনাম প্রয়োজন।" };
  if (!youtubeId) return { ok: false, error: "সঠিক YouTube লিংক বা আইডি দিন।" };
  if (!Number.isInteger(position)) return { ok: false, error: "অবস্থান সংখ্যা হতে হবে।" };

  return { ok: true, values: { subject, topic, title, youtubeId, position, published } };
}

export type VideoTopicGroup = { topic: string; videos: VideoRecord[] };
export type VideoSectionGroup = { section: ExamSection; topics: VideoTopicGroup[] };

/**
 * Public video list grouped into the same fixed subject sections as the exam
 * list: every section is present, topics keep the store's order, and unknown
 * subjects land in the final section.
 */
export function groupVideosBySection(videos: VideoRecord[]): VideoSectionGroup[] {
  const buckets = new Map<string, Map<string, VideoRecord[]>>();
  for (const video of videos) {
    const section = examSectionFor(video.subject);
    const topics = buckets.get(section.id) ?? new Map<string, VideoRecord[]>();
    buckets.set(section.id, topics);
    const topic = video.topic.trim() || "সাধারণ";
    const list = topics.get(topic) ?? [];
    topics.set(topic, list);
    list.push(video);
  }

  return [...EXAM_SECTIONS, OTHER_EXAM_SECTION].map((section) => ({
    section,
    topics: [...(buckets.get(section.id) ?? new Map<string, VideoRecord[]>()).entries()].map(
      ([topic, list]) => ({ topic, videos: list }),
    ),
  }));
}
