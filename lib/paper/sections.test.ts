import { describe, expect, it } from "vitest";
import { buildPaperDoc, type PaperSelectionItem } from "@/lib/paper/model";
import { computeTotalMarks } from "@/lib/paper/totals";
import {
  CHOICE_GENERAL_INSTRUCTIONS,
  DEFAULT_GENERAL_INSTRUCTIONS,
  findNearDuplicates,
  normalizeQuestionText,
  sectionHeading,
  sectionInstruction,
  generalInstructions,
  sectionsTotal,
  summarizeSection,
} from "@/lib/paper/sections";
import { defaultPaperSettings } from "@/lib/schemas/paper";
import type { QuestionRecord } from "@/lib/types";

const META = {
  institute: "টেস্ট স্কুল",
  logoSrc: null,
  examName: "মডেল টেস্ট",
  className: "দশম",
  subjectLabel: "রসায়ন",
  date: null,
  time: null,
  durationMinutes: 120,
  totalMarks: 0,
  instructions: null,
};

function cq(id: string, partMarks: number[], boards: string[] = ["ঢাকা বোর্ড ২০২৪"]): QuestionRecord {
  return {
    id,
    subject: "chemistry",
    chapter: 6,
    type: "CQ",
    stars: null,
    boards,
    question: null,
    stem: ["উদ্দীপক"],
    imagePath: null,
    imageDesc: null,
    flags: [{ id: "f1", text: "FLAG-TEXT", createdAt: "2026-01-01T00:00:00.000Z" }],
    answer: "ANSWER-TEXT",
    options: null,
    correctOption: null,
    parts: partMarks.map((marks, i) => ({
      questionId: id,
      position: i,
      label: ["ক", "খ", "গ", "ঘ"][i] ?? "ঙ",
      marks,
      text: `প্রশ্ন ${id} অংশ ${i}`,
      answer: null,
    })),
  };
}

function sq(id: string, boards: string[] = []): QuestionRecord {
  return {
    id,
    subject: "chemistry",
    chapter: 7,
    type: "SQ",
    stars: null,
    boards,
    question: `সংক্ষিপ্ত প্রশ্ন ${id}`,
    stem: [],
    imagePath: null,
    imageDesc: null,
    flags: [],
    answer: "ANSWER-TEXT",
    options: null,
    correctOption: null,
    parts: [],
  };
}

describe("section summaries", () => {
  it("uses the choice × marks form when every question is worth the same", () => {
    const summary = summarizeSection("CQ", [10, 10, 10, 10, 10], 3);
    expect(summary).toMatchObject({
      count: 5,
      choice: 3,
      marksPerQuestion: 10,
      equalMarks: true,
      totalMarks: 30,
      note: null,
    });
    expect(sectionHeading("ক-বিভাগ — সৃজনশীল প্রশ্ন (CQ)", summary)).toBe(
      "ক-বিভাগ — সৃজনশীল প্রশ্ন (CQ): যেকোনো ৩টি × ১০ = ৩০",
    );
  });

  it("keeps the sum and adds a note when marks differ", () => {
    const summary = summarizeSection("CQ", [6, 3], 1);
    expect(summary.equalMarks).toBe(false);
    expect(summary.marksPerQuestion).toBeNull();
    expect(summary.totalMarks).toBe(9);
    expect(summary.note).toBeTruthy();
    expect(sectionHeading("শিরোনাম", summary)).toBe("শিরোনাম: যেকোনো ১টি; মোট ৯");
  });

  it("falls back to every question when no choice is set and clamps impossible choices", () => {
    expect(summarizeSection("SQ", [2, 2], null).choice).toBe(2);
    expect(summarizeSection("SQ", [2, 2], 9).choice).toBe(2);
    expect(summarizeSection("SQ", [], 3).totalMarks).toBe(0);
    expect(sectionsTotal([summarizeSection("CQ", [10], 1), summarizeSection("SQ", [2, 2], 2)])).toBe(14);
  });
});

describe("duplicate detection", () => {
  it("normalises digits, punctuation and LaTeX away", () => {
    expect(normalizeQuestionText("প্রশ্ন ১: H2O কী?")).toBe(
      normalizeQuestionText("প্রশ্ন ২ — H₂O কী"),
    );
    expect(normalizeQuestionText("$\\ce{C + O2 -> CO2}$ বিক্রিয়া")).toBe(
      normalizeQuestionText("বিক্রিয়া"),
    );
  });

  it("reports pairs with the same normalised text only", () => {
    const pairs = findNearDuplicates([
      { id: "a", text: "মোল কাকে বলে?" },
      { id: "b", text: "মোল কাকে বলে ?" },
      { id: "c", text: "ইথানল পানিতে দ্রবীভূত হয় কেন?" },
    ]);
    expect(pairs).toEqual([{ a: "a", b: "b" }]);
  });
});

