import { toBanglaDigits } from "@/lib/bangla";

export type SectionType = "CQ" | "SQ" | "MCQ";

/**
 * One section's numbers: how many questions there are, how many a student
 * answers, what each is worth and the marks that section contributes.
 */
export type SectionSummary = {
  type: SectionType;
  /** Questions printed in this section. */
  count: number;
  /** Questions a student answers (choice, clamped to `count`). */
  choice: number;
  /** Marks per question when every question in the section is worth the same. */
  marksPerQuestion: number | null;
  equalMarks: boolean;
  /** Marks this section adds to পূর্ণমান (choice × marks when equal). */
  totalMarks: number;
  /** Shown as a small note when the marks are not uniform. */
  note: string | null;
};

export const MARKS_DIFFER_NOTE = "প্রশ্নগুলোর নম্বর ভিন্ন — যোগফল দেখানো হয়েছে";

/**
 * Instruction wording shared by the builder's defaults and the printer.
 * One string each, so the default a teacher sees and the text the paper
 * prints can never drift apart.
 */
export const ALL_QUESTIONS_INSTRUCTION = "সবগুলো প্রশ্নের উত্তর দাও";
export const DEFAULT_GENERAL_INSTRUCTIONS = "সমস্ত প্রশ্নের উত্তর দিতে হবে; ডান পাশের নম্বর নির্দেশক।";
export const CHOICE_GENERAL_INSTRUCTIONS = "ডান পাশের সংখ্যা পূর্ণমান নির্দেশক।";

const BN_DIGITS = "\u09E6-\u09EF";
/** "যেকোনো ৩টি প্রশ্নের উত্তর দাও" — the stock section line, nothing else. */
const CANONICAL_CHOICE_LINE = new RegExp(
  `^\\s*যেকোনো\\s*[${BN_DIGITS}0-9]+\\s*টি\\s+প্রশ্নের\\s+উত্তর\\s+দাও\\s*[.।]?\\s*$`,
);
/** Leading "যেকোনো <N>টি" of a longer, teacher-written line. */
const LEADING_CHOICE_N = new RegExp(`^(\\s*যেকোনো\\s*)[${BN_DIGITS}0-9]+(\\s*টি)`);

