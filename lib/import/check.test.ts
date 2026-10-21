import { describe, expect, it } from "vitest";
import { checkData, type CheckSourceFile } from "@/lib/import/check";

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

function run(items: unknown[], imageFiles?: string[]): ReturnType<typeof checkData> {
  const files: CheckSourceFile[] = [{ name: "chem-06.json", items }];
  return checkData(files, { imageFiles: new Set(imageFiles ?? []) });
}

function problems(result: ReturnType<typeof checkData>): string {
  return result.issues.map((i) => i.problem).join(" | ");
}

describe("checkData — clean data", () => {
  it("accepts a well-formed CQ and SQ", () => {
    const result = run([cq(), sq()], []);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("reports the file and id with every problem", () => {
    const result = run([sq()], []);
    expect(result.errors.every((i) => i.file === "chem-06.json")).toBe(true);
    expect(result.errors.every((i) => i.id === "chem-06-sq-001")).toBe(true);
  });
});

describe("checkData — errors", () => {
  it("flags duplicate ids across files", () => {
    const result = checkData([
      { name: "a.json", items: [sq()] },
      { name: "b.json", items: [sq()] },
    ]);
    const dup = result.errors.find((i) => i.id === "chem-06-sq-001" && i.file === "b.json");
    expect(dup?.problem).toContain("আগেও আছে");
    expect(dup?.problem).toContain("a.json");
  });

  it("rejects ids that do not match subject/chapter/type", () => {
    const chapter = run([sq({ id: "chem-07-sq-001" })]);
    expect(problems(chapter)).toContain("বিষয়/অধ্যায়/ধরনের সাথে মেলে না");

    const type = run([sq({ id: "chem-06-cq-001" })]);
    expect(problems(type)).toContain("বিষয়/অধ্যায়/ধরনের সাথে মেলে না");

    const subject = run([sq({ id: "phy-06-sq-001" })]);
    expect(problems(subject)).toContain("প্রত্যাশিত রূপ: chem-06-sq-001");
  });

  it("detects double-escaped LaTeX", () => {
    const result = run([sq({ question: "সমীকরণ \\\\ce{H2O} লেখ।" })]);
    expect(problems(result)).toContain("ডাবল-এস্কেপ");
  });

  it("rejects characters outside the allowed set, zero-width characters and non-NFC text", () => {
    expect(problems(run([sq({ question: "মোল কী? ź" })]))).toContain("অননুমোদিত অক্ষর");
    expect(problems(run([sq({ question: "মোল\u200B কী?" })]))).toContain("শূন্য-প্রস্থ");
    // U+09DF is the precomposed য় — NFC keeps it decomposed.
    expect(problems(run([sq({ question: "অম্ল\u09DF কেন?" })]))).toContain("NFC");
  });

  it("flags unmatched dollars and KaTeX/mhchem failures", () => {
    expect(problems(run([sq({ question: "মোল $x কী?" })]))).toContain("$ মিলছে না");
    expect(problems(run([sq({ question: "মান $\\notacommand{x}$" })]))).toContain("পার্স হয়নি");
    expect(problems(run([sq({ question: "ভগ্নাংশ $\\frac$ লেখ।" })]))).toContain("পার্স হয়নি");
  });

  it("requires exactly four CQ parts labelled ক খ গ ঘ", () => {
    expect(problems(run([cq({ parts: PARTS.slice(0, 3) })]))).toContain("ঠিক চারটি পার্ট");
    const wrongLabels = PARTS.map((p, i) => ({ ...p, label: ["ক", "গ", "খ", "ঘ"][i] }));
    expect(problems(run([cq({ parts: wrongLabels })]))).toContain("লেবেল ক্রম");
  });

  it("requires four MCQ options and a correct option among the labels", () => {
    const mcq = {
      id: "chem-06-mcq-001",
      subject: "chemistry",
      chapter: 6,
      type: "MCQ",
      question: "পানির সংকেত কোনটি?",
      options: ["H2O", "CO2", "NaCl"],
      correct_option: "ঙ",
    };
    const result = run([mcq]);
    expect(problems(result)).toContain("ঠিক চারটি অপশন");
    expect(problems(result)).toContain("অপশনের লেবেল");
  });

  it("flags image fields whose file is missing", () => {
    const result = run([cq({ image: "chem-06-cq-001.png" })], ["other.png"]);
    expect(problems(result)).toContain("চিত্রের ফাইল পাওয়া যায়নি: images/chem-06-cq-001.png");
    expect(run([cq({ image: "chem-06-cq-001.png" })], ["chem-06-cq-001.png"]).errors).toEqual([]);
  });

  it("reports schema failures with the item id", () => {
    const result = run([{ id: "chem-06-sq-009", type: "SQ" }]);
    expect(result.errors[0]?.id).toBe("chem-06-sq-009");
    expect(result.errors[0]?.problem).toContain("ফর্ম্যাট সঠিক নয়");
  });
});

describe("checkData — warnings", () => {
  it("warns about spacing, short questions and existing flags", () => {
    const result = run([
      sq({ question: "  মোল  কী?  ", flags: ["যাচাই দরকার"] }),
      sq({ id: "chem-06-sq-002", question: "কী?" }),
    ]);
    expect(result.errors).toEqual([]);
    const text = problems(result);
    expect(text).toContain("অতিরিক্ত স্পেস");
    expect(text).toContain("ধারাবাহিক স্পেস");
    expect(text).toContain("৮ অক্ষরের চেয়ে ছোট");
    expect(text).toContain("ফ্ল্যাগ আছে");
  });
});
