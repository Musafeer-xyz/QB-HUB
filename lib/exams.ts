import type { AttemptRecord, ExamQuestion, ExamRecord, QuestionRecord } from "@/lib/types";
import { subjectChapterName } from "@/lib/subjects";

/**
 * Pure exam rules: grading, timing, payload shaping and grouping.
 *
 * Nothing here touches a store or the network, so the server rules
 * (correct answer never leaves before submission, fixed grace window, one
 * submission per attempt) are unit-testable without a database.
 */

/** Extra time allowed for network latency before a submit counts as late. */
export const EXAM_GRACE_MS = 10_000;

/** A question as sent to the student: never includes the correct option. */
export type PublicExamQuestion = {
  id: string;
  question: string | null;
  stem: string[];
  options: { label: string; text: string }[] | null;
};

/** Strip the answer key from stored questions before any student response. */
export function publicQuestions(questions: ExamQuestion[]): PublicExamQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    question: q.question,
    stem: q.stem,
    options: q.options,
  }));
}

export function deadlineAt(startedAt: string | Date, durationMin: number): number {
  const start = typeof startedAt === "string" ? Date.parse(startedAt) : startedAt.getTime();
  return start + durationMin * 60_000;
}

/** True once the attempt is past its duration + grace (answers may no longer arrive). */
export function isExpired(
  startedAt: string | Date,
  durationMin: number,
  now: number = Date.now(),
): boolean {
  return now > deadlineAt(startedAt, durationMin) + EXAM_GRACE_MS;
}

/** Server-timed countdown for the client; never negative. */
export function remainingSeconds(
  startedAt: string | Date,
  durationMin: number,
  now: number = Date.now(),
): number {
  return Math.max(0, Math.ceil((deadlineAt(startedAt, durationMin) - now) / 1000));
}

/** Grade only answers whose label exactly matches the stored correct option. */
export function gradeAnswers(
  questions: ExamQuestion[],
  answers: Record<string, unknown>,
): { score: number; total: number } {
  let score = 0;
  for (const q of questions) {
    const given = answers[q.id];
    if (typeof given === "string" && given.length > 0 && q.correctOption === given) score += 1;
  }
  return { score, total: questions.length };
}

/** What a submit request may do, decided without touching the store. */
export type SubmitDecision =
  | { action: "grade" }
  | { action: "auto-submit" }
  | { action: "already-submitted" };

export function submitDecision(
  attempt: Pick<AttemptRecord, "startedAt" | "submittedAt">,
  exam: Pick<ExamRecord, "durationMin">,
  now: number = Date.now(),
): SubmitDecision {
  if (attempt.submittedAt) return { action: "already-submitted" };
  if (isExpired(attempt.startedAt, exam.durationMin, now)) return { action: "auto-submit" };
  return { action: "grade" };
}

/** Problems that make a selection unusable as an exam, by question id. */
export type ExamQuestionProblems = { missing: string[]; notMcq: string[]; noAnswer: string[] };

export function examQuestionProblems(
  ids: string[],
  questions: (Pick<QuestionRecord, "id" | "type" | "correctOption"> | null)[],
): ExamQuestionProblems {
  const problems: ExamQuestionProblems = { missing: [], notMcq: [], noAnswer: [] };
  ids.forEach((id, i) => {
    const q = questions[i] ?? null;
    if (!q) problems.missing.push(id);
    else if (q.type !== "MCQ") problems.notMcq.push(id);
    else if (!q.correctOption) problems.noAnswer.push(id);
  });
  return problems;
}

export function hasProblems(problems: ExamQuestionProblems): boolean {
  return problems.missing.length + problems.notMcq.length + problems.noAnswer.length > 0;
}

/** Human-readable rejection message listing the offending question ids. */
export function problemsMessage(problems: ExamQuestionProblems): string {
  const parts: string[] = [];
  if (problems.missing.length > 0) {
    parts.push(`এই প্রশ্নগুলো পাওয়া যায়নি: ${problems.missing.join(", ")}`);
  }
  if (problems.notMcq.length > 0) {
    parts.push(`এই প্রশ্নগুলো MCQ নয়: ${problems.notMcq.join(", ")}`);
  }
  if (problems.noAnswer.length > 0) {
    parts.push(`এই প্রশ্নগুলোর সঠিক উত্তর নেই: ${problems.noAnswer.join(", ")}`);
  }
  return parts.join("। ") || "";
}

/** Exams whose selected MCQs span chapters are stored as chapter 0, labelled মিশ্র. */
export const MIXED_CHAPTER = 0;

export function examChapterLabel(subject: string, chapter: number): string {
  return chapter === MIXED_CHAPTER ? "মিশ্র" : subjectChapterName(subject, chapter);
}

export type ExamChapterGroup = { chapter: number; exams: ExamRecord[] };
export type ExamSubjectGroup = { subject: string; chapters: ExamChapterGroup[] };

/** Group open exams Subject -> Chapter, both sorted ascending. */
export function groupOpenExams(exams: ExamRecord[]): ExamSubjectGroup[] {
  const bySubject = new Map<string, Map<number, ExamRecord[]>>();
  for (const exam of exams) {
    if (!exam.isOpen) continue;
    const chapters = bySubject.get(exam.subject) ?? new Map<number, ExamRecord[]>();
    bySubject.set(exam.subject, chapters);
    const list = chapters.get(exam.chapter) ?? [];
    chapters.set(exam.chapter, list);
    list.push(exam);
  }
  return [...bySubject.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([subject, chapters]) => ({
      subject,
      chapters: [...chapters.entries()]
        .sort(([a], [b]) => a - b)
        .map(([chapter, list]) => ({ chapter, exams: list })),
    }));
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Results CSV, best score first (same order as the admin results table). */
export function attemptsCsv(attempts: AttemptRecord[]): string {
  const sorted = [...attempts].sort(
    (a, b) => b.score - a.score || (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""),
  );
  const header = ["Name", "ID", "Score", "Total", "Submitted At"];
  const rows = sorted.map((a) =>
    [a.studentName, a.studentId, a.score, a.total, a.submittedAt].map(csvCell).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
