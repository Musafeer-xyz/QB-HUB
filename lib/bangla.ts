/** Bangla digit helpers shared by UI, print layout and tests. */

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;
const EN_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** Convert ASCII digits inside a string/number to Bangla digits. `১২৩`. */
export function toBanglaDigits(value: string | number): string {
  const text = typeof value === "number" ? String(value) : value;
  return text.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

/** Convert Bangla digits back to ASCII digits (for parsing user input). */
export function fromBanglaDigits(value: string): string {
  return value.replace(/[\u09E6-\u09EF]/g, (d) => {
    const idx = BN_DIGITS.indexOf(d as (typeof BN_DIGITS)[number]);
    return idx >= 0 ? (EN_DIGITS[idx] ?? "") : d;
  });
}

/** `১০` for marks display. */
export function formatMarks(marks: number): string {
  return toBanglaDigits(marks);
}

/** `"১,২,৩"` style list — Bangla digits joined with the Bangla list separator. */
export function formatNumberList(values: number[]): string {
  return values.map((v) => toBanglaDigits(v)).join("، ");
}

/** Bangla ordinal suffix used for chapter labels, e.g. `ষষ্ঠ`. */
export function banglaChapterLabel(chapter: number): string {
  return `${toBanglaDigits(chapter)} নম্বর অধ্যায়`;
}
