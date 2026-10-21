import { z } from "zod";
import { MARGIN_PRESETS } from "../paper/sizes";
import { questionTypeSchema } from "./question";

const nullableText = z
  .string()
  .nullable()
  .optional()
  .transform((v) => v ?? null);

/**
 * Paper-level settings stored in `papers.settings` (jsonb).
 * Everything a teacher can tweak in the generator lives here.
 */
export const paperSettingsSchema = z.object({
  /** Exam date as free text (e.g. "১০/০৩/২০২৬" or "১০ মার্চ ২০২৬"). */
  date: nullableText,
  /** Exam time, free text (e.g. "সকাল ১০টা–১২টা"). */
  time: nullableText,
  /** Optional logo shown in the paper header (URL or storage path). */
  logoUrl: nullableText,
  /** General instruction line printed under the header. */
  instructions: nullableText,
  /** Section choice instruction for CQ, e.g. "যেকোনো ৫টি প্রশ্নের উত্তর দাও". */
  cqInstruction: nullableText,
  /** Section choice instruction for SQ. */
  sqInstruction: nullableText,
  /** How many CQ questions a student answers (null = every selected question). */
  cqChoice: z.number().int().min(1).max(50).nullable().default(null),
  /** How many SQ questions a student answers (null = every selected question). */
  sqChoice: z.number().int().min(1).max(100).nullable().default(null),
  /** Marks awarded to each short question (SQ has no per-question marks in source data). */
  sqMarks: z.number().int().min(1).max(20).default(2),
  /** Column layout for the whole paper body. */
  columns: z.enum(["1", "2"]).default("1"),
  /** Thin vertical rule between the two columns. */
  columnDivider: z.boolean().default(false),
  /** Restart question numbering at ১ in every section. */
  restartNumbering: z.boolean().default(false),
  /** small | normal | large body text in the printed paper. */
  fontSize: z.enum(["small", "normal", "large"]).default("normal"),
  /** compact | normal vertical rhythm. */
  spacing: z.enum(["compact", "normal"]).default("normal"),
  /** Printed page size (A4 / A5 / B5 / Letter / Legal). */
  paperSize: z.enum(["A5", "A4", "B5", "Letter", "Legal"]).default("A4"),
  /**
   * Page margins: a named preset, or `custom` which uses `margins` as typed.
   * One shared `@page` rule (preview, window.print, server PDF) reads these.
   */
  marginPreset: z.enum(["narrow", "normal", "wide", "custom"]).default("normal"),
  /** Custom margins in millimetres; ignored while a preset is selected. */
  margins: z
    .object({
      top: z.number().min(0).max(40),
      right: z.number().min(0).max(40),
      bottom: z.number().min(0).max(40),
      left: z.number().min(0).max(40),
    })
    .default(() => ({ ...MARGIN_PRESETS.normal })),
  /** Max height of a question figure inside its column: 40 / 55 / 75 mm. */
  figureSize: z.enum(["small", "medium", "large"]).default("medium"),
  /** Keep a whole CQ (stem + figure + parts) in one column/page. */
  keepQuestionTogether: z.boolean().default(true),
  /** Class · subject · chapters on one line in the header. */
  compactHeader: z.boolean().default(false),
  /** Print `১ / ৩` in the bottom margin of every page. */
  showPageNumbers: z.boolean().default(true),
  /**
   * Suggestion sheets hide exam furniture by default. Each flag turns one
   * piece back on; exam mode ignores them entirely.
   */
  suggestion: z
    .object({
      showTime: z.boolean().default(false),
      showMarks: z.boolean().default(false),
      showInstructions: z.boolean().default(false),
      showChoice: z.boolean().default(false),
      showTotal: z.boolean().default(false),
    })
    .default(() => ({
      showTime: false,
      showMarks: false,
      showInstructions: false,
      showChoice: false,
      showTotal: false,
    })),
  /** Chapter line under the subject; auto-filled from the selection, editable. */
  chapterLabel: nullableText,
  /** Active set code printed in the header box (ক / খ). */
  setCode: z.string().trim().min(1).max(4).default("ক"),
  /** Print each question's board/year source tag. */
  showSource: z.boolean().default(false),
  /** Diagonal institution-name watermark under the text. */
  watermark: z.boolean().default(false),
  /** Manual page breaks: 1-based question numbers that start on a new page. */
  pageBreakBefore: z.array(z.number().int().min(1)).default([]),
  /** Master feature flag for printing answers. Off by default, never on in source data. */
  showAnswers: z.boolean().default(false),
  /** Section order on the paper. */
  sectionOrder: z.array(questionTypeSchema.exclude(["MCQ"])).default(["CQ", "SQ"]),
  /** exam = choice lines + choice-based total; suggestion = plain sheet. */
  mode: z.enum(["exam", "suggestion"]).default("exam"),
  /** chapter = heading + sections per chapter; type = one section per type. */
  grouping: z.enum(["chapter", "type"]).default("chapter"),
  /** Start every chapter (after the first) on a new page. */
  chapterPageBreak: z.boolean().default(false),
  /** Order questions inside a section: by id, or most-used-by-boards first. */
  sortBy: z.enum(["id", "boards"]).default("id"),
  /** Optional set-wise output: each set is an explicit question-id ordering. */
  sets: z
    .array(
      z.object({
        name: z.string().min(1),
        ids: z.array(z.string().min(1)),
      }),
    )
    .default([]),
});

export type PaperSettings = z.infer<typeof paperSettingsSchema>;
export type PaperSettingsInput = z.input<typeof paperSettingsSchema>;

export const defaultPaperSettings = (): PaperSettings =>
  paperSettingsSchema.parse({});

export const paperQuestionInputSchema = z.object({
  questionId: z.string().min(1),
  section: questionTypeSchema.nullable().default(null),
  /** CQ part labels to include; empty array = all parts. */
  selectedParts: z.array(z.string()).default([]),
});
export type PaperQuestionInput = z.infer<typeof paperQuestionInputSchema>;

export const paperInputSchema = z.object({
  title: z.string().trim().min(1, "পেপারের নাম দিন").max(200),
  institute: z.string().trim().max(200).default(""),
  examName: z.string().trim().max(200).default(""),
  className: z.string().trim().max(120).default(""),
  subject: z.string().trim().min(1).default("chemistry"),
  durationMinutes: z.number().int().min(0).max(600).nullable().default(null),
  totalMarks: z.number().min(0).max(2000),
  settings: paperSettingsSchema.default(() => defaultPaperSettings()),
  questions: z.array(paperQuestionInputSchema).min(1, "অন্তত একটি প্রশ্ন নির্বাচন করুন"),
});
export type PaperInput = z.infer<typeof paperInputSchema>;

/** Auto-generation rule: "chapter 6: 2 CQ, 5 SQ". */
export const autoRuleSchema = z.object({
  chapter: z.number().int().min(1).max(99),
  cq: z.number().int().min(0).max(50).default(0),
  sq: z.number().int().min(0).max(100).default(0),
});
export type AutoRule = z.infer<typeof autoRuleSchema>;

export const autoGenerateInputSchema = z.object({
  rules: z.array(autoRuleSchema).min(1, "অন্তত একটি নিয়ম দিন"),
  board: z.string().trim().min(1).nullable().default(null),
  excludeUsed: z.boolean().default(false),
  shuffle: z.boolean().default(true),
});
export type AutoGenerateInput = z.infer<typeof autoGenerateInputSchema>;
