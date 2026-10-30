import type { PaperSettings } from "@/lib/schemas/paper";
import {
  resolveMargins,
  type MarginPresetKey,
  type PaperMargins,
} from "@/lib/paper/sizes";
import { questionMarks, resolveParts } from "@/lib/marks";
import { toBanglaDigits } from "@/lib/bangla";
import { chapterHeading as chapterTitle } from "@/lib/chapters";
import {
  SECTION_TITLES,
  generalInstructions,
  sectionHeading,
  sectionInstruction,
  sectionsTotal,
  summarizeSection,
  type SectionSummary,
  type SectionType,
} from "@/lib/paper/sections";
import type { QuestionRecord } from "@/lib/types";

export type PaperDocPart = {
  label: string;
  marks: number;
  text: string;
  answer: string | null;
};

export type PaperDocOption = { label: string; text: string };

export type PaperDocQuestion = {
  id: string;
  /** 1-based number as shown on the paper (Bangla digits applied at render). */
  number: number;
  /** Ready-to-print number, e.g. "০১।" — restarts per section when configured. */
  label: string;
  type: SectionType;
  section: SectionType;
  stem: string[];
  question: string | null;
  /** MCQ choices — never the correct one (answers are not printed). */
  options: PaperDocOption[];
  imageSrc: string | null;
  imageDesc: string | null;
  imageAvailable: boolean;
  parts: PaperDocPart[];
  marks: number;
  /** Manual page break starts before this question. */
  breakBefore: boolean;
  /** Answer line — only rendered when the master flag allows it. */
  answer: string | null;
  /** Board/year tags, empty unless "প্রশ্নের উৎস দেখাও" is on. */
  source: string[];
};

export type PaperDocSection = {
  type: SectionType;
  title: string;
  /** Title + choice + total, e.g. "… (CQ): যেকোনো ৩টি × ১০ = ৩০". */
  heading: string;
  instruction: string | null;
  questions: PaperDocQuestion[];
  summary: SectionSummary;
  /** Chapter this section belongs to (null when grouped by type). */
  chapter: number | null;
  /** "অধ্যায় ৬ — …"; set only on the first section of a chapter. */
  chapterHeading: string | null;
  /** Start this chapter on a new page (break before the heading). */
  newPage: boolean;
};

export type PaperDocSet = {
  name: string;
  sections: PaperDocSection[];
  totalMarks: number;
};

export type SuggestionFlags = {
  showTime: boolean;
  showMarks: boolean;
  showInstructions: boolean;
  showChoice: boolean;
  showTotal: boolean;
};

export type PaperDocMeta = {
  institute: string;
  logoSrc: string | null;
  examName: string;
  className: string;
  subjectLabel: string;
  date: string | null;
  time: string | null;
  durationMinutes: number | null;
  totalMarks: number;
  instructions: string | null;
  /** exam = choice lines + exam header; suggestion = clean sheet. */
  mode: "exam" | "suggestion";
  columns: "1" | "2";
  columnDivider: boolean;
  restartNumbering: boolean;
  fontSize: "small" | "normal" | "large";
  spacing: "compact" | "normal";
  /** Printed page size — drives the `@page` rule and the preview frame. */
  paperSize: PaperSettings["paperSize"];
  /** Resolved page margins (preset already applied), in millimetres. */
  margins: PaperMargins;
  marginPreset: MarginPresetKey;
  /** Max figure height: 40 / 55 / 75 mm. */
  figureSize: "small" | "medium" | "large";
  keepQuestionTogether: boolean;
  compactHeader: boolean;
  showPageNumbers: boolean;
  /** Only consulted in suggestion mode. */
  suggestion: SuggestionFlags;
  showAnswers: boolean;
  /** Marks per SQ question (SQ source items carry no per-question marks). */
  sqMarks: number;
  chapterLabel: string | null;
  setCode: string;
  showSource: boolean;
  watermark: boolean;
};

/** Meta the caller supplies; layout settings are merged in from `settings`. */
export type PaperDocMetaInput = Omit<
  PaperDocMeta,
  | "mode"
  | "columns"
  | "columnDivider"
  | "restartNumbering"
  | "fontSize"
  | "spacing"
  | "paperSize"
  | "margins"
  | "marginPreset"
  | "figureSize"
  | "keepQuestionTogether"
  | "compactHeader"
  | "showPageNumbers"
  | "suggestion"
  | "showAnswers"
  | "sqMarks"
  | "chapterLabel"
  | "setCode"
  | "showSource"
  | "watermark"
