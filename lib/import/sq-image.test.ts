import { describe, expect, it } from "vitest";
import { normalizeForDb } from "@/lib/import/plan";
import { parseQuestion } from "@/lib/schemas/question";
import { questionRecordFromForm } from "@/lib/data/local-store";
import { mapQuestion, questionRowFromForm, type QuestionRow } from "@/lib/data/supabase-store";
import type { QuestionFormValues } from "@/lib/data/store";

/**
 * An SQ item may carry a figure exactly like a CQ does (same `image` /
 * `image_desc` fields, same `questions.image_path` column). These tests pin the
 * import shape, both stores and the figure-less case.
 */

function sqSource(image?: string, imageDesc?: string): unknown {
  return {
    id: "math-08-sq-006",
    subject: "math",
    chapter: 8,
    type: "SQ",
    stars: 3,
    boards: [],
    question: "চিত্রে $O$ বৃত্তের কেন্দ্র। $\\angle BOC$ এর পরিমাণ কত?",
    image,
    image_desc: imageDesc,
    flags: [],
  };
}

function parsed(image?: string, imageDesc?: string) {
  const result = parseQuestion(sqSource(image, imageDesc));
  if (!result.success) throw new Error(JSON.stringify(result.error.issues));
  return result.data;
}

describe("SQ figures survive parsing and normalizeForDb", () => {
  it("keeps image and image_desc for an SQ with a figure", () => {
    const q = normalizeForDb(parsed("math-08-sq-006.png", "O কেন্দ্রবিশিষ্ট বৃত্ত"), []);
    expect(q.type).toBe("SQ");
    expect(q.image_path).toBe("math-08-sq-006.png");
    expect(q.image_desc).toBe("O কেন্দ্রবিশিষ্ট বৃত্ত");
  });

  it("leaves an SQ without a figure unchanged", () => {
    for (const source of [undefined, "none", ""]) {
      const q = normalizeForDb(parsed(source), []);
      expect(q.type).toBe("SQ");
      expect(q.image_path).toBeNull();
      expect(q.image_desc).toBeNull();
    }
  });
});

describe("SQ figures survive the stores", () => {
  const values: QuestionFormValues = {
    id: "math-08-sq-006",
    subject: "math",
    chapter: 8,
    type: "SQ",
    stars: 3,
    boards: [],
    question: "চিত্রে $O$ বৃত্তের কেন্দ্র",
    stem: [],
    image: "math-08-sq-006.png",
    image_desc: "O কেন্দ্রবিশিষ্ট বৃত্ত",
    explanation: null,
    answer: null,
    options: null,
    correctOption: null,
    parts: [],
  };

  it("local store keeps the figure on an SQ record", () => {
    expect(questionRecordFromForm(values).imagePath).toBe("math-08-sq-006.png");
    expect(questionRecordFromForm(values).imageDesc).toBe("O কেন্দ্রবিশিষ্ট বৃত্ত");
    expect(questionRecordFromForm({ ...values, image: null, image_desc: null }).imagePath).toBeNull();
  });

  it("supabase row mapping keeps the figure (read and write)", () => {
    expect(questionRowFromForm(values).image_path).toBe("math-08-sq-006.png");

    const row: QuestionRow = {
      id: "math-08-sq-006",
      subject: "math",
      chapter: 8,
      type: "SQ",
      stars: 3,
      boards: [],
      question: "চিত্রে $O$ বৃত্তের কেন্দ্র",
      stem: [],
      image_path: "math-08-sq-006.png",
      image_desc: "O কেন্দ্রবিশিষ্ট বৃত্ত",
      flags: [],
      answer: null,
      options: null,
      correct_option: null,
      source_no: null,
      page: null,
    };
    const record = mapQuestion(row, []);
    expect(record.type).toBe("SQ");
    expect(record.imagePath).toBe("math-08-sq-006.png");
  });
});
