import { describe, it, expect } from "vitest";
import { splitMcqStem } from "./mcq-layout";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

describe("splitMcqStem", () => {
  it("(a) plain question, stem []", () => {
    const result = splitMcqStem([]);
    expect(result).toEqual({
      stimulus: [],
      prompt: [],
      statements: [],
    });
  });

  it("(b) statements + prompt", () => {
    const stem = [
      "i. মুখ খোলা হলে হলুদ কুয়াশার মত ধোঁয়া বের হয়",
      "ii. মুখ খুললে তীব্র ঝাঁজালো গন্ধ পাওয়া যায়",
      "iii. বর্ণ বাদামি হয়",
      "নিচের কোনটি সঠিক?",
    ];
    const result = splitMcqStem(stem);
    expect(result).toEqual({
      stimulus: [],
      prompt: ["নিচের কোনটি সঠিক?"],
      statements: [
        "i. মুখ খোলা হলে হলুদ কুয়াশার মত ধোঁয়া বের হয়",
        "ii. মুখ খুললে তীব্র ঝাঁজালো গন্ধ পাওয়া যায়",
        "iii. বর্ণ বাদামি হয়",
      ],
    });
  });

  it("(c) stimulus + question, no statements", () => {
    const stem = [
      "নিচের উদ্দীপকটি পড়ে প্রশ্নের উত্তর দাও:",
      "$\\ce{2Na + 2H2O -> 2NaOH + H2 ^}$",
    ];
    const result = splitMcqStem(stem);
    expect(result).toEqual({
      stimulus: [
        "নিচের উদ্দীপকটি পড়ে প্রশ্নের উত্তর দাও:",
        "$\\ce{2Na + 2H2O -> 2NaOH + H2 ^}$",
      ],
      prompt: [],
      statements: [],
    });
  });

  it("(d) stimulus + statements + prompt", () => {
    const stem = [
      "নিচের উদ্দীপকটি পড়ে প্রশ্নের উত্তর দাও:",
      "$\\ce{CaCO3 + 2HCl -> CaCl2 + H2O + CO2 ^}$",
      "i. বিক্রিয়াটি একটি অবশ্যম্ভাবী বিক্রিয়া",
      "ii. বিক্রিয়ায় গ্যাস উৎপন্ন হয়",
      "iii. উৎপন্ন লবণটি $\\ce{CCl4}$-এ অদ্রবণীয়",
      "নিচের কোনটি সঠিক?",
    ];
    const result = splitMcqStem(stem);
    expect(result).toEqual({
      stimulus: [
        "নিচের উদ্দীপকটি পড়ে প্রশ্নের উত্তর দাও:",
        "$\\ce{CaCO3 + 2HCl -> CaCl2 + H2O + CO2 ^}$",
      ],
      prompt: ["নিচের কোনটি সঠিক?"],
      statements: [
        "i. বিক্রিয়াটি একটি অবশ্যম্ভাবী বিক্রিয়া",
        "ii. বিক্রিয়ায় গ্যাস উৎপন্ন হয়",
        "iii. উৎপন্ন লবণটি $\\ce{CCl4}$-এ অদ্রবণীয়",
      ],
    });
  });

  it("(e) parenthesised statement markers, e.g. \"(i) ...\"", () => {
    const stem = [
      "(i) এর আণবিক ভর 132",
      "(ii) হতে উদ্ভিদ নাইট্রোজেন ও সালফার গ্রহণ করে",
      "(iii) মাটিতে ব্যবহৃত হয় যখন মাটির pH > 7",
      "নিচের কোনটি সঠিক?",
    ];
    const result = splitMcqStem(stem);
    expect(result).toEqual({
      stimulus: [],
      prompt: ["নিচের কোনটি সঠিক?"],
      statements: [
        "(i) এর আণবিক ভর 132",
        "(ii) হতে উদ্ভিদ নাইট্রোজেন ও সালফার গ্রহণ করে",
        "(iii) মাটিতে ব্যবহৃত হয় যখন মাটির pH > 7",
      ],
    });
  });
});

/** Any roman-numeral list marker, with or without parentheses: i. / i) / (i) */
const ROMAN_MARKER = /^\(?(?:i|ii|iii|iv|v)[.)]\s/i;

describe("splitMcqStem data validation", () => {
  it("every stem line in MCQ JSON files falls into exactly one group", () => {
    const mcqDir = join(process.cwd(), "Chemistry", "mcq");
    const files = readdirSync(mcqDir).filter((f) => f.endsWith(".json"));

    let itemsWithStimulus = 0;
    let itemsWithoutPrompt = 0;
    let totalItems = 0;
    const stimulusReport: string[] = [];

    for (const file of files) {
      const filePath = join(mcqDir, file);
      const content = readFileSync(filePath, "utf-8");
      const items = JSON.parse(content);

      for (const item of items) {
        if (item.type !== "MCQ") continue;
        totalItems++;

        const stem = item.stem || [];
        const { stimulus, prompt, statements } = splitMcqStem(stem);

        // Verify every line falls into exactly one group
        const allGroups = [...stimulus, ...prompt, ...statements];
        expect(allGroups).toHaveLength(stem.length);
        expect(new Set(allGroups)).toEqual(new Set(stem));

        // No stimulus line may actually be a statement in any roman-numeral style.
        for (const line of stimulus) {
          expect(
            ROMAN_MARKER.test(line),
            `${item.id ?? file}: stimulus line looks like a statement: ${line}`,
          ).toBe(false);
        }

        // Track statistics
        if (stimulus.length > 0) {
          itemsWithStimulus++;
          const preview = stimulus
            .map((line) => (line.length > 40 ? `${line.slice(0, 40)}…` : line))
            .join(" | ");
          stimulusReport.push(`  ${item.id ?? file}: ${preview}`);
        }
        if (prompt.length === 0) itemsWithoutPrompt++;
      }
    }

    console.log(`\nMCQ stem analysis:`);
    console.log(`  Total MCQ items: ${totalItems}`);
    console.log(`  Items with non-empty stimulus: ${itemsWithStimulus}`);
    console.log(`  Items without prompt line: ${itemsWithoutPrompt}`);
    console.log(`  Stimulus lines (first 40 chars) for ${stimulusReport.length} items:`);
    for (const line of stimulusReport) console.log(line);
  });
});
