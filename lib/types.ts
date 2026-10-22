import type { QuestionOption, QuestionPartInput, QuestionType, QuestionFlag } from "@/lib/schemas/question";
import type { PaperSettings } from "@/lib/schemas/paper";

/** A question part as stored in `question_parts`. */
export type QuestionPartRecord = QuestionPartInput & {
  questionId: string;
  position: number;
};

/** A question joined with its parts, as consumed by every UI surface. */
export type QuestionRecord = {
  id: string;
  subject: string;
  chapter: number;
  type: QuestionType;
  stars: number | null;
  boards: string[];
  topic?: string | null;
  question: string | null;
  stem: string[];
  imagePath: string | null;
  imageDesc: string | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  flags: QuestionFlag[];
  answer: string | null;
  options: QuestionOption[] | null;
  correctOption: string | null;
  parts: QuestionPartRecord[];
  createdAt?: string;
  updatedAt?: string;
  usedInPapers?: number;
};

export type PaperQuestionRecord = {
  questionId: string;
  position: number;
  section: QuestionType | null;
  /** Empty array = all parts selected. */
  selectedParts: string[];
};

export type PaperRecord = {
  id: string;
  title: string;
  institute: string;
  examName: string;
  className: string;
  subject: string;
  durationMinutes: number | null;
  totalMarks: number;
  settings: PaperSettings;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  questions: PaperQuestionRecord[];
};

/** Filter parameters accepted by the question-bank list. */
export type QuestionQuery = {
  subject?: string | null;
  chapters?: number[];
  types?: QuestionType[];
  boards?: string[];
  stars?: number | null;
  hasImage?: boolean;
  flagged?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type QuestionFacets = {
  chapters: { chapter: number; total: number; cq: number; sq: number; mcq: number }[];
  types: { type: QuestionType; total: number }[];
  boards: { board: string; total: number }[];
  stars: { stars: number; total: number }[];
  topics: { topic: string; total: number }[];
  total: number;
  flagged: number;
  withImage: number;
  used: number;
  unused: number;
};

export type QuestionListResult = {
  items: QuestionRecord[];
  total: number;
  page: number;
  pageSize: number;
  facets: QuestionFacets;
};
