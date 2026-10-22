import { describe, expect, it } from "vitest";
import { bankFacets, bankFiltersToQuery, filterBank, parseBankFilters, rowPreview, EMPTY_FILTERS } from "./filter";
import type { QuestionRecord } from "@/lib/types";

/** Synthetic 1,000-question bank: 5 chapters × CQ/SQ/MCQ, varied boards. */
function makeBank(size = 1000): QuestionRecord[] {
  const boards = ["ঢাকা বোর্ড", "চট্টগ্রাম বোর্ড", "রাজশাহী বোর্ড", "বরিশাল বোর্ড"];
  return Array.from({ length: size }, (_, i) => {
    const type = (["CQ", "SQ", "MCQ"] as const)[i % 3]!;
    const chapter = 6 + (i % 5);
    const id = `chem-${String(chapter).padStart(2, "0")}-${type.toLowerCase()}-${String(i).padStart(3, "0")}`;
    return {
      id,
      subject: "chemistry",
      chapter,
      type,
      stars: (i % 5) + 1,
      boards: [boards[i % boards.length]!, boards[(i + 2) % boards.length]!],
      question: type === "CQ" ? null : `প্রশ্ন ${i} — রাসায়নিক বিক্রিয়া`,
      stem: type === "CQ" ? [`উদ্দীপক ${i}: NaCl দ্রবণ`] : [],
      imagePath: i % 7 === 0 ? "figure.png" : null,
      imageDesc: null,
      flags:
        i % 11 === 0
          ? [{ id: `f-${i}`, text: "যাচাই দরকার", createdAt: "2026-01-01T00:00:00.000Z" }]
          : [],
      answer: null,
      options: null,
      correctOption: null,
      parts:
        type === "CQ"
          ? [
              { questionId: id, label: "ক", text: "ব্যাখ্যা করো", marks: 1, position: 1, answer: null },
              { questionId: id, label: "খ", text: "বিশ্লেষণ করো", marks: 2, position: 2, answer: null },
              { questionId: id, label: "গ", text: "গণনা করো", marks: 3, position: 3, answer: null },
              { questionId: id, label: "ঘ", text: "মন্তব্য করো", marks: 4, position: 4, answer: null },
            ]
          : [],
    } satisfies QuestionRecord;
  });
}

describe("filterBank", () => {
  const bank = makeBank();

  it("filters by chapter, type and board in one pass", () => {
    const result = filterBank(
      bank,
      { ...EMPTY_FILTERS, chapters: [7], types: ["CQ"], boards: ["ঢাকা বোর্ড"] },
      "chemistry",
    );
    expect(result.length).toBeGreaterThan(0);
    for (const q of result) {
      expect(q.chapter).toBe(7);
      expect(q.type).toBe("CQ");
      expect(q.boards).toContain("ঢাকা বোর্ড");
    }
  });

  it("searches Bangla text and ids case-insensitively", () => {
    const byId = filterBank(bank, { ...EMPTY_FILTERS, search: "CHEM-07-cq" }, "chemistry");
    expect(byId.length).toBeGreaterThan(0);
    expect(byId.every((q) => q.id.toLowerCase().includes("chem-07-cq"))).toBe(true);

    const byText = filterBank(bank, { ...EMPTY_FILTERS, search: "nacl" }, "chemistry");
    expect(byText.length).toBeGreaterThan(0);
  });

  it("keeps subjects separate", () => {
    expect(filterBank(bank, EMPTY_FILTERS, "physics")).toHaveLength(0);
  });

  it("facets count the subject only", () => {
    const facets = bankFacets(bank, "chemistry");
    expect(facets.total).toBe(1000);
    expect(facets.chapters.reduce((sum, c) => sum + c.total, 0)).toBe(1000);
    expect(facets.types.map((t) => t.type).sort()).toEqual(["CQ", "MCQ", "SQ"]);
  });

  it("rowPreview strips markup-heavy whitespace to one line", () => {
    const preview = rowPreview(bank[0]!);
    expect(preview).toBe("উদ্দীপক 0: NaCl দ্রবণ");
  });

  it("filters 1,000 questions in under 100 ms", () => {
    // Warm up (JIT, string normalization) before timing.
    for (let i = 0; i < 5; i += 1) {
      filterBank(bank, { ...EMPTY_FILTERS, chapters: [6], types: ["SQ"], search: "প্রশ্ন" }, "chemistry");
    }
    const runs = 20;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) {
      const chapters = i % 2 === 0 ? [6] : [6, 7, 8, 9, 10];
      filterBank(
        bank,
        { ...EMPTY_FILTERS, chapters, types: i % 2 === 0 ? ["SQ"] : [], search: i % 3 === 0 ? "বিক্রিয়া" : "" },
        "chemistry",
      );
    }
    const average = (performance.now() - start) / runs;
    expect(average).toBeLessThan(100);
  });
});

describe("URL filter state", () => {
  it("parses the dashboard links (?flagged=1, ?chapter=6) and type filters", () => {
    expect(parseBankFilters("?subject=chemistry&flagged=1")).toMatchObject({
      flagged: true,
      chapters: [],
      types: [],
    });
    expect(parseBankFilters("?chapter=6&type=MCQ")).toMatchObject({ chapters: [6], types: ["MCQ"] });
    expect(parseBankFilters("?chapter=6,7&type=SQ,CQ,MCQ")).toMatchObject({
      chapters: [6, 7],
      types: ["SQ", "CQ", "MCQ"],
    });
    // Unknown types are dropped, not passed into the filter.
    expect(parseBankFilters("?type=BOGUS&stars=9").types).toEqual([]);
    expect(parseBankFilters("?type=BOGUS&stars=9").stars).toBeNull();
  });

  it("round-trips through the query string and drops defaults", () => {
    expect(bankFiltersToQuery(EMPTY_FILTERS)).toBe("");
    const filters = {
      ...EMPTY_FILTERS,
      chapters: [6],
      types: ["MCQ"],
      flagged: true,
      search: "মোল",
    };
    const query = bankFiltersToQuery(filters);
    expect(query).toContain("flagged=1");
    expect(parseBankFilters(query)).toEqual(filters);
  });

  it("turns the flagged filter off when the parameter is absent", () => {
    expect(parseBankFilters("?flagged=1").flagged).toBe(true);
    expect(parseBankFilters("?subject=chemistry").flagged).toBe(false);
  });
});
