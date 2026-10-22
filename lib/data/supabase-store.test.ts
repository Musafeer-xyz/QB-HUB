import { describe, expect, it } from "vitest";
import { mapQuestion, type QuestionRow, type PartRow } from "./supabase-store";

describe("supabase-store row→record mapping", () => {
  it("maps CQ with parts and image", () => {
    const row: QuestionRow = {
      id: "chem-06-cq-001",
      subject: "chemistry",
      chapter: 6,
      type: "CQ",
      stars: 3,
      boards: ["ঢাকা বোর্ড ২০২৬"],
      question: "মোলের ধারণা",
      stem: ["লাইন ১", "লাইন ২"],
      image_path: "chem-06-cq-001.png",
      image_desc: "চিত্র",
      flags: [],
      answer: null,
      options: null,
      correct_option: null,
      source_no: null,
      page: null,
    };
    const parts: PartRow[] = [
      { question_id: "chem-06-cq-001", label: "ক", marks: 1, text: "পার্ট ১", answer: null, position: 0 },
      { question_id: "chem-06-cq-001", label: "খ", marks: 2, text: "পার্ট ২", answer: null, position: 1 },
    ];
    const record = mapQuestion(row, parts);
    expect(record.id).toBe("chem-06-cq-001");
    expect(record.type).toBe("CQ");
    expect(record.stem).toEqual(["লাইন ১", "লাইন ২"]);
    expect(record.imagePath).toBe("chem-06-cq-001.png");
    expect(record.options).toBeNull();
    expect(record.correctOption).toBeNull();
    expect(record.parts).toHaveLength(2);
    expect(record.parts[0]).toBeDefined();
    expect(record.parts[0]!.label).toBe("ক");
    expect(record.parts[0]!.marks).toBe(1);
  });

  it("maps SQ with no parts", () => {
    const row: QuestionRow = {
      id: "chem-06-sq-001",
      subject: "chemistry",
      chapter: 6,
      type: "SQ",
      stars: null,
      boards: ["ঢাকা বোর্ড ২০২৬"],
      question: "প্রশ্ন",
      stem: [],
      image_path: null,
      image_desc: null,
      flags: [],
      answer: null,
      options: null,
      correct_option: null,
      source_no: null,
      page: null,
    };
    const record = mapQuestion(row, []);
    expect(record.type).toBe("SQ");
    expect(record.stem).toEqual([]);
    expect(record.imagePath).toBeNull();
    expect(record.parts).toEqual([]);
  });

  it("maps MCQ with options and correct_option", () => {
    const row: QuestionRow = {
      id: "chem-06-mcq-001",
      subject: "chemistry",
      chapter: 6,
      type: "MCQ",
      stars: null,
      boards: ["ঢাকা বোর্ড ২০২৪"],
      question: "কোনটি সঠিক?",
      stem: [],
      image_path: null,
      image_desc: null,
      flags: [],
      answer: null,
      options: [
        { label: "ক", text: "HCl" },
        { label: "খ", text: "CH3COOH" },
        { label: "গ", text: "H2CO3" },
        { label: "ঘ", text: "NaHCO3" },
      ],
      correct_option: "গ",
      source_no: 12,
      page: 41,
    };
    const record = mapQuestion(row, []);
    expect(record.type).toBe("MCQ");
    expect(record.options).toEqual([
      { label: "ক", text: "HCl" },
      { label: "খ", text: "CH3COOH" },
      { label: "গ", text: "H2CO3" },
      { label: "ঘ", text: "NaHCO3" },
    ]);
    expect(record.correctOption).toBe("গ");
    expect(record.parts).toEqual([]);
  });

  it("maps MCQ with null correct_option", () => {
    const row: QuestionRow = {
      id: "chem-06-mcq-002",
      subject: "chemistry",
      chapter: 6,
      type: "MCQ",
      stars: null,
      boards: [],
      question: "?",
      stem: [],
      image_path: null,
      image_desc: null,
      flags: [],
      answer: null,
      options: [
        { label: "ক", text: "১" },
        { label: "খ", text: "২" },
        { label: "গ", text: "৩" },
        { label: "ঘ", text: "৪" },
      ],
      correct_option: null,
      source_no: null,
      page: null,
    };
    const record = mapQuestion(row, []);
    expect(record.correctOption).toBeNull();
  });
});
