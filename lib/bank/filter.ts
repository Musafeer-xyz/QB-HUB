import { buildFacets, questionHaystack } from "@/lib/data/facets";
import type { QuestionFacets, QuestionRecord } from "@/lib/types";

/** Everything the workspace can filter by. All fields are plain data. */
export type BankFilters = {
  chapters: number[];
  types: string[];
  boards: string[];
  topics: string[];
  stars: number | null;
  hasImage: boolean;
  flagged: boolean;
  used: boolean | null;
  search: string;
};

export const EMPTY_FILTERS: BankFilters = {
  chapters: [],
  types: [],
  boards: [],
  topics: [],
  stars: null,
  hasImage: false,
  flagged: false,
  used: null,
  search: "",
};

export function activeFilterCount(filters: BankFilters): number {
  return (
    filters.chapters.length +
    filters.types.length +
    filters.boards.length +
    filters.topics.length +
    (filters.stars !== null ? 1 : 0) +
    (filters.hasImage ? 1 : 0) +
    (filters.flagged ? 1 : 0) +
    (filters.used !== null ? 1 : 0) +
    (filters.search.trim() ? 1 : 0)
  );
}

/**
 * Filter the whole bank in one pass. The workspace keeps the index in memory
 * and calls this on every filter change; with 1,000 questions it stays well
 * under the 100 ms budget (see `filter.test.ts`).
 */
export function filterBank(
  all: QuestionRecord[],
  filters: BankFilters,
  subject: string,
): QuestionRecord[] {
  const search = filters.search.trim().toLowerCase();
  const chapters = filters.chapters.length > 0 ? new Set(filters.chapters) : null;
  const types = filters.types.length > 0 ? new Set(filters.types) : null;
  const boards = filters.boards.length > 0 ? filters.boards : null;
  const topics = filters.topics.length > 0 ? new Set(filters.topics) : null;

  const out: QuestionRecord[] = [];
  for (const q of all) {
    if (q.subject !== subject) continue;
    if (chapters && !chapters.has(q.chapter)) continue;
    if (types && !types.has(q.type)) continue;
    if (boards && !boards.some((b) => q.boards.includes(b))) continue;
    if (topics && !topics.has(q.topic ?? "")) continue;
    if (filters.stars !== null && q.stars !== filters.stars) continue;
    if (filters.hasImage && !q.imagePath) continue;
    if (filters.flagged && q.flags.length === 0) continue;
    if (filters.used !== null) {
      const used = (q.usedInPapers ?? 0) > 0;
      if (filters.used && !used) continue;
      if (!filters.used && used) continue;
    }
    if (search && !questionHaystack(q).includes(search)) continue;
    out.push(q);
  }

  out.sort((a, b) => a.chapter - b.chapter || a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
  return out;
}

/** Facets for the rail, built once per subject (not on every keystroke). */
export function bankFacets(all: QuestionRecord[], subject: string): QuestionFacets {
  return buildFacets(all.filter((q) => q.subject === subject));
}

/**
 * Dense rows show one readable line, not raw TeX: delimiters and commands are
 * stripped (KaTeX is only rendered once a row is actually opened).
 */
export function plainMathPreview(text: string): string {
  return text
    .replace(/\$\$?([^$]*)\$\$?/g, (_, inner: string) => inner)
    .replace(/\\ce\{([^{}]*)\}/g, "$1")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\\rightarrow/g, "→")
    .replace(/\\leftarrow/g, "←")
    .replace(/\\rightleftharpoons/g, "⇌")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** First line of a question for the dense row (plain text, no KaTeX). */
export function rowPreview(question: QuestionRecord): string {
  const raw =
    question.question?.trim() ||
    question.stem.find((line) => line.trim())?.trim() ||
    question.parts[0]?.text?.trim() ||
    "";
  return plainMathPreview(raw).slice(0, 220);
}