>;

export type PaperDocModel = {
  meta: PaperDocMeta;
  sets: PaperDocSet[];
};

export type PaperDocDoc = {
  meta: PaperDocMeta;
  sections: PaperDocSection[];
  totalMarks: number;
  numbering: number;
};

/**
 * Subject id → Bangla header label. Mirrors the aliases in `lib/subjects.ts`
 * (`math`, `maths`, `higher_math`…) without renaming any stored value; an
 * unknown id is printed verbatim rather than guessed.
 */
const SUBJECT_LABELS: Record<string, string> = {
  chemistry: "রসায়ন",
  physics: "পদার্থবিজ্ঞান",
  biology: "জীববিজ্ঞান",
  math: "গণিত",
  maths: "গণিত",
  mathematics: "গণিত",
  higher_math: "উচ্চতর গণিত",
  "higher math": "উচ্চতর গণিত",
  "higher-math": "উচ্চতর গণিত",
  bangla: "বাংলা",
  english: "ইংরেজি",
};

export function subjectLabel(subject: string): string {
  return SUBJECT_LABELS[subject.trim().toLowerCase()] ?? subject;
}

/** "০১।" — two Bangla digits and a danda. */
export function compactNumber(n: number): string {
  return `${toBanglaDigits(String(n).padStart(2, "0"))}।`;
}

export type PaperSelectionItem = {
  question: QuestionRecord;
  selectedParts: string[];
  section: SectionType | null;
};

type DocOptions = {
  /** Map of question id → whether its image file exists/loaded. */
  imageAvailable?: (id: string, path: string | null) => boolean;
  imageSrc?: (path: string) => string | null;
  /** Set code printed in the header (defaults to settings.setCode). */
  setName?: string;
  /** Keep the caller's order (used by explicit sets, e.g. the shuffled set খ). */
  preserveOrder?: boolean;
};

function sectionTypeOf(item: PaperSelectionItem): SectionType {
  return item.section ?? item.question.type;
}

/** Order used for any type the saved `sectionOrder` does not mention. */
const FALLBACK_ORDER: SectionType[] = ["MCQ", "SQ", "CQ"];

/** Settings order first, then any missing type in the default order. */
function effectiveOrder(settings: PaperSettings, present: Set<SectionType>): SectionType[] {
  const order = [...settings.sectionOrder];
  for (const type of FALLBACK_ORDER) {
    if (present.has(type) && !order.includes(type)) order.push(type);
  }
  return order;
}

/** Sort key for questions inside one section. */
export function questionComparator(sortBy: PaperSettings["sortBy"]) {
  return (a: PaperSelectionItem, b: PaperSelectionItem): number => {
    if (sortBy === "boards") {
      const byBoards = b.question.boards.length - a.question.boards.length;
      if (byBoards !== 0) return byBoards;
    }
    return a.question.id.localeCompare(b.question.id, "en", { numeric: true });
  };
}

type Draft = {
  type: SectionType;
  chapter: number | null;
  items: PaperSelectionItem[];
};

/**
 * Builds the renderable model for one paper (or one set of a set-wise paper).
 * Pure — no I/O — so it is unit-testable and identical in preview/print/PDF.
 */
