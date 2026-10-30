import { describe, expect, it } from "vitest";
import { buildPaperDoc, subjectLabel, type PaperSelectionItem } from "@/lib/paper/model";
import {
  CHOICE_GENERAL_INSTRUCTIONS,
  DEFAULT_GENERAL_INSTRUCTIONS,
} from "@/lib/paper/sections";
import { defaultPaperSettings } from "@/lib/schemas/paper";
import type { QuestionRecord } from "@/lib/types";

const FLAG_TEXT = "অংশটি বইয়ে আংশিকভাবে আছে; যাচাই করুন";
const CQ_ANSWER = "CQ-ANSWER-SHOULD-NOT-PRINT";
const PART_ANSWER = "PART-ANSWER-SHOULD-NOT-PRINT";
const SQ_ANSWER = "SQ-ANSWER-SHOULD-NOT-PRINT";

function cq(): QuestionRecord {
  return {
    id: "chem-06-cq-001",
    subject: "chemistry",
    chapter: 6,
    type: "CQ",
    stars: null,
    boards: ["বরিশাল বোর্ড ২০২৬"],
    question: null,
    stem: ["উদ্দীপক:", "(ii)"],
    imagePath: "chem-06-cq-001.png",
    imageDesc: "চিত্র",
    flags: [{ id: "f1", text: FLAG_TEXT, createdAt: "2026-01-01T00:00:00.000Z" }],
    answer: CQ_ANSWER,
    options: null,
    correctOption: null,
    parts: [
      { questionId: "chem-06-cq-001", position: 1, label: "ক", marks: 1, text: "প্রশ্ন ক", answer: PART_ANSWER },
      { questionId: "chem-06-cq-001", position: 2, label: "খ", marks: 2, text: "প্রশ্ন খ", answer: PART_ANSWER },
      { questionId: "chem-06-cq-001", position: 3, label: "গ", marks: 3, text: "প্রশ্ন গ", answer: null },
    ],
  };
}

function sq(): QuestionRecord {
  return {
    id: "chem-06-sq-001",
    subject: "chemistry",
    chapter: 6,
    type: "SQ",
    stars: null,
    boards: [],
    question: "সংক্ষিপ্ত প্রশ্ন",
    stem: [],
    imagePath: null,
    imageDesc: null,
    flags: [],
    answer: SQ_ANSWER,
    options: null,
    correctOption: null,
    parts: [],
  };
}

function mcq(id = "chem-06-mcq-001"): QuestionRecord {
  return {
    id,
    subject: "chemistry",
    chapter: 6,
    type: "MCQ",
    stars: null,
    boards: [],
    question: "পানির সংকেত কোনটি?",
    stem: ["i. বরফ", "ii. জল", "নিচের কোনটি সঠিক?"],
    imagePath: null,
    imageDesc: null,
    flags: [{ id: "f2", text: FLAG_TEXT, createdAt: "2026-01-01T00:00:00.000Z" }],
    answer: "MCQ-ANSWER-SHOULD-NOT-PRINT",
    options: [
      { label: "ক", text: "H2O" },
      { label: "খ", text: "CO2" },
      { label: "গ", text: "NaCl" },
      { label: "ঘ", text: "NH3" },
    ],
    correctOption: "ক",
    parts: [],
  };
}

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

const items: PaperSelectionItem[] = [
  { question: cq(), selectedParts: [], section: null },
  { question: sq(), selectedParts: [], section: null },
];

describe("paper header subject label", () => {
  it("prints Bangla instead of the stored subject id", () => {
    expect(subjectLabel("chemistry")).toBe("রসায়ন");
    expect(subjectLabel("physics")).toBe("পদার্থবিজ্ঞান");
    expect(subjectLabel("math")).toBe("গণিত");
    expect(subjectLabel("Higher Math")).toBe("উচ্চতর গণিত");
    expect(subjectLabel("higher_math")).toBe("উচ্চতর গণিত");
    // Unknown ids are printed as stored — never guessed or dropped.
    expect(subjectLabel("ict")).toBe("ict");
  });
});

