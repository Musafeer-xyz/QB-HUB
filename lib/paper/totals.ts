import { questionMarks } from "@/lib/marks";
import { sectionsTotal, summarizeSection, type SectionType } from "@/lib/paper/sections";
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
  settings: Pick<PaperSettings, "sqMarks" | "cqChoice" | "sqChoice" | "mcqChoice"> & {
    mode?: PaperSettings["mode"];
  },
): number {
  const marks: Record<SectionType, number[]> = { CQ: [], SQ: [], MCQ: [] };
  const chapters: Record<SectionType, Set<number>> = { CQ: new Set(), SQ: new Set(), MCQ: new Set() };

  for (const q of questions) {
    const record = all.get(q.questionId);
    if (!record) continue;
    const type: SectionType =
      q.section === "CQ" || q.section === "SQ" || q.section === "MCQ" ? q.section : record.type;
    marks[type].push(questionMarks(record, { selectedParts: q.selectedParts, sqMarks: settings.sqMarks }));
    chapters[type].add(record.chapter);
  }

  const choiceFor = (type: SectionType): number | null => {
    if (settings.mode === "suggestion") return null;
    if (chapters[type].size > 1) return null;
    if (type === "CQ") return settings.cqChoice;
    if (type === "SQ") return settings.sqChoice;
    return settings.mcqChoice;
  };

  return sectionsTotal([
    summarizeSection("CQ", marks.CQ, choiceFor("CQ")),
    summarizeSection("SQ", marks.SQ, choiceFor("SQ")),
    summarizeSection("MCQ", marks.MCQ, choiceFor("MCQ")),
  ]);
}
