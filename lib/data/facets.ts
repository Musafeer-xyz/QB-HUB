import type { QuestionFacets, QuestionListResult, QuestionQuery, QuestionRecord } from "@/lib/types";

/** Build the per-chapter / per-type / per-board counts shown in the sidebar. */
export function buildFacets(all: QuestionRecord[]): QuestionFacets {
  const chapterMap = new Map<number, QuestionFacets["chapters"][number]>();
  const typeMap = new Map<string, number>();
  const boardMap = new Map<string, number>();
  const starMap = new Map<number, number>();
  const topicMap = new Map<string, number>();
  let flagged = 0;
  let withImage = 0;
  let used = 0;
  let unused = 0;

  for (const q of all) {
    const entry = chapterMap.get(q.chapter) ?? { chapter: q.chapter, total: 0, cq: 0, sq: 0, mcq: 0 };
    entry.total += 1;
    if (q.type === "CQ") entry.cq += 1;
    else if (q.type === "SQ") entry.sq += 1;
    else entry.mcq += 1;
    chapterMap.set(q.chapter, entry);

    typeMap.set(q.type, (typeMap.get(q.type) ?? 0) + 1);
    for (const board of q.boards) boardMap.set(board, (boardMap.get(board) ?? 0) + 1);
    if (q.stars !== null) starMap.set(q.stars, (starMap.get(q.stars) ?? 0) + 1);
    if (q.topic) topicMap.set(q.topic, (topicMap.get(q.topic) ?? 0) + 1);
    if (q.flags.length > 0) flagged += 1;
    if (q.imagePath) withImage += 1;
    if ((q.usedInPapers ?? 0) > 0) used += 1;
    else unused += 1;
  }

  return {
    chapters: [...chapterMap.values()].sort((a, b) => a.chapter - b.chapter),
    types: [...typeMap.entries()]
      .map(([type, total]) => ({ type: type as QuestionFacets["types"][number]["type"], total }))
      .sort((a, b) => a.type.localeCompare(b.type)),
    boards: [...boardMap.entries()]
      .map(([board, total]) => ({ board, total }))
      .sort((a, b) => b.total - a.total || a.board.localeCompare(b.board)),
    stars: [...starMap.entries()]
      .map(([stars, total]) => ({ stars, total }))
      .sort((a, b) => a.stars - b.stars),
    topics: [...topicMap.entries()]
      .map(([topic, total]) => ({ topic, total }))
      .sort((a, b) => b.total - a.total || a.topic.localeCompare(b.topic)),
    total: all.length,
    flagged,
    withImage,
    used,
    unused,
  };
}

export function questionHaystack(q: QuestionRecord): string {
  const parts = [q.id, q.question ?? "", ...q.stem, ...q.parts.map((p) => p.text), q.imageDesc ?? ""];
  return parts.join(" ").toLowerCase();
}

/** In-memory filter + pagination (local/demo mode). */
export function filterQuestions(all: QuestionRecord[], query: QuestionQuery): QuestionListResult {
  const search = (query.search ?? "").trim().toLowerCase();

  const filtered = all.filter((q) => {
    if (query.subject && q.subject !== query.subject) return false;
    if (query.chapters && query.chapters.length > 0 && !query.chapters.includes(q.chapter)) return false;
    if (query.types && query.types.length > 0 && !query.types.includes(q.type)) return false;
    if (query.boards && query.boards.length > 0 && !query.boards.some((b) => q.boards.includes(b))) return false;
    if (query.stars != null && q.stars !== query.stars) return false;
    if (query.hasImage && !q.imagePath) return false;
    if (query.flagged && q.flags.length === 0) return false;
    if (search && !questionHaystack(q).includes(search)) return false;
    return true;
  });

  filtered.sort(
    (a, b) => a.chapter - b.chapter || a.type.localeCompare(b.type) || a.id.localeCompare(b.id),
  );

  const pageSize = query.pageSize ?? 20;
  const page = Math.max(1, query.page ?? 1);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    facets: buildFacets(all),
  };
}
