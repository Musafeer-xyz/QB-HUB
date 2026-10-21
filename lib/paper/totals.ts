import { questionMarks } from "@/lib/marks";
import { sectionsTotal, summarizeSection } from "@/lib/paper/sections";
import type { PaperSettings } from "@/lib/schemas/paper";
import type { QuestionRecord } from "@/lib/types";

/**
 * Recompute a paper's total from the selected questions + settings.
 * Shared by the server actions so the client can never fake the total.
 *
 * The total is what a student answers for: choice × marks in a section when
 * every question there has the same marks, otherwise the plain sum. A
 * suggestion sheet — or a type split across chapters — prints every question,
 * so its total is the plain sum.
 */
export function computeTotalMarks(
  questions: { questionId: string; section?: string | null; selectedParts: string[] }[],
  all: Map<string, QuestionRecord>,
  settings: Pick<PaperSettings, "sqMarks" | "cqChoice" | "sqChoice"> & {
    mode?: PaperSettings["mode"];
  },
): number {
  const marks: Record<"CQ" | "SQ", number[]> = { CQ: [], SQ: [] };
  const chapters: Record<"CQ" | "SQ", Set<number>> = { CQ: new Set(), SQ: new Set() };

  for (const q of questions) {
    const record = all.get(q.questionId);
    if (!record) continue;
    const type = q.section === "CQ" || q.section === "SQ" ? q.section : record.type;
    if (type !== "CQ" && type !== "SQ") continue;
    marks[type].push(questionMarks(record, { selectedParts: q.selectedParts, sqMarks: settings.sqMarks }));
    chapters[type].add(record.chapter);
  }

  const choiceFor = (type: "CQ" | "SQ"): number | null => {
    if (settings.mode === "suggestion") return null;
    if (chapters[type].size > 1) return null;
    return type === "CQ" ? settings.cqChoice : settings.sqChoice;
  };

  const cq = summarizeSection("CQ", marks.CQ, choiceFor("CQ"));
  const sq = summarizeSection("SQ", marks.SQ, choiceFor("SQ"));
  return sectionsTotal([cq, sq]);
}
