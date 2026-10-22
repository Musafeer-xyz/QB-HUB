import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KNOWN_QUESTION_KEYS, parseQuestion } from "@/lib/schemas/question";

const DATA_DIR = path.join(__dirname, "..", "..", "data");

const sqItem = {
  id: "chem-06-sq-001",
  subject: "chemistry",
  chapter: 6,
  type: "SQ",
  stars: null,
  boards: ["বরিশাল বোর্ড ২০২৬"],
  question: "প্রমাণ করো যে $\\ce{Na2CO3}$ একটি ক্ষারীয় লবণ।",
  answer: null,
  flags: [],
};

const cqItem = {
  id: "chem-06-cq-001",
  subject: "chemistry",
  chapter: 6,
  type: "CQ",
  stars: 3,
  boards: ["ঢাকা বোর্ড ২০২০"],
  stem: ["(i) $\\ce{H2O}$", "(ii)"],
  image: "chem-06-cq-001.png",
  image_desc: "জলের বিকাশ",
  parts: [
    { label: "ক", marks: 1, text: "কী বলে?", answer: null },
    { label: "খ", marks: 2, text: "ব্যাখ্যা কর।", answer: null },
    { label: "গ", marks: 3, text: "নির্ণয় কর।", answer: null },
    { label: "ঘ", marks: 4, text: "বিশ্লেষণ কর।", answer: null },
  ],
  flags: [],
};

describe("question schema validation", () => {
  it("accepts a valid SQ item", () => {
    const parsed = parseQuestion(sqItem);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe("SQ");
      expect(parsed.data.stars).toBeNull();
      expect(parsed.data.flags).toEqual([]);
    }
  });

  it("accepts a valid CQ item", () => {
    const parsed = parseQuestion(cqItem);
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === "CQ") {
      expect(parsed.data.parts).toHaveLength(4);
      expect(parsed.data.image).toBe("chem-06-cq-001.png");
      expect(parsed.data.image_desc).toBe("জলের বিকাশ");
    }
  });

  it('normalises image: "none", "" and missing to null', () => {
    for (const image of ["none", "NONE", "", null, undefined]) {
      const parsed = parseQuestion({ ...cqItem, image });
      expect(parsed.success).toBe(true);
      if (parsed.success && parsed.data.type === "CQ") expect(parsed.data.image).toBeNull();
    }
  });

  it("defaults missing flags / answer / stem", () => {
    const parsed = parseQuestion({
      id: "chem-08-cq-100",
      subject: "chemistry",
      chapter: 8,
      type: "CQ",
      stem: [],
      parts: [{ label: "ক", marks: 2, text: "কী?" }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === "CQ") {
      expect(parsed.data.flags).toEqual([]);
      expect(parsed.data.answer).toBeNull();
      expect(parsed.data.parts[0]?.answer).toBeNull();
      expect(parsed.data.boards).toEqual([]);
    }
  });

  it("rejects a CQ without parts and an SQ without question text", () => {
    expect(parseQuestion({ ...cqItem, parts: [] }).success).toBe(false);
    const sqNoQuestion: Record<string, unknown> = { ...sqItem };
    delete sqNoQuestion["question"];
    expect(parseQuestion(sqNoQuestion).success).toBe(false);
  });

  it("rejects unknown types and bad ids", () => {
    expect(parseQuestion({ ...sqItem, type: "SAQ" }).success).toBe(false);
    expect(parseQuestion({ ...sqItem, id: "bad id!" }).success).toBe(false);
  });

  it("rejects an unknown key typo set via KNOWN_QUESTION_KEYS", () => {
    const rawKeys = Object.keys({ ...sqItem, brord: [] });
    expect(rawKeys.filter((k) => !(KNOWN_QUESTION_KEYS as readonly string[]).includes(k))).toEqual(["brord"]);
  });
});

const MCQ_DIR = path.join(__dirname, "..", "..", "Chemistry", "mcq");