export function buildPaperDocSet(
  items: PaperSelectionItem[],
  settings: PaperSettings,
  meta: PaperDocMetaInput & { subjectLabel: string },
  opts: DocOptions = {},
): PaperDocDoc {
  const imageSrc = opts.imageSrc ?? ((p: string) => p);
  const imageAvailable = opts.imageAvailable ?? (() => true);
  const setName = opts.setName ?? settings.setCode;

  const docMeta: PaperDocMeta = {
    ...meta,
    mode: settings.mode,
    columns: settings.columns,
    columnDivider: settings.columnDivider,
    restartNumbering: settings.restartNumbering,
    fontSize: settings.fontSize,
    spacing: settings.spacing,
    paperSize: settings.paperSize,
    margins: resolveMargins(settings.marginPreset, settings.margins),
    marginPreset: settings.marginPreset,
    figureSize: settings.figureSize,
    keepQuestionTogether: settings.keepQuestionTogether,
    compactHeader: settings.compactHeader,
    showPageNumbers: settings.showPageNumbers,
    suggestion: settings.suggestion,
    showAnswers: settings.showAnswers,
    sqMarks: settings.sqMarks,
    chapterLabel: settings.chapterLabel,
    setCode: setName,
    showSource: settings.showSource,
    watermark: settings.watermark,
  };

  const selected = items;
  const compare = questionComparator(settings.sortBy);
  const sortSection = (list: PaperSelectionItem[]) =>
    opts.preserveOrder ? list : [...list].sort(compare);

  const chapterGroups = new Map<SectionType, Set<number>>();
  for (const item of selected) {
    const type = sectionTypeOf(item);
    const set = chapterGroups.get(type) ?? new Set<number>();
    set.add(item.question.chapter);
    chapterGroups.set(type, set);
  }
  const order = effectiveOrder(settings, new Set(selected.map(sectionTypeOf)));

  /**
   * Exam papers ask "answer any N" per question type. That line only makes
   * sense when the type prints as one block; if a type is split across
   * chapters (or the paper is a suggestion sheet) every question prints and
   * the total is the plain sum.
   */
  const choiceFor = (type: SectionType): number | null => {
    // Suggestion sheets are not exams: the "answer any N" line is opt-in.
    if (settings.mode === "suggestion" && !settings.suggestion.showChoice) return null;
    if ((chapterGroups.get(type)?.size ?? 0) > 1 && settings.mode !== "suggestion") return null;
    if (type === "CQ") return settings.cqChoice;
    if (type === "SQ") return settings.sqChoice;
    return settings.mcqChoice;
  };

  const drafts: Draft[] = [];
  if (settings.grouping === "chapter") {
    const chapters = [...new Set(selected.map((item) => item.question.chapter))].sort((a, b) => a - b);
    for (const chapter of chapters) {
      for (const type of order) {
        const list = sortSection(
          selected.filter((item) => item.question.chapter === chapter && sectionTypeOf(item) === type),
        );
        if (list.length > 0) drafts.push({ type, chapter, items: list });
      }
    }
  } else {
    for (const type of order) {
      const list = [
        ...sortSection(selected.filter((item) => sectionTypeOf(item) === type)),
      ].sort((a, b) => a.question.chapter - b.question.chapter);
      if (list.length > 0) drafts.push({ type, chapter: null, items: list });
    }
  }

  const sections: PaperDocSection[] = [];
  let numbering = 0;
  const restartPerSection = settings.restartNumbering || settings.mode === "suggestion";
  let currentChapter: number | null = null;
  let chapterIndex = -1;

  for (const draft of drafts) {
    let sectionNumber = 0;
    const questions: PaperDocQuestion[] = [];

    for (const item of draft.items) {
      const q = item.question;
      numbering += 1;
      sectionNumber += 1;
      const shownNumber = restartPerSection ? sectionNumber : numbering;
      const parts =
        q.type === "CQ"
          ? resolveParts(q, item.selectedParts).map((p) => ({
              label: p.label,
              marks: p.marks,
              text: p.text,
              answer: settings.showAnswers ? p.answer : null,
            }))
          : [];
      const marks = questionMarks(q, { selectedParts: item.selectedParts, sqMarks: settings.sqMarks });
      questions.push({
        id: q.id,
        number: shownNumber,
        label: compactNumber(shownNumber),
        type: q.type,
        section: q.type,
        stem: q.type === "CQ" || q.type === "MCQ" ? q.stem : [],
        question: q.question,
        // The admin-only answer (`correctOption`) is deliberately never copied.
        options:
          q.type === "MCQ" ? (q.options ?? []).map((o) => ({ label: o.label, text: o.text })) : [],
        imageSrc: q.imagePath ? imageSrc(q.imagePath) : null,
        imageDesc: q.imageDesc,
        imageAvailable: q.imagePath ? imageAvailable(q.id, q.imagePath) : false,
        parts,
        marks,
        breakBefore: settings.pageBreakBefore.includes(numbering),
        answer: settings.showAnswers ? q.answer : null,
        source: settings.showSource ? q.boards : [],
      });
    }

    const sectionType = draft.type as SectionType;
    const choice = choiceFor(sectionType);
    const summary = summarizeSection(
      sectionType,
      questions.map((q) => q.marks),
      choice,
    );
    const firstOfChapter = draft.chapter !== null && draft.chapter !== currentChapter;
    if (draft.chapter !== null && firstOfChapter) {
      currentChapter = draft.chapter;
      chapterIndex += 1;
    }

    // Section instruction ("যেকোনো ৩টি প্রশ্নের উত্তর দাও") is exam furniture;
    // suggestion sheets hide it unless the teacher opts in. Whatever is shown
    // shares its N with the heading above it (see `sectionInstruction`).
    const hideInstruction =
      settings.mode === "suggestion" && !settings.suggestion.showChoice;
    // MCQ has no settings field of its own: the stock "answer any N" line is
    // run through the same normaliser as CQ/SQ, so it becomes
    // "সবগুলো প্রশ্নের উত্তর দাও" when every question is answered.
    const storedInstruction =
      sectionType === "CQ"
        ? settings.cqInstruction
        : sectionType === "SQ"
          ? settings.sqInstruction
          : "যেকোনো ১টি প্রশ্নের উত্তর দাও";
    sections.push({
      type: draft.type,
      title: SECTION_TITLES[sectionType],
      heading: sectionHeading(SECTION_TITLES[sectionType], summary, {
        // MCQ prints its "N × ১ = N" total with or without a choice; a
        // suggestion sheet keeps hiding section totals like CQ/SQ do.
        showChoice:
          choice !== null || (sectionType === "MCQ" && settings.mode !== "suggestion"),
      }),
      instruction: hideInstruction
        ? null
        : sectionInstruction(storedInstruction, summary),
      questions,
      summary,
      chapter: draft.chapter,
      chapterHeading: firstOfChapter ? chapterTitle(draft.chapter as number) : null,
      newPage: firstOfChapter && chapterIndex > 0 && settings.chapterPageBreak,
    });
  }

  // General instruction: the untouched default steps aside when a section
  // offers a choice; teacher-edited text is left alone.
  docMeta.instructions = generalInstructions(meta.instructions, sections);

  return {
    meta: docMeta,
    sections,
    totalMarks: sectionsTotal(sections.map((s) => s.summary)),
    numbering,
  };
}

