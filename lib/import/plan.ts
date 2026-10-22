import {
  KNOWN_QUESTION_KEYS,
  makeFlagId,
  parseFlags,
  parseQuestion,
  type QuestionFlag,
  type QuestionPartInput,
} from "@/lib/schemas/question";
import { collectMathErrors, questionTextFields } from "@/lib/render/rich-text";
import type { QuestionInput, QuestionOption, QuestionType } from "@/lib/schemas/question";

/** Flags auto-added by the importer for malformed LaTeX. */
export const AUTO_FLAG_PREFIX = "LaTeX পার্স করা যায়নি:";

export type DbQuestion = {
  id: string;
  subject: string;
  chapter: number;
  type: QuestionType;
  stars: number | null;
  boards: string[];
  question: string | null;
  stem: string[];
  image_path: string | null;
  image_desc: string | null;
  flags: QuestionFlag[];
  answer: string | null;
  options: QuestionOption[] | null;
  correct_option: string | null;
  parts: (QuestionPartInput & { position: number })[];
};

export type ExistingQuestion = {
  id: string;
  subject: string;
  chapter: number;
  type: string;
  stars: number | null;
  boards: string[];
  question: string | null;
  stem: string[];
  image_path: string | null;
  image_desc: string | null;
  flags: unknown;
  answer: string | null;
  options: QuestionOption[] | null;
  correct_option: string | null;
  parts: { label: string; marks: number; text: string; answer: string | null }[];
};

export type ImportAction = "insert" | "update" | "unchanged" | "skipped";

export type ImportEntry = {
  file: string;
  index: number;
  id: string;
  action: ImportAction;
  /** Bangla reason, always set for `skipped`. */
  reason?: string;
  question?: DbQuestion;
  /** Flags added automatically (malformed LaTeX). */
  autoFlags: string[];
  /** Non-fatal notes, e.g. image file missing on disk. */
  warnings: string[];
  /** Image file name (if any) and whether it exists in `<data>/images`. */
  image?: { file: string; present: boolean };
};

export type ImportPlan = {
  entries: ImportEntry[];
  totals: {
    items: number;
    insert: number;
    update: number;
    unchanged: number;
    skipped: number;
    warnings: number;
  };
};

/** Normalise one validated source item into the DB shape. */
export function normalizeForDb(input: QuestionInput, flags: QuestionFlag[]): DbQuestion {
  const parts =
    input.type === "CQ"
      ? input.parts.map((p, i) => ({ label: p.label, marks: p.marks, text: p.text, answer: p.answer ?? null, position: i }))
      : [];
  const base = {
    id: input.id,
    subject: input.subject,
    chapter: input.chapter,
    type: input.type,
    stars: input.stars,
    boards: input.boards,
    flags,
    answer: input.answer ?? null,
    options: input.options ?? null,
    correct_option: input.correct_option ?? null,
  };
  if (input.type === "SQ") {
    return { ...base, type: "SQ", question: input.question, stem: [], image_path: null, image_desc: null, parts };
  }
  if (input.type === "CQ") {
    return {
      ...base,
      type: "CQ",
      question: input.question ?? null,
      stem: input.stem,
      image_path: input.image,
      image_desc: input.image_desc,
      parts,
    };
  }
  return {
    ...base,
    type: "MCQ",
    question: input.question,
    stem: input.stem,
    image_path: input.image,
    image_desc: input.image_desc,
    parts,
  };
}

/** Build the flag list: source flags + auto LaTeX flags + preserved manual flags. */
export function buildFlags(
  sourceFlags: string[],
  texts: string[],
  existingFlags: unknown,
): { flags: QuestionFlag[]; autoFlags: string[]; changed: boolean } {
  const existing = parseFlags(existingFlags);
  const existingByText = new Map(existing.map((f) => [f.text, f]));
  const out: QuestionFlag[] = [];
  const autoFlags: string[] = [];

  for (const text of sourceFlags) {
    const prev = existingByText.get(text);
    out.push(prev ?? { id: makeFlagId(text), text, createdAt: new Date(0).toISOString() });
  }

  for (const message of collectMathErrors(texts)) {
    autoFlags.push(message);
    const prev = existingByText.get(message);
    out.push(prev ?? { id: makeFlagId(message), text: message, createdAt: new Date(0).toISOString() });
  }

  // Flags an admin added in the UI survive re-imports; source/auto flags do not
  // duplicate and disappear when their cause is fixed.
  for (const flag of existing) {
    const isSourceFlag = sourceFlags.includes(flag.text);
    const isAutoFlag = flag.text.startsWith(AUTO_FLAG_PREFIX);
    if (!isSourceFlag && !isAutoFlag) out.push(flag);
  }

  const changed =
    out.map((f) => f.text).sort().join("\u0000") !== existing.map((f) => f.text).sort().join("\u0000");
  return { flags: out, autoFlags, changed };
}