const mcqItem = {
  id: "chem-06-mcq-001",
  subject: "chemistry",
  chapter: 6,
  type: "MCQ",
  stars: null,
  boards: ["ঢাকা বোর্ড ২০২৪"],
  stem: ["i. গ্রাফাইট", "ii. কয়লা", "নিচের কোনটি সঠিক?"],
  image: null,
  question: "ইলেকট্রনের মাধ্যমে তড়িৎ পরিবহণ করে–",
  options: [
    { label: "ক", text: "i ও ii" },
    { label: "খ", text: "i ও iii" },
    { label: "গ", text: "ii ও iii" },
    { label: "ঘ", text: "i, ii ও iii" },
  ],
  correct_option: "খ",
  answer: null,
  flags: [],
  source_no: 1,
  page: 38,
};

describe("MCQ schema", () => {
  it("accepts a valid MCQ (four labelled options, nullable answer)", () => {
    const parsed = parseQuestion(mcqItem);
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.type === "MCQ") {
      expect(parsed.data.options.map((o) => o.label)).toEqual(["ক", "খ", "গ", "ঘ"]);
      expect(parsed.data.correct_option).toBe("খ");
      expect(parsed.data.stem).toHaveLength(3);
    }
    expect(parseQuestion({ ...mcqItem, correct_option: null }).success).toBe(true);
  });

  it("rejects three options, wrong label order and an unknown answer label", () => {
    expect(parseQuestion({ ...mcqItem, options: mcqItem.options.slice(0, 3) }).success).toBe(false);
    const wrongOrder = mcqItem.options.map((o, i) => ({ ...o, label: ["ক", "গ", "খ", "ঘ"][i] }));
    expect(parseQuestion({ ...mcqItem, options: wrongOrder }).success).toBe(false);
    expect(parseQuestion({ ...mcqItem, correct_option: "ঙ" }).success).toBe(false);
  });
});

describe("shipped data files validate", () => {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  it("has chem-06.json with 47 items (28 SQ + 19 CQ)", () => {
    const items: unknown[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "chem-06.json"), "utf8").normalize("NFC"));
    expect(items).toHaveLength(47);
    expect(items.filter((i) => (i as { type: string }).type === "SQ")).toHaveLength(28);
    expect(items.filter((i) => (i as { type: string }).type === "CQ")).toHaveLength(19);
  });

  it("parses every item of every chem-*.json file", () => {
    const failures: string[] = [];
    let total = 0;
    for (const file of files) {
      const items: unknown[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
      total += items.length;
      items.forEach((item, index) => {
        const parsed = parseQuestion(item);
        if (!parsed.success) {
          failures.push(`${file}[${index}] ${(item as { id?: string }).id ?? "?"}: ${parsed.error.issues[0]?.message}`);
        }
      });
    }
    expect(failures).toEqual([]);
    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(total).toBeGreaterThanOrEqual(142);
  });

  it("parses every one of the 192 MCQ fixtures", () => {
    const mcqFiles = fs.readdirSync(MCQ_DIR).filter((f) => f.endsWith(".json")).sort();
    const failures: string[] = [];
    let total = 0;
    const ids = new Set<string>();
    for (const file of mcqFiles) {
      const items: Record<string, unknown>[] = JSON.parse(
        fs.readFileSync(path.join(MCQ_DIR, file), "utf8").normalize("NFC"),
      );
      for (const item of items) {
        total += 1;
        const parsed = parseQuestion(item);
        if (!parsed.success) failures.push(`${file}:${item["id"]}: ${parsed.error.issues[0]?.message}`);
        for (const key of Object.keys(item)) {
          if (!(KNOWN_QUESTION_KEYS as readonly string[]).includes(key)) {
            failures.push(`${file}:${item["id"]}: unknown key ${key}`);
          }
        }
        if (ids.has(String(item["id"]))) failures.push(`duplicate id ${item["id"]}`);
        ids.add(String(item["id"]));
      }
    }
    expect(failures).toEqual([]);
    expect(total).toBe(192);
  });

  it("uses only known keys in the source files", () => {
    const unknown: string[] = [];
    for (const file of files) {
      const items: Record<string, unknown>[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
      for (const item of items) {
        for (const key of Object.keys(item)) {
          if (!(KNOWN_QUESTION_KEYS as readonly string[]).includes(key)) unknown.push(`${file}:${item["id"]}:${key}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });
});
