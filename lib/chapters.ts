import { toBanglaDigits } from "@/lib/bangla";

/**
 * Chemistry (first paper) chapter names. Used for chapter headings in the
 * paper body and anywhere the admin UI needs a readable chapter title.
 * The numeric keys are the chapter numbers stored in the source data.
 */
export const CHEMISTRY_CHAPTER_NAMES: Readonly<Record<number, string>> = {
  6: "মোলের ধারণা ও রাসায়নিক গণনা",
  7: "রাসায়নিক বিক্রিয়া",
  8: "রসায়ন ও শক্তি",
  9: "এসিড-ক্ষারক সমতা",
  10: "খনিজ সম্পদ: ধাতু-অধাতু",
};

/** Chapter name, or null when the chapter has no known name. */
export function chapterName(chapter: number): string | null {
  return CHEMISTRY_CHAPTER_NAMES[chapter] ?? null;
}

/** Printable heading: `অধ্যায় ৬ — মোলের ধারণা ও রাসায়নিক গণনা`. */
export function chapterHeading(chapter: number): string {
  const name = chapterName(chapter);
  const number = `অধ্যায় ${toBanglaDigits(chapter)}`;
  return name ? `${number} — ${name}` : number;
}

/** Known chapter numbers in ascending order. */
export function chapterNumbers(): number[] {
  return Object.keys(CHEMISTRY_CHAPTER_NAMES)
    .map(Number)
    .sort((a, b) => a - b);
}