/**
 * The one-line running header printed in the top margin of pages 2+ (page 1
 * has the full header, so `@page :first` drops this). Built from the same
 * fields as the header so the two can never disagree.
 */
export function runningHeadText(meta: {
  institute: string;
  examName: string;
  subjectLabel: string;
  setCode: string;
}): string {
  const parts = [
    meta.institute,
    meta.examName,
    `${meta.subjectLabel} (সেট ${meta.setCode})`,
  ].filter((p) => p && p.trim());
  return parts.join(" — ");
}

/**
 * Full model: the active set only (set code ক/খ). A paper is printed one set
 * at a time; `settings.sets` holds the question order of each set.
 */
export function buildPaperDoc(
  items: PaperSelectionItem[],
  settings: PaperSettings,
  meta: PaperDocMetaInput & { subjectLabel: string },
  opts: DocOptions = {},
): PaperDocModel {
  const active =
    settings.sets.find((s) => s.name === settings.setCode) ?? settings.sets[0] ?? null;
  const setName = active?.name ?? settings.setCode;

  let ordered = items;
  if (active) {
    const order = new Map(active.ids.map((id, i) => [id, i]));
    ordered = items
      .filter((it) => order.has(it.question.id))
      .sort((a, b) => (order.get(a.question.id) ?? 0) - (order.get(b.question.id) ?? 0));
    // A question added after the set was captured still prints (at the end),
    // so a stale set order can never silently drop a question.
    for (const item of items) if (!order.has(item.question.id)) ordered.push(item);
  }

  const doc = buildPaperDocSet(ordered, settings, meta, {
    ...opts,
    setName,
    // An explicit set order (e.g. the shuffled set খ) wins over section sorting.
    preserveOrder: Boolean(active),
  });
  return {
    meta: doc.meta,
    sets: [{ name: setName, sections: doc.sections, totalMarks: doc.totalMarks }],
  };
}