/** Comparable signature used to detect real changes between runs. */
export function questionSignature(q: DbQuestion): string {
  const parts = q.parts
    .map((p) => `${p.label}:${p.marks}:${p.text}:${p.answer ?? ""}`)
    .join("\u0001");
  return [
    q.subject,
    String(q.chapter),
    q.type,
    q.stars === null ? "" : String(q.stars),
    q.boards.join("\u0001"),
    q.question ?? "",
    q.stem.join("\u0001"),
    q.image_path ?? "",
    q.image_desc ?? "",
    q.answer ?? "",
    (q.options ?? []).map((o) => `${o.label}:${o.text}`).join("\u0001"),
    q.correct_option ?? "",
    parts,
    q.flags
      .map((f) => f.text)
      .sort()
      .join("\u0001"),
  ].join("\u0002");
}

export function existingSignature(e: ExistingQuestion): string {
  return questionSignature({
    id: e.id,
    subject: e.subject,
    chapter: e.chapter,
    type: e.type as QuestionType,
    stars: e.stars,
    boards: e.boards ?? [],
    question: e.question,
    stem: e.stem ?? [],
    image_path: e.image_path,
    image_desc: e.image_desc,
    flags: parseFlags(e.flags),
    answer: e.answer,
    options: e.options,
    correct_option: e.correct_option,
    parts: (e.parts ?? []).map((p, i) => ({
      label: p.label,
      marks: p.marks,
      text: p.text,
      answer: p.answer ?? null,
      position: i,
    })),
  });
}

export type PlanOptions = {
  existing?: Map<string, ExistingQuestion>;
  /** File names present in `<dataDir>/images`; omit to skip presence checks. */
  imageFiles?: Set<string>;
};

/**
 * Pure planning step of `npm run import`: validates every item, computes the
 * DB shape, detects what changed and collects warnings. Runs twice happily —
 * the second run marks everything `unchanged`.
 */
export function planImport(
  files: { name: string; items: unknown[] }[],
  opts: PlanOptions = {},
): ImportPlan {
  const existing = opts.existing ?? new Map<string, ExistingQuestion>();
  const entries: ImportEntry[] = [];

  for (const file of files) {
    file.items.forEach((raw, index) => {
      const id =
        typeof raw === "object" && raw !== null && typeof (raw as { id?: unknown }).id === "string"
          ? ((raw as { id: string }).id)
          : `#${index + 1}`;
      const base = { file: file.name, index, id, autoFlags: [] as string[], warnings: [] as string[] };

      const parsed = parseQuestion(raw);
      if (!parsed.success) {
        entries.push({
          ...base,
          action: "skipped",
          reason: parsed.error.issues
            .map((i) => `${i.path.join(".") || "-"}: ${i.message}`)
            .join("; "),
        });
        return;
      }

      const rawKeys = Object.keys(raw as Record<string, unknown>);
      const unknownKeys = rawKeys.filter((k) => !(KNOWN_QUESTION_KEYS as readonly string[]).includes(k));
      const warnings = unknownKeys.length
        ? [`অজানা কী বাদ দেওয়া হলো: ${unknownKeys.join(", ")}`]
        : [];

      const sourceFlags = parsed.data.flags;
      const texts = questionTextFields({
        question: parsed.data.question,
        stem:
          parsed.data.type === "CQ" || parsed.data.type === "MCQ" ? parsed.data.stem : [],
        parts: parsed.data.type === "CQ" ? parsed.data.parts : [],
        options: parsed.data.type === "MCQ" ? parsed.data.options : null,
      });
      const prev = existing.get(parsed.data.id);
      const built = buildFlags(sourceFlags, texts, prev?.flags);
      const question = normalizeForDb(parsed.data, built.flags);
      warnings.push(...built.autoFlags.map((f) => f));

      let image: ImportEntry["image"];
      if (question.image_path) {
        const present = opts.imageFiles ? opts.imageFiles.has(question.image_path) : true;
        image = { file: question.image_path, present };
        if (opts.imageFiles && !present) {
          warnings.push(
            `ছবি ফাইল পাওয়া যায়নি: images/${question.image_path} — প্রিন্টে প্লেসহোল্ডার দেখানো হবে`,
          );
        }
      }

      let action: ImportAction = "insert";
      let reason: string | undefined;
      if (prev) {
        if (existingSignature(prev) === questionSignature(question)) {
          action = "unchanged";
          reason = "আগের মতোই আছে, পরিবর্তন নেই";
        } else {
          action = "update";
        }
      }

      entries.push({ ...base, action, reason, question, autoFlags: built.autoFlags, warnings, image });
    });
  }

  const totals = entries.reduce(
    (acc, e) => {
      acc.items += 1;
      acc[e.action] += 1;
      acc.warnings += e.warnings.length;
      return acc;
    },
    { items: 0, insert: 0, update: 0, unchanged: 0, skipped: 0, warnings: 0 } as ImportPlan["totals"],
  );

  return { entries, totals };
}
