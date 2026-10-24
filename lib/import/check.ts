import {
  parseQuestion,
  type QuestionInput,
  type QuestionType,
} from "@/lib/schemas/question";
import { renderRichText } from "@/lib/render/rich-text";

/**
 * Static checks for the source `data/*.json` files. Pure and shared by
 * `npm run check-data` and the import page, so both report the same problems
 * in the same Bangla wording.
 */

export type CheckSeverity = "error" | "warning";

export type CheckIssue = {
  severity: CheckSeverity;
  file: string;
  id: string;
  problem: string;
};

export type CheckSourceFile = { name: string; items: unknown[] };

export type CheckOptions = {
  /** File names present in `<data>/images`; omit to skip the existence check. */
  imageFiles?: Set<string>;
};

export type CheckResult = {
  issues: CheckIssue[];
  errors: CheckIssue[];
  warnings: CheckIssue[];
};

/** Subject → id prefix used by the source data (`chem-06-cq-001`). */
const SUBJECT_PREFIXES: Record<string, string> = {
  chemistry: "chem",
  physics: "phy",
  biology: "bio",
  mathematics: "math",
  higher_math: "hmath",
  bangla: "ban",
  english: "eng",
};

const CQ_LABELS = ["ক", "খ", "গ", "ঘ"];

/**
 * Allowed characters: Bangla block, printable ASCII, whitespace, the common
 * math/chemistry symbols we typeset, the danda and Unicode sub/superscripts.
 * Latin Extended and other lookalikes are rejected so KaTeX never gets them.
 */
const ALLOWED_CHAR =
  /[\u0980-\u09FF\u0964\u0020-\u007E\u00A0\u2013\u2014\u2018-\u201D\u2026\u20B9\u00B0\u00B1\u00B7\u00D7\u00F7\u0394\u03A3\u03C0\u03BC\u03C9\u2192\u21CC\u2191\u2193\u221A\u221E\u2248\u2260\u2264\u2265\u00B2\u00B3\u00B9\u2070-\u209F\u2212\u2032\u2033\u2044]/u;
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF\u2060]/u;

function sourceId(raw: unknown, index: number): string {
  if (typeof raw === "object" && raw !== null) {
    const id = (raw as { id?: unknown }).id;
    if (typeof id === "string" && id.trim()) return id;
  }
  return `#${index + 1}`;
}

function padded(value: number): string {
  return String(value).padStart(2, "0");
}

function expectedIdShape(q: QuestionInput): string {
  const prefix = SUBJECT_PREFIXES[q.subject] ?? q.subject;
  return `${prefix}-${padded(q.chapter)}-${q.type.toLowerCase()}-001`;
}

function textFields(q: QuestionInput): string[] {
  const fields: string[] = [];
  if (q.question) fields.push(q.question);
  if (q.type === "CQ") {
    for (const line of q.stem) if (line) fields.push(line);
    for (const part of q.parts) {
      if (part.text) fields.push(part.text);
      if (part.answer) fields.push(part.answer);
    }
  }
  if (q.type === "MCQ") {
    // Statement (`i, ii, iii`) and stimulus lines are printed too.
    for (const line of q.stem) if (line) fields.push(line);
    for (const option of q.options) if (option.text) fields.push(option.text);
  }
  if (q.type !== "SQ" && q.image_desc) fields.push(q.image_desc);
  if (q.answer) fields.push(q.answer);
  return fields;
}

function countUnescapedDollars(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\") {
      i += 1;
      continue;
    }
    if (text[i] === "$") count += 1;
  }
  return count;
}

function characterProblems(text: string): string[] {
  const problems: string[] = [];
  if (text !== text.normalize("NFC")) {
    problems.push("টেক্সট NFC-স্বাভাবিক নয় — একই অক্ষরের ভিন্ন রূপ আছে");
  }
  const zero = text.match(ZERO_WIDTH);
  if (zero) {
    problems.push(`শূন্য-প্রস্থ অক্ষর আছে (U+${(zero[0].codePointAt(0) ?? 0).toString(16).toUpperCase()})`);
  }
  const bad = new Set<string>();
  for (const ch of text) {
    if (/\s/.test(ch) || ch === "\u200D" || ch === "\u200C") continue;
    if (!ALLOWED_CHAR.test(ch)) bad.add(ch);
  }
  for (const ch of bad) {
    problems.push(`অননুমোদিত অক্ষর “${ch}” (U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase()})`);
  }
  return problems;
}

function structureProblems(q: QuestionInput): string[] {
  const problems: string[] = [];
    if (q.type === "CQ") {
    const labels = CQ_LABELS as readonly string[];
    const n = q.parts.length;
    if (n < 1 || n > 4) {
      problems.push(`CQ-তে ১ থেকে ৪টি পার্ট থাকতে হবে — পাওয়া গেছে ${n}টি`);
    } else {
      const idx = q.parts.map((p) => labels.indexOf(p.label));
      const ordered = idx.every((v, i) => v >= 0 && (i === 0 || v > (idx[i - 1] ?? -1)));      if (!ordered) {
        problems.push(`CQ পার্টের লেবেল ক, খ, গ, ঘ থেকে হতে হবে, পুনরাবৃত্তি ছাড়া ও ক্রমানুসারে — পাওয়া গেছে ${q.parts.map((p) => p.label).join(", ")}`);
      }
      for (const p of q.parts) {
        const i = labels.indexOf(p.label);
        if (i >= 0 && p.marks !== i + 1) {
          problems.push(`CQ পার্ট ${p.label}-এর নম্বর ${i + 1} হতে হবে — পাওয়া গেছে ${p.marks}`);
        }
      }
    }
  }
  // MCQ option count, label order and the answer label are enforced by the zod
  // schema; this is the place for checks the schema cannot express.
  return problems;
}