describe("paper model: numbering, sources and sets", () => {
  const items: PaperSelectionItem[] = [
    { question: cq("cq-1", [1, 2, 3, 4]), selectedParts: [], section: null },
    { question: cq("cq-2", [1, 2, 3, 4]), selectedParts: [], section: null },
    { question: sq("sq-1"), selectedParts: [], section: null },
    { question: sq("sq-2"), selectedParts: [], section: null },
  ];

  it("prints compact ০১। numbering that continues across sections by default", () => {
    const doc = buildPaperDoc(items, defaultPaperSettings(), META);
    const labels = doc.sets[0]!.sections.flatMap((s) => s.questions.map((q) => q.label));
    expect(labels).toEqual(["০১।", "০২।", "০৩।", "০৪।"]);
  });

  it("restarts numbering per section when asked", () => {
    const settings = { ...defaultPaperSettings(), restartNumbering: true };
    const doc = buildPaperDoc(items, settings, META);
    const cqSection = doc.sets[0]!.sections.find((s) => s.type === "CQ")!;
    const sqSection = doc.sets[0]!.sections.find((s) => s.type === "SQ")!;
    expect(cqSection.questions.map((q) => q.label)).toEqual(["০১।", "০২।"]);
    expect(sqSection.questions.map((q) => q.label)).toEqual(["০১।", "০২।"]);
  });

  it("prints board sources only when the toggle is on, and never flags or answers", () => {
    const off = buildPaperDoc(items, defaultPaperSettings(), META);
    expect(off.sets[0]!.sections[0]!.questions[0]!.source).toEqual([]);

    const settings = { ...defaultPaperSettings(), showSource: true };
    const on = buildPaperDoc(items, settings, META);
    expect(on.sets[0]!.sections[0]!.questions[0]!.source).toEqual(["ঢাকা বোর্ড ২০২৪"]);
    const serialized = JSON.stringify(on);
    expect(serialized).not.toContain("FLAG-TEXT");
    expect(serialized).not.toContain("ANSWER-TEXT");
  });

  it("gives each section a heading with its choice and total", () => {
    const settings = { ...defaultPaperSettings(), cqChoice: 1, sqChoice: 2 };
    const doc = buildPaperDoc(items, settings, META);
    const [cqSection, sqSection] = doc.sets[0]!.sections;
    expect(cqSection!.heading).toContain("যেকোনো ১টি × ১০ = ১০");
    expect(sqSection!.heading).toContain("যেকোনো ২টি × ২ = ৪");
    expect(doc.sets[0]!.totalMarks).toBe(14);
  });

  it("still prints questions added after a set was captured", () => {
    const settings = {
      ...defaultPaperSettings(),
      sets: [{ name: "ক", ids: ["cq-1"] }],
    };
    const doc = buildPaperDoc(items, settings, META);
    expect(doc.sets[0]!.sections.flatMap((s) => s.questions.map((q) => q.id))).toEqual([
      "cq-1",
      "cq-2",
      "sq-1",
      "sq-2",
    ]);
  });

  it("prints only the active set and reflects its code in the header", () => {
    const settings = {
      ...defaultPaperSettings(),
      setCode: "খ",
      sets: [
        { name: "ক", ids: ["cq-1", "cq-2", "sq-1", "sq-2"] },
        { name: "খ", ids: ["cq-2", "cq-1", "sq-2", "sq-1"] },
      ],
    };
    const doc = buildPaperDoc(items, settings, META);
    expect(doc.sets).toHaveLength(1);
    expect(doc.sets[0]!.name).toBe("খ");
    expect(doc.meta.setCode).toBe("খ");
    const cqSection = doc.sets[0]!.sections.find((s) => s.type === "CQ")!;
    expect(cqSection.questions.map((q) => q.id)).toEqual(["cq-2", "cq-1"]);
  });
});

