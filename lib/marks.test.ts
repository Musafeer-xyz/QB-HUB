import { describe, expect, it } from "vitest";
import { paperTotalMarks, questionMarks, resolveParts } from "@/lib/marks";
import type { QuestionRecord } from "@/lib/types";

const cq: QuestionRecord = {
  id: "chem-06-cq-001",
  subject: "chemistry",
  chapter: 6,
  type: "CQ",
  stars: null,
  boards: [],
  question: null,
  stem: [],
  imagePath: null,
  imageDesc: null,
  flags: [],
  answer: null,
  options: null,
  correctOption: null,
  parts: [
    { questionId: "chem-06-cq-001", position: 0, label: "ক", marks: 1, text: "a", answer: null },
    { questionId: "chem-06-cq-001", position: 1, label: "খ", marks: 2, text: "b", answer: null },
    { questionId: "chem-06-cq-001", position: 2, label: "গ", marks: 3, text: "c", answer: null },
    { questionId: "chem-06-cq-001", position: 3, label: "ঘ", marks: 4, text: "d", answer: null },
  ],
};

const sq: QuestionRecord = { ...cq, id: "chem-06-sq-001", type: "SQ", parts: [] };

describe("marks calculation", () => {
  it("sums all CQ parts by default", () => {
    expect(questionMarks(cq)).toBe(10);
  });

  it("sums only the selected parts", () => {
    expect(questionMarks(cq, { selectedParts: ["ক", "গ"] })).toBe(4);
  });

  it("falls back to all parts when the selection is unknown", () => {
    expect(resolveParts(cq, ["না"])).toHaveLength(4);
    expect(questionMarks(cq, { selectedParts: ["না"] })).toBe(10);
  });

  it("uses the paper-wide SQ marks setting", () => {
    expect(questionMarks(sq)).toBe(2);
    expect(questionMarks(sq, { sqMarks: 3 })).toBe(3);
  });

  it("computes the paper total", () => {
    const total = paperTotalMarks(
      [
        { question: cq, selectedParts: [] },
        { question: cq, selectedParts: ["ক", "খ"] },
        { question: sq, selectedParts: [] },
        { question: sq, selectedParts: [] },
      ],
      { sqMarks: 2 },
    );
    expect(total).toBe(10 + 3 + 2 + 2);
  });
});
