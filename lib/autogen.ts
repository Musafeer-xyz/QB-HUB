import type { AutoGenerateInput, AutoRule } from "@/lib/schemas/paper";
import { toBanglaDigits } from "@/lib/bangla";

export type AutogenCandidate = {
  id: string;
  chapter: number;
  type: "CQ" | "SQ" | "MCQ";
  boards: string[];
};

export type AutoGenResult = {
  /** Selected question ids, grouped by rule (CQs before SQs inside a rule). */
  ids: string[];
  warnings: string[];
  /** How many questions each rule actually got, for the UI summary. */
  counts: { chapter: number; wanted: { cq: number; sq: number }; got: { cq: number; sq: number } }[];
};

function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = items[i];
    const b = items[j];
    if (a !== undefined && b !== undefined) {
      items[i] = b;
      items[j] = a;
    }
  }
  return items;
}

/**
 * Pick questions that satisfy "chapter 6: 2 CQ, 5 SQ" style rules.
 *
 * - `board` filters to questions tagged with that board (empty-board questions
 *   are excluded when a board filter is active — see README assumptions).
 * - `excludeUsed` drops ids found in `usedIds` (questions inside saved papers).
 * - `shuffle` randomises within each pool before taking n.
 */
export function autoGenerate(
  candidates: AutogenCandidate[],
  input: AutoGenerateInput,
  opts?: { usedIds?: ReadonlySet<string>; rng?: () => number; },
): AutoGenResult {
  const rng = opts?.rng ?? Math.random;
  const usedIds = opts?.usedIds ?? new Set<string>();
  const warnings: string[] = [];
  const ids: string[] = [];
  const counts: AutoGenResult["counts"] = [];
  const taken = new Set<string>();

  for (const rule of input.rules) {
    const got = { cq: 0, sq: 0 };
    for (const [kind, want] of [
      ["CQ", rule.cq],
      ["SQ", rule.sq],
    ] as const) {
      let pool = candidates.filter((c) => c.chapter === rule.chapter && c.type === kind);

      if (input.board) {
        pool = pool.filter((c) => c.boards.includes(input.board as string));
      }
      if (input.excludeUsed) {
        pool = pool.filter((c) => !usedIds.has(c.id));
      }
      // Never pick the same question twice inside one generation run.
      pool = pool.filter((c) => !taken.has(c.id));

      if (input.shuffle) shuffleInPlace(pool, rng);

      if (pool.length < want) {
        warnings.push(
          `চ্যাপ্টার ${toBanglaDigits(rule.chapter)}-এ ${toBanglaDigits(want)}টি ${kind} চাওয়া হয়েছিল, ` +
            `তবে শুধু ${toBanglaDigits(pool.length)}টি পাওয়া গেছে` +
            (input.board ? ` (“${input.board}” বোর্ড ফিল্টার সহ)` : "") +
            (input.excludeUsed ? ", আগের পেপারে ব্যবহৃতগুলো বাদ দেওয়া হয়েছে" : "") +
            "।",
        );
      }

      for (let i = 0; i < Math.min(want, pool.length); i++) {
        const c = pool[i];
        if (!c) break;
        ids.push(c.id);
        taken.add(c.id);
        if (kind === "CQ") got.cq += 1;
        else got.sq += 1;
      }
    }
    counts.push({ chapter: rule.chapter, wanted: { cq: rule.cq, sq: rule.sq }, got });
  }

  return { ids, warnings, counts };
}

/** Parse a human typed rule line like `৬: 2 CQ, 5 SQ` / `6:2c,5s` into an AutoRule. */
export function parseRuleLine(line: string): AutoRule | null {
  const ascii = line.replace(/[\u09E6-\u09EF]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
  const match = /^\s*(\d{1,2})\s*[:：]\s*(.+)$/.exec(ascii);
  if (!match || !match[1] || !match[2]) return null;
  const chapter = Number(match[1]);
  const rule: AutoRule = { chapter, cq: 0, sq: 0 };
  for (const piece of match[2].split(/[,+]/)) {
    const m = /^\s*(\d+)\s*(cq|c|sq|s|mcq|m)?\s*$/i.exec(piece);
    if (!m || !m[1]) return null;
    const n = Number(m[1]);
    const kind = (m[2] ?? "").toLowerCase();
    if (kind === "cq" || kind === "c") rule.cq += n;
    else if (kind === "sq" || kind === "s") rule.sq += n;
    else if (kind === "" ) rule.sq += n;
    else return null; // MCQ not supported yet
  }
  return rule.cq + rule.sq > 0 ? rule : null;
}
