import { CHEMISTRY_CHAPTER_NAMES } from "@/lib/chapters";

/**
 * Subject registry.
 *
 * The UI (subject switcher, filter rail, builder, command palette) is driven
 * entirely by this list. Adding a subject is a data change here: give it an id,
 * a Bangla label, a dot colour token and its chapter names — no component
 * needs to change.
 */
export type SubjectDef = {
  id: string;
  /** Bangla name shown in the UI. */
  label: string;
  /** Latin name used in URLs and storage. */
  slug: string;
  /** CSS variable used for the subject dot. */
  dot: string;
  /** chapter number → chapter name (Bangla). */
  chapters: Record<number, string>;
};

export const SUBJECTS: SubjectDef[] = [
  {
    id: "chemistry",
    label: "রসায়ন",
    slug: "chemistry",
    dot: "var(--subject-chemistry)",
    chapters: CHEMISTRY_CHAPTER_NAMES,
  },
  {
    id: "physics",
    label: "পদার্থবিজ্ঞান",
    slug: "physics",
    dot: "var(--subject-physics)",
    chapters: {},
  },
  {
    id: "math",
    label: "গণিত",
    slug: "math",
    dot: "var(--subject-math)",
    chapters: {},
  },
  {
    id: "biology",
    label: "জীববিজ্ঞান",
    slug: "biology",
    dot: "var(--subject-biology)",
    chapters: {},
  },
];

export const DEFAULT_SUBJECT = SUBJECTS[0]!.id;

export function subjectById(id: string | null | undefined): SubjectDef {
  return SUBJECTS.find((s) => s.id === id) ?? SUBJECTS[0]!;
}

export function subjectLabel(id: string | null | undefined): string {
  return subjectById(id).label;
}

/** Bangla name for a chapter, falling back to `অধ্যায় N`. */
export function subjectChapterName(subjectId: string, chapter: number): string {
  return subjectById(subjectId).chapters[chapter] ?? `অধ্যায় ${chapter}`;
}

/** `[{ chapter: 6, name: "…" }]`, ascending. */
export function subjectChapters(subjectId: string): { chapter: number; name: string }[] {
  const subject = subjectById(subjectId);
  return Object.entries(subject.chapters)
    .map(([chapter, name]) => ({ chapter: Number(chapter), name }))
    .sort((a, b) => a.chapter - b.chapter);
}

/** Colour token for a subject dot, safe for unknown ids. */
export function subjectDot(id: string): string {
  return subjectById(id).dot;
}

/**
 * Fixed subject order for the public exam list. Stored `exams.subject` values
 * are matched through `aliases` — nothing stored is ever renamed.
 */
export type ExamSection = {
  id: string;
  /** Uppercase section heading. */
  english: string;
  /** Bangla name beside the heading. */
  bangla: string;
  /** Accent colour (hex) for the section heading and rail. */
  accent: string;
  aliases: string[];
};

export const EXAM_SECTIONS: ExamSection[] = [
  {
    id: "chemistry",
    english: "CHEMISTRY",
    bangla: "রসায়ন",
    accent: "#0f9d8a",
    aliases: ["chemistry", "chem", "রসায়ন"],
  },
  {
    id: "physics",
    english: "PHYSICS",
    bangla: "পদার্থবিজ্ঞান",
    accent: "#2563eb",
    aliases: ["physics", "phy", "পদার্থবিজ্ঞান", "পদার্থ"],
  },
  {
    id: "math",
    english: "MATH",
    bangla: "গণিত",
    accent: "#d97706",
    aliases: ["math", "maths", "mathematics", "গণিত"],
  },
  {
    id: "higher-math",
    english: "HIGHER MATH",
    bangla: "উচ্চতর গণিত",
    accent: "#7c3aed",
    aliases: ["higher_math", "higher math", "higher-math", "highermath", "উচ্চতর গণিত"],
  },
];

/** Last section: exams whose stored subject matches none of the above. */
export const OTHER_EXAM_SECTION: ExamSection = {
  id: "other",
  english: "OTHER",
  bangla: "অন্যান্য",
  accent: "#64748b",
  aliases: [],
};

/** Section for a stored subject value (unknown → the last section). */
export function examSectionFor(subject: string): ExamSection {
  const key = subject.trim().toLowerCase();
  return EXAM_SECTIONS.find((s) => s.aliases.includes(key)) ?? OTHER_EXAM_SECTION;
}