describe("paper document model", () => {
  it("never exposes admin flags to the printed document", () => {
    const doc = buildPaperDoc(items, defaultPaperSettings(), META);
    const serialized = JSON.stringify(doc);
    expect(serialized).not.toContain(FLAG_TEXT);
    expect(serialized).not.toContain("flags");
  });

  it("hides answers by default, including CQ part answers", () => {
    const doc = buildPaperDoc(items, defaultPaperSettings(), META);
    const serialized = JSON.stringify(doc);
    expect(serialized).not.toContain(CQ_ANSWER);
    expect(serialized).not.toContain(PART_ANSWER);
    expect(serialized).not.toContain(SQ_ANSWER);
    expect(doc.meta.showAnswers).toBe(false);
    expect(doc.sets[0]?.sections.find((s) => s.type === "CQ")?.questions[0]?.answer).toBeNull();
  });

  it("prints answers only when the single master flag is on — and still no flags", () => {
    const settings = { ...defaultPaperSettings(), showAnswers: true };
    const serialized = JSON.stringify(buildPaperDoc(items, settings, META));
    expect(serialized).toContain(CQ_ANSWER);
    expect(serialized).toContain(PART_ANSWER);
    expect(serialized).toContain(SQ_ANSWER);
    expect(serialized).not.toContain(FLAG_TEXT);
    expect(serialized).not.toContain(`"flags"`);
  });

  it("counts CQ parts and SQ marks into the paper total with sequential numbering", () => {
    const doc = buildPaperDoc(items, defaultPaperSettings(), META);
    const set = doc.sets[0]!;
    const cqSection = set.sections.find((s) => s.type === "CQ")!;
    const sqSection = set.sections.find((s) => s.type === "SQ")!;
    expect(cqSection.questions[0]!.marks).toBe(6);
    expect(cqSection.questions[0]!.parts.map((p) => p.label)).toEqual(["ক", "খ", "গ"]);
    expect(sqSection.questions[0]!.marks).toBe(2);
    expect(set.totalMarks).toBe(8);
    expect(doc.meta.totalMarks).toBe(0); // caller-supplied header total, untouched by the model
  });

  it("honours per-question part selection", () => {
    const selected: PaperSelectionItem[] = [{ question: cq(), selectedParts: ["ক", "খ"], section: null }];
    const cqOnly = buildPaperDoc(selected, defaultPaperSettings(), META);
    const q = cqOnly.sets[0]!.sections[0]!.questions[0]!;
    expect(q.parts.map((p) => p.label)).toEqual(["ক", "খ"]);
    expect(q.marks).toBe(3);
  });

  it("prints an exam section line derived from the heading's N, never a second number", () => {
    const settings = {
      ...defaultPaperSettings(),
      cqChoice: 1,
      sqChoice: 1,
      cqInstruction: "যেকোনো ১টি প্রশ্নের উত্তর দাও",
      sqInstruction: "যেকোনো ১টি প্রশ্নের উত্তর দাও",
    };
    const doc = buildPaperDoc(items, settings, META);
    const cqSection = doc.sets[0]!.sections.find((s) => s.type === "CQ")!;
    expect(doc.meta.mode).toBe("exam");
    expect(cqSection.heading).toContain("যেকোনো ১টি");
    // N (১) equals the questions in the section (১): the line spells out what
    // the heading's choice formula already says.
    expect(cqSection.instruction).toBe("সবগুলো প্রশ্নের উত্তর দাও");
  });

  it("drops the section line when it would only repeat the heading's choice", () => {
    const twoCq = [...items, { question: cq(), selectedParts: [], section: null }];
    const settings = {
      ...defaultPaperSettings(),
      cqChoice: 1,
      // Saved with ৩ while the heading says ১ — the old bug.
      cqInstruction: "যেকোনো ৩টি প্রশ্নের উত্তর দাও",
      grouping: "type" as const,
    };
    const doc = buildPaperDoc(twoCq, settings, META);
    const cqSection = doc.sets[0]!.sections.find((s) => s.type === "CQ")!;
    expect(cqSection.heading).toContain("যেকোনো ১টি");
    expect(cqSection.heading).not.toContain("৩টি");
    expect(cqSection.instruction).toBeNull();
  });

  it("keeps teacher-written wording but re-derives its N from the heading", () => {
    const twoCq = [...items, { question: cq(), selectedParts: [], section: null }];
    const settings = {
      ...defaultPaperSettings(),
      cqChoice: 1,
      cqInstruction: "যেকোনো ৩টি প্রশ্নের উত্তর দাও; খাতায় কারণ দেখাও।",
      grouping: "type" as const,
    };
    const cqSection = buildPaperDoc(twoCq, settings, META).sets[0]!.sections.find(
      (s) => s.type === "CQ",
    )!;
    expect(cqSection.instruction).toBe("যেকোনো ১টি প্রশ্নের উত্তর দাও; খাতায় কারণ দেখাও।");
  });

  it("swaps the untouched default general instruction when a section has a choice", () => {
    const twoCq = [...items, { question: cq(), selectedParts: [], section: null }];
    const base = {
      ...defaultPaperSettings(),
      cqChoice: 1,
      grouping: "type" as const,
    };
    const metaWith = (instructions: string) => ({ ...META, instructions });

    const withChoice = buildPaperDoc(twoCq, base, metaWith(DEFAULT_GENERAL_INSTRUCTIONS));
    expect(withChoice.meta.instructions).toBe(CHOICE_GENERAL_INSTRUCTIONS);

    // Teacher-edited text is never rewritten.
    const edited = buildPaperDoc(twoCq, base, metaWith("নিজের নির্দেশনা।"));
    expect(edited.meta.instructions).toBe("নিজের নির্দেশনা।");

    // No choice anywhere → the default stays as written.
    const noChoice = buildPaperDoc(items, base, metaWith(DEFAULT_GENERAL_INSTRUCTIONS));
    expect(noChoice.meta.instructions).toBe(DEFAULT_GENERAL_INSTRUCTIONS);
  });

  it("prints an MCQ section with four options, ১ mark each and never the answer", () => {
    const settings = { ...defaultPaperSettings(), grouping: "type" as const };
    const doc = buildPaperDoc(
      [
        { question: mcq("chem-06-mcq-001"), selectedParts: [], section: null },
        { question: mcq("chem-06-mcq-002"), selectedParts: [], section: "MCQ" },
        { question: sq(), selectedParts: [], section: null },
      ],
      settings,
      META,
    );
    const set = doc.sets[0]!;
    // Default type order is MCQ → SQ → CQ.
    expect(set.sections.map((s) => s.type)).toEqual(["MCQ", "SQ"]);
    const section = set.sections[0]!;
    expect(section.questions).toHaveLength(2);
    expect(section.questions[0]!.marks).toBe(1);
    expect(section.questions[0]!.options.map((o) => o.label)).toEqual(["ক", "খ", "গ", "ঘ"]);
    expect(section.questions[0]!.stem.at(-1)).toBe("নিচের কোনটি সঠিক?");
    expect(section.heading).toContain("× ১ = ২");
    expect(section.instruction).toBe("সবগুলো প্রশ্নের উত্তর দাও");
    expect(set.totalMarks).toBe(4);

    const serialized = JSON.stringify(doc);
    expect(serialized).not.toContain("correctOption");
    expect(serialized).not.toContain("উত্তর:");
    expect(serialized).not.toContain(FLAG_TEXT);
    expect(serialized).not.toContain("MCQ-ANSWER-SHOULD-NOT-PRINT");
  });

  it("hides the suggestion-sheet furniture by default", () => {
    const settings = { ...defaultPaperSettings(), mode: "suggestion" as const };
    const doc = buildPaperDoc(items, settings, META);
    const cqSection = doc.sets[0]!.sections.find((s) => s.type === "CQ")!;
    expect(cqSection.heading).not.toContain("যেকোনো");
    expect(cqSection.instruction).toBeNull();
    expect(doc.meta.suggestion).toEqual({
      showTime: false,
      showMarks: false,
      showInstructions: false,
      showChoice: false,
      showTotal: false,
    });
  });

  it("brings the choice line back when the suggestion flag is on", () => {
    const settings = {
      ...defaultPaperSettings(),
      mode: "suggestion" as const,
      cqChoice: 1,
      cqInstruction: "যেকোনো ১টি প্রশ্নের উত্তর দাও",
      suggestion: { ...defaultPaperSettings().suggestion, showChoice: true },
    };
    const doc = buildPaperDoc(items, settings, META);
    const cqSection = doc.sets[0]!.sections.find((s) => s.type === "CQ")!;
    expect(cqSection.heading).toContain("যেকোনো ১টি");
    expect(cqSection.instruction).toBe("সবগুলো প্রশ্নের উত্তর দাও");
  });
});
