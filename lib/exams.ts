import type { AttemptRecord, ExamQuestion, ExamRecord, QuestionRecord } from "@/lib/types";
import {
  EXAM_SECTIONS,
  OTHER_EXAM_SECTION,
  examSectionFor,
  subjectChapterName,
  type ExamSection,
} from "@/lib/subjects";

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

/** Deterministic shuffle: the same seed always gives the same order. */
export function seededOrder<T>(items: T[], seed: string): T[] {
  // FNV-1a turns the seed string into a 32-bit state; mulberry32 drives the shuffle.
  let state = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Per-attempt question order.
 *
 * Questions sharing a stem text stay together and in their original relative
 * order (stem sub-parts are read as one block); a question without a stem is
 * its own group. Only the groups are shuffled, seeded by the attempt id, so a
 * refresh or resume always shows the same order while attempts differ.
 */
export function seededQuestionOrder<T extends { id: string; stem: string[] }>(
  questions: T[],
  attemptId: string,
): T[] {
  const groups = new Map<string, T[]>();
  for (const q of questions) {
    const key = q.stem.join("\n") || `#${q.id}`;
    const group = groups.get(key) ?? [];
    groups.set(key, group);
    group.push(q);
  }
  return seededOrder([...groups.keys()], attemptId).flatMap((key) => groups.get(key)!);
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

/** One question of a submitted attempt, with the student's choice and its verdict. */
export type AttemptQuestionRow = ExamQuestion & {
  studentAnswer: string | null;
  isCorrect: boolean;
};

/**
 * Rebuild an attempt's per-question review from the answers stored on the
 * attempt. Uses the same rule as `gradeAnswers` (a non-empty label equal to the
 * stored correct option), so the admin detail can never disagree with the score.
 */
export function attemptQuestionRows(
  questions: ExamQuestion[],
  answers: Record<string, string>,
): AttemptQuestionRow[] {
  return questions.map((q) => {
    const given = answers[q.id];
    const studentAnswer = typeof given === "string" && given.length > 0 ? given : null;
    return {
      ...q,
      studentAnswer,
      isCorrect: studentAnswer !== null && studentAnswer === q.correctOption,
    };
  });
}

/** Manual bulk deletes are chunked so one call never deletes more than this. */
export const MAX_ATTEMPT_DELETE = 200;

/** How old an attempt must be for the admin's “পুরনো সব মুছুন” cleanup. */
export const OLD_ATTEMPTS_DAYS = 15;

/** ISO timestamp: attempts finished (or started) before it count as old. */
export function attemptsOlderThanCutoff(days: number, now: number = Date.now()): string {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

/** When an attempt counts for cleanup: its submit time, else its start time. */
export function attemptTime(attempt: Pick<AttemptRecord, "submittedAt" | "startedAt">): string {
  return attempt.submittedAt ?? attempt.startedAt;
}

/** Ids of the attempts that finished (or started) before the cutoff. */
export function oldAttemptIds(
  attempts: AttemptRecord[],
  cutoffIso: string,
): string[] {
  const cutoff = Date.parse(cutoffIso);
  if (!Number.isFinite(cutoff)) return [];
  return attempts
    .filter((attempt) => {
      const at = Date.parse(attemptTime(attempt));
      return Number.isFinite(at) && at < cutoff;
    })
    .map((attempt) => attempt.id);
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

/**
 * Which bank the “new exam” button opens. Exams are built from MCQs only, so the
 * active subject is used when it has any; otherwise the first registered subject
 * that does. With no MCQ anywhere the active subject is kept, so the button
 * still works and the bank shows its own empty state.
 */
export function pickExamBankSubject(
  active: string,
  registered: string[],
  mcqCounts: Record<string, number>,
): string {
  if ((mcqCounts[active] ?? 0) > 0) return active;
  return registered.find((id) => (mcqCounts[id] ?? 0) > 0) ?? active;
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

/**
 * Public exam list grouped into the fixed subject order. Every section is
 * present even with no exams, unknown subjects go last, and chapters keep
 * their existing grouping inside a section.
 */
export type ExamSectionGroup = { section: ExamSection; chapters: ExamChapterGroup[] };

export function groupOpenExamsBySection(exams: ExamRecord[]): ExamSectionGroup[] {
  const buckets = new Map<string, Map<number, ExamRecord[]>>();
  for (const group of groupOpenExams(exams)) {
    const section = examSectionFor(group.subject);
    const chapters = buckets.get(section.id) ?? new Map<number, ExamRecord[]>();
    buckets.set(section.id, chapters);
    for (const { chapter, exams: chapterExams } of group.chapters) {
      const list = chapters.get(chapter) ?? [];
      chapters.set(chapter, list);
      list.push(...chapterExams);
    }
  }

  return [...EXAM_SECTIONS, OTHER_EXAM_SECTION].map((section) => ({
    section,
    chapters: [...(buckets.get(section.id) ?? new Map<number, ExamRecord[]>()).entries()]
      .sort(([a], [b]) => a - b)
      .map(([chapter, list]) => ({ chapter, exams: list })),
  }));
}

/** Exams in one subject section, across its chapters. */
export function examCount(group: ExamSectionGroup): number {
  return group.chapters.reduce((total, chapter) => total + chapter.exams.length, 0);
}

/**
 * Chips for the public exam list: every fixed subject section, plus OTHER only
 * when it actually holds exams (otherwise it would be a permanently dead tab).
 */
export function examTabs(sections: ExamSectionGroup[]): ExamSectionGroup[] {
  return sections.filter(
    (group) => group.section.id !== OTHER_EXAM_SECTION.id || examCount(group) > 0,
  );
}

/**
 * Which tab `?s=` selects: the requested one when it is a visible tab, else the
 * first tab that has exams, else the first tab — so exactly one subject is
 * always shown and a stale or junk parameter can never blank the page.
 */
export function selectedExamTab(
  sections: ExamSectionGroup[],
  requested: string | null | undefined,
): ExamSectionGroup | null {
  const tabs = examTabs(sections);
  const wanted = requested?.trim().toLowerCase();
  const match = wanted ? tabs.find((group) => group.section.id === wanted) : undefined;
  if (match) return match;
  return tabs.find((group) => examCount(group) > 0) ?? tabs[0] ?? null;
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