describe("server-side total", () => {
  it("counts choice × marks per section, and the plain sum when marks differ", () => {
    const all = new Map<string, QuestionRecord>([
      ["cq-1", cq("cq-1", [1, 2, 3, 4])],
      ["cq-2", cq("cq-2", [1, 2, 3, 4])],
      ["sq-1", sq("sq-1")],
    ]);
    const questions = [
      { questionId: "cq-1", selectedParts: [] },
      { questionId: "cq-2", selectedParts: [] },
      { questionId: "sq-1", selectedParts: [] },
    ];
    expect(computeTotalMarks(questions, all, { sqMarks: 2, cqChoice: 1, sqChoice: 1 })).toBe(12);
    expect(computeTotalMarks(questions, all, { sqMarks: 2, cqChoice: null, sqChoice: null })).toBe(22);

    const mixed = new Map<string, QuestionRecord>([
      ["cq-1", cq("cq-1", [1, 2, 3, 4])],
      ["cq-3", cq("cq-3", [1, 2])],
    ]);
    expect(
      computeTotalMarks(
        [
          { questionId: "cq-1", selectedParts: [] },
          { questionId: "cq-3", selectedParts: [] },
        ],
        mixed,
        { sqMarks: 2, cqChoice: 1, sqChoice: null },
      ),
    ).toBe(13);
  });
});

describe("section instruction line shares the heading's N", () => {
  const choiceOf = (marks: number[], choice: number | null) =>
    summarizeSection("CQ", marks, choice);

  it("drops the stock line when it would only repeat the heading's choice", () => {
    // Heading: "…: যেকোনো ১টি × ১০ = ১০" — the saved ৩টি line is both wrong
    // and a duplicate, so it goes away entirely.
    const summary = choiceOf([10, 10, 10], 1);
    expect(sectionHeading("ক-বিভাগ", summary)).toContain("যেকোনো ১টি");
    expect(sectionInstruction("যেকোনো ৩টি প্রশ্নের উত্তর দাও", summary)).toBeNull();
  });

  it("writes the all-questions wording when N equals the section length", () => {
    const summary = choiceOf([10, 10, 10], null);
    expect(summary.choice).toBe(summary.count);
    expect(sectionInstruction("যেকোনো ৩টি প্রশ্নের উত্তর দাও", summary)).toBe(
      "সবগুলো প্রশ্নের উত্তর দাও",
    );
    expect(sectionInstruction("  যেকোনো ৫টি প্রশ্নের উত্তর দাও. ", summary)).toBe(
      "সবগুলো প্রশ্নের উত্তর দাও",
    );
  });

  it("keeps teacher-written wording but re-derives a leading N", () => {
    const summary = choiceOf([10, 10, 10], 2);
    expect(sectionInstruction("যেকোনো ৩টি প্রশ্নের উত্তর দাও; খাতায় কারণ দেখাও।", summary)).toBe(
      "যেকোনো ২টি প্রশ্নের উত্তর দাও; খাতায় কারণ দেখাও।",
    );
    // No N to correct: printed exactly as written.
    expect(sectionInstruction("কালিদিয়ে উত্তর দাও", summary)).toBe("কালিদিয়ে উত্তর দাও");
    // Cleared field: no line at all.
    expect(sectionInstruction("   ", summary)).toBeNull();
    expect(sectionInstruction(null, summary)).toBeNull();
  });
});

describe("general instruction line", () => {
  const sectionsWith = (choice: number, count: number) => [
    { summary: summarizeSection("CQ", Array.from({ length: count }, () => 10), choice) },
  ];

  it("replaces the untouched default while any section offers a choice", () => {
    expect(generalInstructions(DEFAULT_GENERAL_INSTRUCTIONS, sectionsWith(3, 5))).toBe(
      CHOICE_GENERAL_INSTRUCTIONS,
    );
    expect(CHOICE_GENERAL_INSTRUCTIONS).toBe("ডান পাশের সংখ্যা পূর্ণমান নির্দেশক।");
    expect(CHOICE_GENERAL_INSTRUCTIONS).not.toContain("সমস্ত প্রশ্নের");
  });

  it("keeps the default when every section answers all of its questions", () => {
    expect(generalInstructions(DEFAULT_GENERAL_INSTRUCTIONS, sectionsWith(5, 5))).toBe(
      DEFAULT_GENERAL_INSTRUCTIONS,
    );
  });

  it("never rewrites text the teacher edited", () => {
    const edited = "সমস্ত প্রশ্নের উত্তর দিতে হবে; খাতা সুন্দর রাখো।";
    expect(generalInstructions(edited, sectionsWith(3, 5))).toBe(edited);
    expect(generalInstructions(null, sectionsWith(3, 5))).toBeNull();
  });
});
