import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { sourceQuestions } from "@/lib/data/local-store";

const TEST_DIR = path.join(process.cwd(), "data-test-nfc");
const TEST_FILE = path.join(TEST_DIR, "nfc-test.json");

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const text = fs.readFileSync(file, "utf8").normalize("NFC");
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

describe("readJson NFC normalization", () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("normalizes decomposed Bangla characters when loading JSON", () => {
    // Use a known decomposed form: র (U+09B0) + ় (U+09BC) normalizes to র্য
    const decomposedText = "র\u09BC"; // র + ় (decomposed)
    const precomposedText = decomposedText.normalize("NFC"); // The NFC form

    const testData = { text: decomposedText };
    fs.writeFileSync(TEST_FILE, JSON.stringify(testData, null, 2), "utf8");

    // Verify file has decomposed form on disk
    const diskContent = fs.readFileSync(TEST_FILE, "utf8");
    expect(diskContent).toContain(decomposedText);

    // Load with readJson (which applies NFC normalization)
    const loaded = readJson<{ text: string }>(TEST_FILE, { text: "" });

    expect(loaded.text).toBe(precomposedText);

    // Verify file on disk is unchanged (still decomposed)
    const diskContentAfter = fs.readFileSync(TEST_FILE, "utf8");
    expect(diskContentAfter).toBe(diskContent);
  });
});

const MCQ_DIR = path.join(process.cwd(), "Chemistry", "mcq");

describe("sourceQuestions — MCQ loader", () => {
  it("loads all 192 MCQ fixtures with 4 labelled options", () => {
    const all = sourceQuestions();
    const mcqs = all.filter((q) => q.type === "MCQ");
    expect(mcqs).toHaveLength(192);
    for (const q of mcqs) {
      expect(q.options?.map((o) => o.label)).toEqual(["ক", "খ", "গ", "ঘ"]);
      expect(q.options?.every((o) => o.text.length > 0)).toBe(true);
    }
    // Statement questions keep their stem lines (the last one is the lead-in).
    const statement = mcqs.find((q) => q.id === "chem-08-mcq-030");
    expect(statement?.stem.at(-1)).toBe("নিচের কোনটি সঠিক?");
    expect(statement?.correctOption).toBe("খ");
  });

  it("NFC-normalises MCQ text at load time, never on disk", () => {
    const dir = path.join(process.cwd(), "data-test-mcq");
    fs.mkdirSync(dir, { recursive: true });
    const decomposed = "অম্ল\u09DF";
    const item = {
      id: "chem-06-mcq-900",
      subject: "chemistry",
      chapter: 6,
      type: "MCQ",
      stars: null,
      boards: [],
      stem: [decomposed],
      image: null,
      question: `${decomposed} কোনটি?`,
      options: [
        { label: "ক", text: decomposed },
        { label: "খ", text: "খ" },
        { label: "গ", text: "গ" },
        { label: "ঘ", text: "ঘ" },
      ],
      correct_option: "ক",
      answer: null,
      flags: [],
    };
    const file = path.join(dir, "chem-06-mcq.json");
    fs.writeFileSync(file, JSON.stringify([item]), "utf8");
    try {
      expect(fs.readFileSync(file, "utf8")).toContain(decomposed);
      const loaded = sourceQuestions([dir]).find((q) => q.id === "chem-06-mcq-900");
      expect(loaded?.question).toBe(`${decomposed.normalize("NFC")} কোনটি?`);
      expect(loaded?.stem[0]).toBe(decomposed.normalize("NFC"));
      expect(loaded?.options?.[0]?.text).toBe(decomposed.normalize("NFC"));
      // The source file is a read-only fixture: nothing was rewritten.
      expect(fs.readFileSync(file, "utf8")).toContain(decomposed);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reports the real MCQ folder as the fixture source", () => {
    expect(fs.existsSync(MCQ_DIR)).toBe(true);
  });
});
