import { describe, expect, it } from "vitest";
import { buildImportPreview } from "@/lib/import/preview";
import type { DbQuestion, ExistingQuestion } from "@/lib/import/plan";

const PARTS = [
  { label: "ক", marks: 1, text: "প্রথম অংশের প্রশ্ন" },
  { label: "খ", marks: 2, text: "দ্বিতীয় অংশের প্রশ্ন" },
  { label: "গ", marks: 3, text: "তৃতীয় অংশের প্রশ্ন" },
  { label: "ঘ", marks: 4, text: "চতুর্থ অংশের প্রশ্ন" },
];

function sq(overrides: Record<string, unknown> = {}) {
  return {
    id: "chem-06-sq-001",
    subject: "chemistry",
    chapter: 6,
    type: "SQ",
    boards: ["ঢাকা বোর্ড ২০২৪"],
    question: "মোল কাকে বলে? ব্যাখ্যা কর।",
    flags: [],
    ...overrides,
  };
}

function cq(overrides: Record<string, unknown> = {}) {
  return {
    id: "chem-06-cq-001",
    subject: "chemistry",
    chapter: 6,
    type: "CQ",
    stem: ["উদ্দীপক: $\\ce{CO2}$ গ্যাসের পরিমাণ নির্ণয় কর।"],
    parts: PARTS,
    flags: [],
    ...overrides,
  };
}

/** Stored-shape row, as the data source returns it after a write. */
function existingFrom(question: DbQuestion): ExistingQuestion {
  return {
    id: question.id,
    subject: question.subject,
    chapter: question.chapter,
    type: question.type,
    stars: question.stars,
    boards: question.boards,
    question: question.question,
    stem: question.stem,
    image_path: question.image_path,
    image_desc: question.image_desc,
    flags: question.flags,
    answer: question.answer,
    options: question.options,
    correct_option: question.correct_option,
    parts: question.parts.map((p) => ({
      label: p.label,
      marks: p.marks,
      text: p.text,
      answer: p.answer,
    })),
  };
}

const FILES = [{ name: "chem-06.json", items: [sq(), cq()] }];

describe("import preview", () => {
  it("reports new items with Bangla reasons and writes both", () => {
    const preview = buildImportPreview(FILES);
    expect(preview.totals).toMatchObject({ items: 2, insert: 2, update: 0, unchanged: 0, skipped: 0 });
    expect(preview.entries.map((e) => e.action)).toEqual(["insert", "insert"]);
    expect(preview.entries.every((e) => e.reason === "নতুন প্রশ্ন")).toBe(true);
    expect(preview.writable.map((q) => q.id)).toEqual(["chem-06-sq-001", "chem-06-cq-001"]);
    expect(preview.issues).toEqual([]);
  });

  it("is idempotent: re-importing the same data changes nothing", () => {
    const first = buildImportPreview(FILES);
    const existing = new Map(first.writable.map((q) => [q.id, existingFrom(q)]));
    const second = buildImportPreview(FILES, { existing });

    expect(second.totals).toMatchObject({ insert: 0, update: 0, unchanged: 2, skipped: 0 });
    expect(second.writable).toEqual([]);
    expect(second.entries.every((e) => e.action === "unchanged")).toBe(true);
  });

  it("marks a changed question as update and keeps the rest unchanged", () => {
    const first = buildImportPreview(FILES);
    const existing = new Map(first.writable.map((q) => [q.id, existingFrom(q)]));
    const edited = [
      {
        name: "chem-06.json",
        items: [sq({ question: "মোল কাকে বলে? সংক্ষেপে লেখ।" }), cq()],
      },
    ];
    const preview = buildImportPreview(edited, { existing });

    expect(preview.totals).toMatchObject({ insert: 0, update: 1, unchanged: 1 });
    expect(preview.entries[0]).toMatchObject({
      id: "chem-06-sq-001",
      action: "update",
      reason: "বিদ্যমান প্রশ্ন হালনাগাদ হবে",
    });
    expect(preview.writable.map((q) => q.id)).toEqual(["chem-06-sq-001"]);
  });

  it("reports invalid items with a reason and never writes them", () => {
    const preview = buildImportPreview([
      {
        name: "broken.json",
        items: [sq(), { id: "chem-06-sq-002", type: "SQ" }],
      },
    ]);

    expect(preview.totals).toMatchObject({ items: 2, insert: 1, skipped: 1 });
    const skipped = preview.entries.find((e) => e.action === "skipped");
    expect(skipped?.id).toBe("chem-06-sq-002");
    expect(skipped?.reason).toContain("ফর্ম্যাট সঠিক নয়");
    expect(preview.writable.map((q) => q.id)).toEqual(["chem-06-sq-001"]);
  });

  it("surfaces data-quality errors that block saving", () => {
    const preview = buildImportPreview([
      { name: "bad.json", items: [sq({ question: "মোল $x কী?" })] },
    ]);
    expect(preview.entries[0]?.action).toBe("insert");
    expect(preview.issues.some((i) => i.problem.includes("$ মিলছে না"))).toBe(true);
    expect(preview.writable).toHaveLength(1);
  });

  it("warns about a missing figure but still plans the insert", () => {
    const preview = buildImportPreview([{ name: "chem-06.json", items: [cq({ image: "fig.png" })] }], {
      imageFiles: new Set(),
    });
    expect(preview.entries[0]?.warnings.join(" ")).toContain("ছবি ফাইল পাওয়া যায়নি");
    expect(preview.issues.map((i) => i.problem)).toContain(
      "চিত্রের ফাইল পাওয়া যায়নি: images/fig.png",
    );
  });
});
