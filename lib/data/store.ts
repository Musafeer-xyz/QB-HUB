import type { PaperSettings, PaperSettingsInput } from "@/lib/schemas/paper";
import type { QuestionType } from "@/lib/schemas/question";
import type { DbQuestion } from "@/lib/import/plan";
import type { DataMode } from "@/lib/mode";
import type {
  AttemptRecord,
  AttemptResult,
  ExamRecord,
  ExamQuestion,
  PaperRecord,
  QuestionListResult,
  QuestionQuery,
  QuestionRecord,
  VideoInput,
  VideoRecord,
} from "@/lib/types";

/** Values the admin question editor works with. */
export type QuestionFormValues = {
  id: string;
  subject: string;
  chapter: number;
  type: QuestionType;
  stars: number | null;
  boards: string[];
  question: string | null;
  stem: string[];
  image: string | null;
  image_desc: string | null;
  answer: string | null;
  /** MCQ choices (ক খ গ ঘ), null for CQ/SQ. */
  options: { label: string; text: string }[] | null;
  /** Printed answer label (ক/খ/গ/ঘ or none); admin-only, never printed. */
  correctOption: string | null;
  parts: { label: string; marks: number; text: string; answer: string | null }[];
};

/** Values the paper builder works with. */
export type PaperFormValues = {
  title: string;
  institute: string;
  examName: string;
  className: string;
  subject: string;
  durationMinutes: number | null;
  totalMarks: number;
  settings: PaperSettingsInput;
  questions: { questionId: string; section: QuestionType | null; selectedParts: string[] }[];
};

/**
 * The single data-access surface used by server components, server actions and
 * API routes. Two implementations: Supabase (production) and local JSON
 * (development/demo). All reads in Supabase mode run with the caller's own
 * session, so Row Level Security is always enforced.
 */
export type Store = {
  mode: DataMode;
  listQuestions(query: QuestionQuery): Promise<QuestionListResult>;
  getQuestion(id: string): Promise<QuestionRecord | null>;
  createQuestion(values: QuestionFormValues): Promise<QuestionRecord>;
  updateQuestion(id: string, values: QuestionFormValues): Promise<QuestionRecord>;
  deleteQuestion(id: string): Promise<void>;
  /**
   * Write already-validated import entries by id. Idempotent: existing rows are
   * replaced with exactly the given data, missing rows are inserted.
   */
  importQuestions(questions: DbQuestion[]): Promise<{ inserted: number; updated: number }>;
  /** Remove one admin-only warning flag from a question. */
  resolveFlag(id: string, flagId: string): Promise<void>;
  listBoards(): Promise<string[]>;
  /** Question ids used by any saved paper (for the "exclude used" option). */
  usedQuestionIds(): Promise<Set<string>>;
  listPapers(): Promise<PaperRecord[]>;
  getPaper(id: string): Promise<PaperRecord | null>;
  createPaper(values: PaperFormValues, createdBy: string | null): Promise<PaperRecord>;
  updatePaper(id: string, values: PaperFormValues): Promise<PaperRecord>;
  deletePaper(id: string): Promise<void>;
  duplicatePaper(id: string, createdBy: string | null): Promise<PaperRecord>;
  // ---------------------------------------------------------------------------
  // Exam methods
  // ---------------------------------------------------------------------------
  listExams(): Promise<ExamRecord[]>;
  getExam(id: string): Promise<ExamRecord | null>;
  createExam(exam: Omit<ExamRecord, "id" | "createdAt">): Promise<ExamRecord>;
  updateExam(id: string, updates: Partial<Pick<ExamRecord, "title" | "isOpen">>): Promise<ExamRecord>;
  deleteExam(id: string): Promise<void>;
  getExamQuestions(examId: string): Promise<ExamQuestion[]>;
  listAttempts(examId: string): Promise<AttemptRecord[]>;
  getAttempt(id: string): Promise<AttemptRecord | null>;
  createAttempt(attempt: Omit<AttemptRecord, "id" | "score" | "total">): Promise<AttemptRecord>;
  updateAttempt(id: string, updates: Partial<Pick<AttemptRecord, "submittedAt" | "answers" | "score" | "total">>): Promise<AttemptRecord>;
  getAttemptResult(attemptId: string): Promise<AttemptResult | null>;
  /**
   * Delete attempts that belong to `examId`; ids of other exams are ignored.
   * Returns how many rows were actually removed.
   */
  deleteAttempts(examId: string, ids: string[]): Promise<number>;
  // ---------------------------------------------------------------------------
  // Video methods
  // ---------------------------------------------------------------------------
  /** Published videos only, or every video for the admin list. */
  listVideos(opts?: { publishedOnly?: boolean }): Promise<VideoRecord[]>;
  getVideo(id: string): Promise<VideoRecord | null>;
  createVideo(video: VideoInput): Promise<VideoRecord>;
  updateVideo(id: string, updates: Partial<VideoInput>): Promise<VideoRecord>;
  deleteVideo(id: string): Promise<void>;
};

export type { PaperRecord, PaperSettings, QuestionListResult, QuestionQuery, QuestionRecord };

/**
 * Lazily create the right store for the configured data source.
 * `system: true` uses the service-role client (trusted server contexts only,
 * e.g. rendering a PDF for a signed print token).
 */
export async function getStore(opts: { system?: boolean } = {}): Promise<Store> {
  const { getDataMode } = await import("@/lib/mode");
  if (getDataMode() === "local") {
    const { localStore } = await import("@/lib/data/local-store");
    return localStore();
  }
  const { supabaseStore } = await import("@/lib/data/supabase-store");
  return supabaseStore({ system: opts.system === true });
}

/** Empty settings object with defaults applied. */
export async function defaultSettings(): Promise<PaperSettings> {
  const { defaultPaperSettings } = await import("@/lib/schemas/paper");
  return defaultPaperSettings();
}