/** Text exactly as written, before zod trims it (spacing warnings). */
function rawTexts(raw: unknown): string[] {
  const out: string[] = [];
  if (!raw || typeof raw !== "object") return out;
  const record = raw as Record<string, unknown>;
  if (typeof record.question === "string") out.push(record.question);
  if (Array.isArray(record.stem)) {
    for (const line of record.stem) if (typeof line === "string") out.push(line);
  }
  if (Array.isArray(record.parts)) {
    for (const part of record.parts) {
      if (part && typeof part === "object") {
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string") out.push(text);
      }
    }
  }
  if (Array.isArray(record.options)) {
    for (const option of record.options) {
      if (option && typeof option === "object") {
        const text = (option as { text?: unknown }).text;
        if (typeof text === "string") out.push(text);
      }
    }
  }
  return out;
}

function warningProblems(q: QuestionInput, raw: unknown): string[] {
  const warnings: string[] = [];
  for (const text of rawTexts(raw)) {
    if (text !== text.trim()) warnings.push("শুরু/শেষে অতিরিক্ত স্পেস আছে");
  }
  for (const text of textFields(q)) {
    if (/ {2,}/.test(text)) warnings.push("দুই বা তার বেশি ধারাবাহিক স্পেস আছে");
  }
  const main =
    q.type === "CQ" || q.type === "MCQ" ? [...q.stem, q.question ?? ""].join(" ") : q.question;
  if (main.trim().length < 8) warnings.push("প্রশ্ন ৮ অক্ষরের চেয়ে ছোট");
  if (q.flags.length > 0) warnings.push(`ফ্ল্যাগ আছে (${q.flags.length}টি) — যাচাই করুন`);
  return [...new Set(warnings)];
}

/** Check one raw item; `file`/`id` are only used for the report. */
export function checkQuestion(
  raw: unknown,
  file: string,
  id: string,
  opts: CheckOptions = {},
): { errors: CheckIssue[]; warnings: CheckIssue[] } {
  const errors: CheckIssue[] = [];
  const warnings: CheckIssue[] = [];
  const error = (problem: string) => errors.push({ severity: "error", file, id, problem });
  const warn = (problem: string) => warnings.push({ severity: "warning", file, id, problem });

  const parsed = parseQuestion(raw);
  if (!parsed.success) {
    error(
      `ফর্ম্যাট সঠিক নয় — ${parsed.error.issues
        .map((i) => `${i.path.join(".") || "-"}: ${i.message}`)
        .join("; ")}`,
    );
    return { errors, warnings };
  }

  const q = parsed.data;

  const prefix = SUBJECT_PREFIXES[q.subject] ?? q.subject;
  const pattern = new RegExp(`^${prefix}-${padded(q.chapter)}-${q.type.toLowerCase()}-\\d{3,}$`);
  if (!pattern.test(q.id)) {
    error(`id ${q.id} বিষয়/অধ্যায়/ধরনের সাথে মেলে না — প্রত্যাশিত রূপ: ${expectedIdShape(q)}`);
  }

  for (const text of textFields(q)) {
    if (/\\\\[A-Za-z]/.test(text)) {
      error("ডাবল-এস্কেপ করা LaTeX — অক্ষরের আগে দুইটি ব্যাকস্ল্যাশ, একটিই হবে");
    }
    if (countUnescapedDollars(text) % 2 === 1) {
      error("$ মিলছে না — বেমানান ডলার চিহ্ন");
    }
    for (const problem of characterProblems(text)) error(problem);
    for (const math of renderRichText(text).errors) {
      error(`LaTeX/mhchem পার্স হয়নি: $${math.expr}$ — ${math.message}`);
    }
  }

  for (const problem of structureProblems(q)) error(problem);

  if (opts.imageFiles) {
    const image = q.type === "CQ" || q.type === "MCQ" ? q.image : null;
    if (image && !opts.imageFiles.has(image)) {
      error(`চিত্রের ফাইল পাওয়া যায়নি: images/${image}`);
    }
  }

  for (const problem of warningProblems(q, raw)) warn(problem);

  return { errors, warnings };
}

/**
 * Check every item of every file. Duplicate ids are reported once per extra
 * occurrence, with the file where the id first appeared.
 */
export function checkData(files: CheckSourceFile[], opts: CheckOptions = {}): CheckResult {
  const issues: CheckIssue[] = [];
  const seen = new Map<string, string>();

  for (const file of files) {
    file.items.forEach((raw, index) => {
      const id = sourceId(raw, index);
      const firstFile = seen.get(id);
      if (firstFile) {
        issues.push({
          severity: "error",
          file: file.name,
          id,
          problem: `একই id আগেও আছে (${firstFile}-এ)`,
        });
      } else {
        seen.set(id, file.name);
      }
      const result = checkQuestion(raw, file.name, id, opts);
      issues.push(...result.errors, ...result.warnings);
    });
  }

  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error"),
    warnings: issues.filter((issue) => issue.severity === "warning"),
  };
}

/** How many items of a file list are `CQ` / `SQ` / `MCQ` (reporting helper). */
export function questionTypeCounts(files: CheckSourceFile[]): Record<QuestionType, number> {
  const counts: Record<QuestionType, number> = { CQ: 0, SQ: 0, MCQ: 0 };
  for (const file of files) {
    for (const raw of file.items) {
      const parsed = parseQuestion(raw);
      if (parsed.success) counts[parsed.data.type] += 1;
    }
  }
  return counts;
}
