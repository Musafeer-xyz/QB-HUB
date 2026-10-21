import type { PaperSettings } from "@/lib/schemas/paper";
import type { QuestionPartRecord, QuestionRecord } from "@/lib/types";

/** Default marks per short question (source SQ items carry no marks). */
export const DEFAULT_SQ_MARKS = 2;

/** Default marks per MCQ (reserved for the future online exams). */
export const DEFAULT_MCQ_MARKS = 1;

/**
 * Resolve which parts of a question count towards the marks.
 * `selectedParts` is an array of labels; empty / null / unknown = all parts.
 */
export function resolveParts(
  q: Pick<QuestionRecord, "parts">,
  selectedParts?: string[] | null,
): QuestionPartRecord[] {
  if (!selectedParts || selectedParts.length === 0) return q.parts;
  const wanted = new Set(selectedParts);
  const filtered = q.parts.filter((p) => wanted.has(p.label));
  // Unknown labels (e.g. stale selection) fall back to the full part list.
  return filtered.length > 0 ? filtered : q.parts;
}

/** Marks for a single question on a paper. */
export function questionMarks(
  q: Pick<QuestionRecord, "type" | "parts">,
  opts?: { selectedParts?: string[] | null; sqMarks?: number },
): number {
  switch (q.type) {
    case "CQ":
      return resolveParts(q, opts?.selectedParts).reduce((sum, p) => sum + p.marks, 0);
    case "SQ":
      return opts?.sqMarks ?? DEFAULT_SQ_MARKS;
    case "MCQ":
      return DEFAULT_MCQ_MARKS;
  }
}

export type MarkableSelection = {
  question: Pick<QuestionRecord, "type" | "parts">;
  selectedParts?: string[] | null;
};

/** Total marks of a paper from its selected questions and settings. */
export function paperTotalMarks(
  items: MarkableSelection[],
  settings: Pick<PaperSettings, "sqMarks">,
): number {
  return items.reduce(
    (sum, item) => sum + questionMarks(item.question, { selectedParts: item.selectedParts, sqMarks: settings.sqMarks }),
    0,
  );
}
