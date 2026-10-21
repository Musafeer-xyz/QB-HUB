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
  /** False when the subject exists in the registry but has no data yet. */
  hasData: boolean;
};

export const SUBJECTS: SubjectDef[] = [
  {
    id: "chemistry",
    label: "রসায়ন",
    slug: "chemistry",
    dot: "var(--subject-chemistry)",
    chapters: CHEMISTRY_CHAPTER_NAMES,
    hasData: true,
  },
  {
    id: "physics",
    label: "পদার্থবিজ্ঞান",
    slug: "physics",
    dot: "var(--subject-physics)",
    chapters: {},
    hasData: false,
  },
  {
    id: "math",
    label: "গণিত",
    slug: "math",
    dot: "var(--subject-math)",
    chapters: {},
    hasData: false,
  },
  {
    id: "biology",
    label: "জীববিজ্ঞান",
    slug: "biology",
    dot: "var(--subject-biology)",
    chapters: {},
    hasData: false,
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
