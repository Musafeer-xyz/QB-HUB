import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { planImport, questionSignature, type DbQuestion, type ExistingQuestion } from "@/lib/import/plan";
import type { QuestionSourceInput } from "@/lib/schemas/question";
import { parseQuestion } from "@/lib/schemas/question";

const DATA_DIR = path.join(__dirname, "..", "..", "data");

function loadFiles(names: string[]): { name: string; items: unknown[] }[] {
  return names.map((name) => ({
    name,
    items: JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8")) as unknown[],
  }));
}

function asExisting(q: QuestionSourceInput, extra?: Partial<ExistingQuestion>): ExistingQuestion {
  const parsed = parseQuestion(q);
  if (!parsed.success) throw new Error("fixture invalid");
  const d = parsed.data;
  const parts =
    d.type === "CQ" ? d.parts.map((p) => ({ label: p.label, marks: p.marks, text: p.text, answer: p.answer })) : [];
  return {
    id: d.id,
    subject: d.subject,
    chapter: d.chapter,
    type: d.type,
    stars: d.stars,
    boards: d.boards,
    question: d.question ?? null,
    stem: d.type === "CQ" ? d.stem : [],
    image_path: d.type === "CQ" ? d.image : null,
    image_desc: d.type === "CQ" ? d.image_desc : null,
    flags: d.flags,
    answer: d.answer,
    options: d.options,
    correct_option: d.correct_option,
    parts,
    ...extra,
  };
}

const chem06 = loadFiles(["chem-06.json"]);

describe("import planning (idempotent upsert)", () => {
  it("inserts every chem-06 item on the first run", () => {
    const plan = planImport(chem06);
    expect(plan.totals.items).toBe(47);
    expect(plan.totals.insert).toBe(47);
    expect(plan.totals.update).toBe(0);
    expect(plan.totals.unchanged).toBe(0);
    expect(plan.entries.every((e) => e.action === "insert")).toBe(true);
    expect(plan.entries.filter((e) => e.question?.type === "CQ")).toHaveLength(19);
    expect(plan.entries.filter((e) => e.question?.type === "SQ")).toHaveLength(28);
  });

  it("marks everything unchanged when re-run against what it wrote", () => {
    const first = planImport(chem06);
    const existing = new Map(
      first.entries.map((e) => [e.id, asExisting(toSource(e))]),
    );
    const second = planImport(chem06, { existing });
    expect(second.totals.insert).toBe(0);
    expect(second.totals.update).toBe(0);
    expect(second.totals.unchanged).toBe(47);
    expect(second.totals.skipped).toBe(0);
  });

  it("updates a question whose text changed", () => {
    const first = planImport(chem06);
    const target = first.entries[0];
    if (!target?.question) throw new Error("missing entry");
    const source = toSource(target);
    const existing = new Map<string, ExistingQuestion>([
      [target.id, asExisting(source)],
    ]);
    const edited = { ...source, question: "সম্পাদিত প্রশ্ন" } as QuestionSourceInput;
    const plan = planImport([{ name: "chem-06.json", items: [edited] }], { existing });
    expect(plan.entries[0]?.action).toBe("update");
  });

  it("reports invalid items as skipped with a reason instead of failing", () => {
    const plan = planImport([
      {
        name: "broken.json",
        items: [
          { id: "chem-06-sq-999", subject: "chemistry", chapter: 6, type: "SQ" }, // no question text
          { id: "chem-06-cq-999", subject: "chemistry", chapter: 6, type: "CQ", stem: [], parts: [] }, // no parts
          { id: "chem-06-sq-998", subject: "chemistry", chapter: 6, type: "SQ", question: "ঠিক আছে" },
        ],
      },
    ]);
    expect(plan.totals.skipped).toBe(2);
    expect(plan.totals.insert).toBe(1);
    expect(plan.entries[0]?.reason).toContain("question");
    expect(plan.entries[1]?.reason).toContain("parts");
  });

  it("flags malformed LaTeX automatically and reports it as a warning", () => {
    const plan = planImport([
      {
        name: "broken-math.json",
        items: [
          {
            id: "chem-06-sq-997",
            subject: "chemistry",
            chapter: 6,
            type: "SQ",
            question: "এটি $\\frac{1}{2$ ভুল সমীকরণ",
            flags: [],
          },
        ],
      },
    ]);
    const entry = plan.entries[0];
    expect(entry?.action).toBe("insert");
    expect(entry?.autoFlags).toHaveLength(1);
    expect(entry?.question?.flags.some((f) => f.text.startsWith("LaTeX পার্স করা যায়নি"))).toBe(true);
  });

  it("keeps admin-added flags across re-imports", () => {
    const first = planImport(chem06);
    const target = first.entries.find((e) => e.question?.type === "SQ");
    if (!target?.question) throw new Error("missing SQ entry");
    const source = toSource(target);
    const existingQuestion = asExisting(source);
    existingQuestion.flags = [
      ...(existingQuestion.flags as unknown[]),
      { id: "manual1", text: "বইয়ের সাথে মিলিয়ে দেখা হয়নি", createdAt: new Date().toISOString() },
    ];
    const second = planImport([{ name: "chem-06.json", items: [source] }], {
      existing: new Map([[target.id, existingQuestion]]),
    });
    expect(second.entries[0]?.question?.flags.some((f) => f.id === "manual1")).toBe(true);
  });

  it("warns when a referenced image file is missing on disk", () => {
    const plan = planImport(chem06, { imageFiles: new Set(["definitely-not-there.png"]) });
    const withImage = plan.entries.filter((e) => e.image);
    expect(withImage.length).toBeGreaterThan(0);
    expect(withImage.every((e) => e.image?.present === false)).toBe(true);
    expect(withImage[0]?.warnings[0]).toContain("ছবি ফাইল পাওয়া যায়নি");
  });

  it("produces a stable signature (so re-imports never churn)", () => {
    const first = planImport(chem06);
    const second = planImport(chem06);
    const a = first.entries.map((e) => (e.question ? questionSignature(e.question) : e.reason));
    const b = second.entries.map((e) => (e.question ? questionSignature(e.question) : e.reason));
    expect(a).toEqual(b);
  });
});

/** Round-trip a plan entry back to a source-shaped object. */
function toSource(entry: { question?: DbQuestion }): QuestionSourceInput {
  const q = entry.question;
  if (!q) throw new Error("entry has no question");
  const common = {
    id: q.id,
    subject: q.subject,
    chapter: q.chapter,
    stars: q.stars,
    boards: q.boards,
    answer: q.answer,
    flags: q.flags.map((f) => f.text),
    options: q.options,
    correct_option: q.correct_option,
  };
  if (q.type === "CQ") {
    return {
      ...common,
      type: "CQ" as const,
      question: q.question,
      stem: q.stem,
      image: q.image_path,
      image_desc: q.image_desc,
      parts: q.parts.map((p) => ({ label: p.label, marks: p.marks, text: p.text, answer: p.answer })),
    };
  }
  if (q.type === "MCQ") {
    return {
      ...common,
      type: "MCQ" as const,
      question: q.question ?? "",
      stem: q.stem,
      image: q.image_path,
      image_desc: q.image_desc,
      options: q.options ?? [],
      correct_option: q.correct_option as "ক" | "খ" | "গ" | "ঘ" | null,
    };
  }
  return { ...common, type: "SQ" as const, question: q.question ?? "" };
}
