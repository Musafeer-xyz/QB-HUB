"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type SelectionEntry = {
  questionId: string;
  /** Subject of the question — a new paper takes its subject from here. */
  subject?: string;
  type: "CQ" | "SQ" | "MCQ";
  chapter: number;
  /** CQ parts: labels + marks, so the tray can total marks without refetching. */
  partMarks: { label: string; marks: number }[];
  /** Only these CQ part labels are included; empty array = all parts. */
  selectedParts: string[];
};

/** “যেকোনো N” per section. `null` = every selected question is answered. */
export type SectionChoice = { CQ: number | null; SQ: number | null; MCQ: number | null };

export const DEFAULT_CHOICE: SectionChoice = { CQ: 3, SQ: 5, MCQ: null };

type SelectionState = {
  entries: SelectionEntry[];
  ready: boolean;
  choice: SectionChoice;
  add: (entry: SelectionEntry) => void;
  remove: (questionId: string) => void;
  clear: () => void;
  /** Wipe the whole draft: no questions and the default section choice. */
  reset: () => void;
  togglePart: (questionId: string, label: string) => void;
  setOrder: (ids: string[]) => void;
  /** Replace the whole selection (used when the builder opens its step ১). */
  replace: (entries: SelectionEntry[]) => void;
  setChoice: (type: "CQ" | "SQ" | "MCQ", value: number | null) => void;
  has: (questionId: string) => boolean;
  count: () => number;
};

/** Fired when the user asks for a brand-new paper, so a mounted builder clears
 * its own title/settings too (the selection is the durable part). */
export const NEW_PAPER_EVENT = "qbhub:new-paper";

const STORAGE_KEY = "qbhub.selection.v2";
/** Previous shape (a bare array) is still read so no selection is lost. */
const LEGACY_KEY = "qbhub.selection.v1";
const SelectionContext = createContext<SelectionState>({
  entries: [],
  ready: false,
  choice: DEFAULT_CHOICE,
  add: () => {},
  remove: () => {},
  clear: () => {},
  reset: () => {},
  togglePart: () => {},
  setOrder: () => {},
  replace: () => {},
  setChoice: () => {},
  has: () => false,
  count: () => 0,
});

export function useSelection() {
  return useContext(SelectionContext);
}

/** Marks for one tray entry (SQ gets the paper-wide sqMarks). */
export function entryMarks(entry: SelectionEntry, sqMarks = 2): number {
  if (entry.type === "MCQ") return 1;
  if (entry.type === "SQ") return sqMarks;
  const wanted = new Set(entry.selectedParts);
  const parts =
    wanted.size === 0 ? entry.partMarks : entry.partMarks.filter((p) => wanted.has(p.label));
  const usable = parts.length > 0 ? parts : entry.partMarks;
  return usable.reduce((sum, p) => sum + p.marks, 0);
}

export function totalSelectionMarks(entries: SelectionEntry[], sqMarks = 2): number {
  return entries.reduce((sum, e) => sum + entryMarks(e, sqMarks), 0);
}

/** Sticky-tray selection, persisted to localStorage so it survives navigation. */
export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<SelectionEntry[]>([]);
  const [choice, setChoiceState] = useState<SectionChoice>(DEFAULT_CHOICE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as
          | SelectionEntry[]
          | { entries?: SelectionEntry[]; choice?: Partial<SectionChoice> };
        const list = Array.isArray(parsed) ? parsed : parsed?.entries;
        if (Array.isArray(list)) {
          setEntries(
            list
              .filter((e) => e && typeof e.questionId === "string")
              .map((e) => ({
                questionId: e.questionId,
                subject: typeof e.subject === "string" ? e.subject : undefined,
                type: e.type === "CQ" || e.type === "MCQ" ? e.type : "SQ",
                chapter: Number(e.chapter) || 0,
                partMarks: Array.isArray(e.partMarks) ? e.partMarks : [],
                selectedParts: Array.isArray(e.selectedParts) ? e.selectedParts : [],
              })),
          );
        }
        if (!Array.isArray(parsed) && parsed?.choice) {
          setChoiceState({
            CQ: parsed.choice.CQ ?? DEFAULT_CHOICE.CQ,
            SQ: parsed.choice.SQ ?? DEFAULT_CHOICE.SQ,
            MCQ: parsed.choice.MCQ ?? DEFAULT_CHOICE.MCQ,
          });
        }
      }
    } catch {
      /* ignore corrupted storage */
    }
    setReady(true);
  }, []);

  // Persist in the background on every change (instant UI, durable draft).
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, choice }));
    } catch {
      /* storage full/blocked — selection just won't persist */
    }
  }, [entries, choice, ready]);

  const setChoice = useCallback((type: "CQ" | "SQ" | "MCQ", value: number | null) => {
    setChoiceState((prev) => ({
      ...prev,
      [type]: value === null ? null : Math.max(1, Math.trunc(value)),
    }));
  }, []);

  const add = useCallback((entry: SelectionEntry) => {
    setEntries((prev) => (prev.some((e) => e.questionId === entry.questionId) ? prev : [...prev, entry]));
  }, []);

  const remove = useCallback((questionId: string) => {
    setEntries((prev) => prev.filter((e) => e.questionId !== questionId));
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  const reset = useCallback(() => {
    setEntries([]);
    setChoiceState(DEFAULT_CHOICE);
  }, []);

  const togglePart = useCallback((questionId: string, label: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.questionId !== questionId) return e;
        const has = e.selectedParts.includes(label);
        return {
          ...e,
          selectedParts: has ? e.selectedParts.filter((l) => l !== label) : [...e.selectedParts, label],
        };
      }),
    );
  }, []);

  const setOrder = useCallback((ids: string[]) => {
    setEntries((prev) => {
      const byId = new Map(prev.map((e) => [e.questionId, e]));
      const next: SelectionEntry[] = [];
      for (const id of ids) {
        const entry = byId.get(id);
        if (entry) {
          next.push(entry);
          byId.delete(id);
        }
      }
      for (const rest of byId.values()) next.push(rest);
      return next;
    });
  }, []);

  const replace = useCallback((next: SelectionEntry[]) => {
    setEntries(
      next
        .filter((e) => e && typeof e.questionId === "string")
        .map((e) => ({
          questionId: e.questionId,
          subject: typeof e.subject === "string" ? e.subject : undefined,
          type: e.type === "CQ" || e.type === "MCQ" ? e.type : "SQ",
          chapter: Number(e.chapter) || 0,
          partMarks: Array.isArray(e.partMarks) ? e.partMarks : [],
          selectedParts: Array.isArray(e.selectedParts) ? e.selectedParts : [],
        })),
    );
  }, []);

  const value = useMemo<SelectionState>(
    () => ({
      entries,
      ready,
      choice,
      add,
      remove,
      clear,
      reset,
      togglePart,
      setOrder,
      setChoice,
      replace,
      has: (id) => entries.some((e) => e.questionId === id),
      count: () => entries.length,
    }),
    [entries, ready, choice, add, remove, clear, reset, togglePart, setOrder, setChoice, replace],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}
