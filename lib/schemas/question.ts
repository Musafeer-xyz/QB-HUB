import { z } from "zod";

/** Question types. Only CQ/SQ exist today; MCQ is reserved for the future online exams. */
export const QUESTION_TYPES = ["CQ", "SQ", "MCQ"] as const;
export const questionTypeSchema = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof questionTypeSchema>;

/**
 * `string | null` with an explicit output type of `string | null`
 * (missing key and `null` both normalise to `null`).
 */
const nullableText = z
  .string()
  .nullable()
  .optional()
  .transform((v) => v ?? null);

/** Nullable positive integer, output type `number | null`. */
const nullableInt = (min: number, max: number) =>
  z
    .number()
    .int()
    .min(min)
    .max(max)
    .nullable()
    .optional()
    .transform((v) => v ?? null);

/**
 * Optional image file name. Source files use `""`, `"none"` and `null` to mean
 * "no image"; normalise all of them to `null`.
 */
const imageFile = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => {
    if (!v) return null;
    if (/^(none|null|-|—|n\/a)$/i.test(v)) return null;
    return v;
  });

export const questionPartSchema = z.object({
  label: z.string().trim().min(1, "পার্টের লেবেল দরকার"),
  marks: z.number().int().min(0, "নম্বর ঋণাত্মক হতে পারে না").max(100),
  text: z.string().trim().min(1, "পার্টের প্রশ্ন লিখুন"),
  answer: nullableText,
});
export type QuestionPartInput = z.infer<typeof questionPartSchema>;

/** Keys allowed on any question object in the source JSON files. */
export const KNOWN_QUESTION_KEYS = [
  "id",
  "subject",
  "chapter",
  "type",
  "stars",
  "boards",
  "topic",
  "question",
  "answer",
  "flags",
  "stem",
  "image",
  "image_desc",
  "parts",
  "options",
  "correct_option",
] as const;

const baseShape = {
  id: z
    .string()
    .regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/, "id শুধু অক্ষর/সংখ্যা ও হাইফেনে গঠিত হতে পারে"),
  subject: z.string().trim().min(1, "বিষয় দরকার"),
  chapter: z.number().int().min(1).max(99, "অধ্যায় ১–৯৯"),
  stars: nullableInt(1, 5),
  boards: z.array(z.string().trim().min(1)).default([]),
  topic: z.string().trim().nullable().optional().transform((v) => v ?? null),
  answer: nullableText,
  flags: z.array(z.string().trim().min(1)).default([]),
  options: z.array(z.string().trim().min(1)).nullable().optional().transform((v) => v ?? null),
  correct_option: nullableText,
};

export const sqQuestionSchema = z.object({
  ...baseShape,
  type: z.literal("SQ"),
  question: z.string().trim().min(1, "SQ প্রশ্নের টেক্সট দরকার"),
});
export type SqQuestion = z.infer<typeof sqQuestionSchema>;

export const cqQuestionSchema = z.object({
  ...baseShape,
  type: z.literal("CQ"),
  question: nullableText,
  stem: z.array(z.string()).default([]),
  image: imageFile,
  image_desc: nullableText,
  parts: z.array(questionPartSchema).min(1, "CQ-তে অন্তত একটি পার্ট দরকার"),
});
export type CqQuestion = z.infer<typeof cqQuestionSchema>;

/** Future-proof MCQ shape (schema only — nothing else is built for MCQ now). */
export const mcqQuestionSchema = z.object({
  ...baseShape,
  type: z.literal("MCQ"),
  question: z.string().trim().min(1),
  image: imageFile,
  image_desc: nullableText,
  options: z
    .array(z.string().trim().min(1))
    .min(2, "MCQ-তে অন্তত ২টি অপশন দরকার"),
  correct_option: nullableText,
});
export type McqQuestion = z.infer<typeof mcqQuestionSchema>;

export const questionSchema = z.discriminatedUnion("type", [
  sqQuestionSchema,
  cqQuestionSchema,
  mcqQuestionSchema,
]);
export type QuestionInput = z.infer<typeof questionSchema>;
/** Loose source shape: optional keys may be missing in the JSON files. */
export type QuestionSourceInput = z.input<typeof questionSchema>;

/** Parse one raw JSON item; returns a zod result so callers can print reasons. */
export function parseQuestion(raw: unknown): z.SafeParseReturnType<unknown, QuestionInput> {
  return questionSchema.safeParse(raw);
}

/** Flags in the source files are plain strings; the DB stores objects. */
export type QuestionFlag = {
  id: string;
  text: string;
  createdAt: string;
  resolvedAt?: string | null;
};

export const questionFlagSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  createdAt: z.string().min(1),
  resolvedAt: z.string().nullable().optional(),
});

/** Tolerant parser for the `flags` jsonb column (accepts legacy string arrays). */
export function parseFlags(raw: unknown): QuestionFlag[] {
  if (!Array.isArray(raw)) return [];
  const out: QuestionFlag[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      if (item.trim()) {
        out.push({ id: makeFlagId(item), text: item, createdAt: new Date().toISOString() });
      }
      continue;
    }
    const parsed = questionFlagSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/** Deterministic flag id so re-imports never duplicate the same warning. */
export function makeFlagId(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return `f${(hash >>> 0).toString(36)}`;
}
