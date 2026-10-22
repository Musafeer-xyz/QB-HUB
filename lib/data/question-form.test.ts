import { describe, expect, it } from "vitest";
import { dropFlag, questionRecordFromForm } from "@/lib/data/local-store";
import type { QuestionFormValues } from "@/lib/data/store";
import type { QuestionRecord } from "@/lib/types";

function values(overrides: Partial<QuestionFormValues>): QuestionFormValues {
  return {
    id: "chem-06-sq-901",
    subject: "chemistry",
    chapter: 6,
    type: "SQ",
    stars: null,
    boards: ["ঢাকা বোর্ড ২০২৪"],
    question: "প্রশ্ন",
    stem: [],
    image: null,
    image_desc: null,
    answer: null,
    options: null,
    correctOption: null,
    parts: [],
    ...overrides,
  };
}

describe("questionRecordFromForm", () => {
  it("keeps an edited SQ question and drops stem/options", () => {
    const record = questionRecordFromForm(values({ question: "সম্পাদিত SQ" }));
    expect(record.type).toBe("SQ");
    expect(record.question).toBe("সম্পাদিত SQ");
    expect(record.stem).toEqual([]);
    expect(record.options).toBeNull();
    expect(record.correctOption).toBeNull();
  });

  it("keeps CQ stem and parts", () => {
    const record = questionRecordFromForm(
      values({
        id: "chem-06-cq-901",
        type: "CQ",
        question: null,
        stem: ["(i) উদ্দীপক"],
        parts: [{ label: "ক", marks: 1, text: "ব্যাখ্যা কর।", answer: null }],
      }),
    );
    expect(record.type).toBe("CQ");
    expect(record.stem).toEqual(["(i) উদ্দীপক"]);
    expect(record.parts).toHaveLength(1);
    expect(record.parts[0]?.questionId).toBe("chem-06-cq-901");
  });

  it("saves MCQ stem, four options and the changed correct option", () => {
    const record = questionRecordFromForm(
      values({
        id: "chem-06-mcq-901",
        type: "MCQ",
        question: "কোনটি সঠিক?",
        stem: ["নিচের কোনটি সঠিক?"],
        options: [
          { label: "ক", text: "HCl" },
          { label: "খ", text: "CH3COOH" },
          { label: "গ", text: "H2CO3" },
          { label: "ঘ", text: "NaHCO3" },
        ],
        correctOption: "গ",
        parts: [],
      }),
    );
    expect(record.type).toBe("MCQ");
    expect(record.stem).toEqual(["নিচের কোনটি সঠিক?"]);
    expect(record.options?.map((o) => o.label)).toEqual(["ক", "খ", "গ", "ঘ"]);
    expect(record.options?.[2]?.text).toBe("H2CO3");
    expect(record.correctOption).toBe("গ");
  });
});

describe("dropFlag", () => {
  const record = {
    id: "chem-06-cq-002",
    flags: [
      { id: "f1", text: "প্রথম", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "f2", text: "দ্বিতীয়", createdAt: "2026-01-01T00:00:00.000Z" },
    ],
  } as QuestionRecord;

  it("removes only the requested flag", () => {
    const after = dropFlag(record, "f1");
    expect(after.flags.map((f) => f.id)).toEqual(["f2"]);
    expect(record.flags).toHaveLength(2);
  });
});
