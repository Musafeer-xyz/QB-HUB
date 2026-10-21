import { describe, expect, it } from "vitest";
import { autoGenerate, parseRuleLine, type AutogenCandidate } from "@/lib/autogen";

const candidates: AutogenCandidate[] = [
  ...[1, 2, 3, 4].map((n) => ({ id: `chem-06-cq-00${n}`, chapter: 6, type: "CQ" as const, boards: ["ঢাকা বোর্ড ২০২০"] })),
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ id: `chem-06-sq-00${n}`, chapter: 6, type: "SQ" as const, boards: ["ঢাকা বোর্ড ২০২০"] })),
  ...[1, 2].map((n) => ({ id: `chem-07-cq-00${n}`, chapter: 7, type: "CQ" as const, boards: [] })),
  { id: "chem-07-sq-001", chapter: 7, type: "SQ", boards: [] },
];

const rng = () => 0.5; // deterministic "shuffle"

describe("auto-generation rules", () => {
  it("picks the requested number of CQ and SQ per chapter", () => {
    const res = autoGenerate(
      candidates,
      { rules: [{ chapter: 6, cq: 2, sq: 5 }], board: null, excludeUsed: false, shuffle: false },
      { rng },
    );
    expect(res.ids.filter((id) => id.includes("-cq-"))).toHaveLength(2);
    expect(res.ids.filter((id) => id.includes("-sq-"))).toHaveLength(5);
    expect(res.warnings).toEqual([]);
    expect(res.counts[0]?.got).toEqual({ cq: 2, sq: 5 });
  });

  it("warns in Bangla when there are not enough questions", () => {
    const res = autoGenerate(
      candidates,
      { rules: [{ chapter: 7, cq: 5, sq: 2 }], board: null, excludeUsed: false, shuffle: false },
      { rng },
    );
    // chapter 7 has 2 CQ + 1 SQ in the fixture: CQ short by 3, SQ short by 1.
    expect(res.ids).toHaveLength(3);
    expect(res.warnings).toHaveLength(2);
    expect(res.warnings[0]).toContain("চ্যাপ্টার ৭");
  });

  it("applies the board filter", () => {
    const res = autoGenerate(
      candidates,
      { rules: [{ chapter: 6, cq: 4, sq: 0 }], board: "ঢাকা বোর্ড ২০২০", excludeUsed: false, shuffle: false },
      { rng },
    );
    expect(res.ids).toHaveLength(4);

    const none = autoGenerate(
      candidates,
      { rules: [{ chapter: 7, cq: 1, sq: 0 }], board: "ঢাকা বোর্ড ২০২০", excludeUsed: false, shuffle: false },
      { rng },
    );
    expect(none.ids).toHaveLength(0);
    expect(none.warnings[0]).toContain("ঢাকা বোর্ড ২০২০");
  });

  it("excludes questions already used in saved papers", () => {
    const res = autoGenerate(
      candidates,
      { rules: [{ chapter: 6, cq: 4, sq: 0 }], board: null, excludeUsed: true, shuffle: false },
      { rng, usedIds: new Set(["chem-06-cq-001", "chem-06-cq-002"]) },
    );
    expect(res.ids).toEqual(["chem-06-cq-003", "chem-06-cq-004"]);
  });

  it("shuffles deterministically when given an rng", () => {
    const res = autoGenerate(
      candidates,
      { rules: [{ chapter: 6, cq: 3, sq: 3 }], board: null, excludeUsed: false, shuffle: true },
      { rng },
    );
    expect(new Set(res.ids).size).toBe(6);
  });

  it("never selects the same question twice across rules", () => {
    const res = autoGenerate(
      candidates,
      { rules: [
        { chapter: 6, cq: 3, sq: 6 },
        { chapter: 6, cq: 2, sq: 0 },
      ], board: null, excludeUsed: false, shuffle: true },
      { rng },
    );
    expect(new Set(res.ids).size).toBe(res.ids.length);
  });
});

describe("rule line parsing", () => {
  it("parses '6: 2 CQ, 5 SQ'", () => {
    expect(parseRuleLine("6: 2 CQ, 5 SQ")).toEqual({ chapter: 6, cq: 2, sq: 5 });
  });

  it("parses Bangla digits", () => {
    expect(parseRuleLine("৬: ২CQ, ৫SQ")).toEqual({ chapter: 6, cq: 2, sq: 5 });
  });

  it("rejects garbage", () => {
    expect(parseRuleLine("nothing")).toBeNull();
  });
});