function squeeze(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/**
 * The line printed under a section heading.
 *
 * The `N` always comes from the same `summary` the heading prints, so the two
 * can never disagree (a saved "যেকোনো ৩টি…" under a ১-question section used to
 * print both numbers):
 *
 *  - stock line, N < count → the heading already says "যেকোনো Nটি × marks = total",
 *    so the duplicate is dropped;
 *  - stock line, N = count → "সবগুলো প্রশ্নের উত্তর দাও" (it says what the
 *    heading's choice formula does not);
 *  - teacher-written text → kept verbatim, except a leading "যেকোনো Nটি"
 *    whose N is re-derived from the summary (user wording is never rewritten,
 *    but it can never contradict the heading either).
 */
export function sectionInstruction(
  stored: string | null | undefined,
  summary: SectionSummary,
): string | null {
  const text = squeeze(stored);
  if (!text || summary.count === 0) return null;

  if (CANONICAL_CHOICE_LINE.test(text)) {
    return summary.choice < summary.count ? null : ALL_QUESTIONS_INSTRUCTION;
  }
  if (LEADING_CHOICE_N.test(text)) {
    const n = toBanglaDigits(String(summary.choice));
    return text.replace(LEADING_CHOICE_N, `$1${n}$2`);
  }
  return text;
}

/**
 * The general instruction printed under the header.
 *
 * The untouched default ("সমস্ত প্রশ্নের উত্তর দিতে হবে; …") is a claim that
 * every question must be answered, so it is wrong as soon as any section has
 * a choice (N < count) — there the default becomes "ডান পাশের সংখ্যা পূর্ণমান
 * নির্দেশক।". Text the teacher edited is returned exactly as written.
 */
export function generalInstructions(
  stored: string | null | undefined,
  sections: { summary: SectionSummary }[],
): string | null {
  const text = squeeze(stored);
  if (!text) return null;
  const hasChoice = sections.some((s) => s.summary.choice < s.summary.count);
  if (hasChoice && text === DEFAULT_GENERAL_INSTRUCTIONS) return CHOICE_GENERAL_INSTRUCTIONS;
  return text;
}

export const SECTION_TITLES: Record<SectionType, string> = {
  CQ: "ক-বিভাগ — সৃজনশীল প্রশ্ন (CQ)",
  SQ: "খ-বিভাগ — সংক্ষিপ্ত প্রশ্ন (SQ)",
  MCQ: "বহুনির্বাচনী প্রশ্ন (MCQ)",
};

/**
 * MCQ sections are always worth ১ mark per question, so their heading prints
 * the plain "N × ১ = N" total (a choice reads "যেকোনো N টি × ১ = N").
 */
export const MCQ_MARKS = 1;

const bn = toBanglaDigits;

/** Summarise a section from its per-question marks and the answer count. */
export function summarizeSection(
  type: SectionType,
  marks: number[],
  choice: number | null | undefined,
): SectionSummary {
  const count = marks.length;
  if (count === 0) {
    return {
      type,
      count: 0,
      choice: 0,
      marksPerQuestion: null,
      equalMarks: true,
      totalMarks: 0,
      note: null,
    };
  }

  const wanted =
    choice == null || !Number.isFinite(choice)
      ? count
      : Math.min(count, Math.max(1, Math.trunc(choice)));
  const first = marks[0] ?? 0;
  const equalMarks = marks.every((m) => m === first);
  const marksPerQuestion = equalMarks ? first : null;
  const totalMarks = equalMarks ? wanted * first : marks.reduce((sum, m) => sum + m, 0);

  return {
    type,
    count,
    choice: wanted,
    marksPerQuestion,
    equalMarks,
    totalMarks,
    note: equalMarks ? null : MARKS_DIFFER_NOTE,
  };
}

/**
 * Section heading with the choice and the total, e.g.
 * "… (CQ): যেকোনো ৩টি × ১০ = ৩০". Numbers are always Bangla.
 * `showChoice: false` prints only the title (suggestion sheets and section
 * splits where an "answer any N" line would be misleading).
 */
export function sectionHeading(
  title: string,
  summary: SectionSummary,
  opts: { showChoice?: boolean } = {},
): string {
  if (opts.showChoice === false) return title;
  if (summary.count === 0) return title;
  if (summary.type === "MCQ" && summary.equalMarks) {
    const marks = bn(summary.marksPerQuestion ?? MCQ_MARKS);
    const choice = summary.choice < summary.count ? `যেকোনো ${bn(summary.choice)}টি` : bn(summary.count);
    return `${title}: ${choice} × ${marks} = ${bn(summary.totalMarks)}`;
  }
  if (summary.equalMarks) {
    return `${title}: যেকোনো ${bn(summary.choice)}টি × ${bn(summary.marksPerQuestion ?? 0)} = ${bn(summary.totalMarks)}`;
  }
  return `${title}: যেকোনো ${bn(summary.choice)}টি; মোট ${bn(summary.totalMarks)}`;
}

/** Sum of the section totals — the marks a student has to answer for. */
export function sectionsTotal(sections: { totalMarks: number }[]): number {
  return sections.reduce((sum, s) => sum + s.totalMarks, 0);
}

/**
 * Text used for duplicate detection: whitespace, punctuation, digits and
 * LaTeX/math markup removed, so "প্রশ্ন ১: …" and "প্রশ্ন ২: …" collapse to
 * the same string when only the numbers differ.
 */
export function normalizeQuestionText(text: string): string {
  return text
    .replace(/\$[^$]*\$/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[\u09E6-\u09EF0-9]+/g, " ")
    .replace(/[^\p{L}\p{M}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export type DuplicatePair = { a: string; b: string };

/**
 * Every pair of selected questions whose normalised text is identical.
 * Advisory only — the builder never blocks on it.
 */
export function findNearDuplicates(items: { id: string; text: string }[]): DuplicatePair[] {
  const seen = new Map<string, string>();
  const pairs: DuplicatePair[] = [];
  for (const item of items) {
    const key = normalizeQuestionText(item.text);
    if (!key) continue;
    const first = seen.get(key);
    if (first && first !== item.id) pairs.push({ a: first, b: item.id });
    else seen.set(key, item.id);
  }
  return pairs;
}
