"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PaperDocument } from "@/components/paper/paper-document";
import { BankWorkspace } from "@/components/workspace/bank-workspace";
import { NEW_PAPER_EVENT, useSelection } from "@/components/selection/selection-context";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/toast";
import { savePaperAction, updatePaperAction } from "@/app/actions/papers";
import { autoGenerate } from "@/lib/autogen";
import { toBanglaDigits } from "@/lib/bangla";
import {
  buildPaperDoc,
  subjectLabel,
  type PaperSelectionItem,
  type SuggestionFlags,
} from "@/lib/paper/model";
import {
  DEFAULT_GENERAL_INSTRUCTIONS,
  findNearDuplicates,
} from "@/lib/paper/sections";
import { questionMarks, resolveParts } from "@/lib/marks";
import { questionImageUrl } from "@/lib/images";
import {
  MARGIN_PRESETS,
  PAPER_SIZE_KEYS,
  marginsCss,
  paperDims,
  resolveMargins,
  type MarginPresetKey,
  type PaperMargins,
  type PaperSizeKey,
} from "@/lib/paper/sizes";
import type { PaperSettings } from "@/lib/schemas/paper";
import type { PaperRecord, QuestionRecord } from "@/lib/types";

type BuilderSection = "CQ" | "SQ" | "MCQ";

type BuilderItem = {
  questionId: string;
  section: BuilderSection | null;
  selectedParts: string[];
};

type RuleRow = { chapter: number; cq: number; sq: number };

type BuilderState = {
  title: string;
  institute: string;
  examName: string;
  className: string;
  subject: string;
  date: string;
  time: string;
  durationMinutes: number | null;
  instructions: string;
  cqInstruction: string;
  sqInstruction: string;
  cqChoice: number | null;
  sqChoice: number | null;
  mcqChoice: number | null;
  sqMarks: number;
  columns: "1" | "2";
  columnDivider: boolean;
  restartNumbering: boolean;
  fontSize: "small" | "normal" | "large";
  spacing: "compact" | "normal";
  paperSize: PaperSizeKey;
  marginPreset: MarginPresetKey;
  margins: PaperMargins;
  figureSize: "small" | "medium" | "large";
  keepQuestionTogether: boolean;
  compactHeader: boolean;
  showPageNumbers: boolean;
  suggestion: SuggestionFlags;
  chapterLabel: string;
  chapterLabelTouched: boolean;
  columnsTouched: boolean;
  pageBreakBefore: number[];
  showAnswers: boolean;
  showSource: boolean;
  watermark: boolean;
  setCode: string;
  logoUrl: string | null;
  sets: { name: string; ids: string[] }[];
  mode: "exam" | "suggestion";
  grouping: "chapter" | "type";
  chapterPageBreak: boolean;
  sortBy: "id" | "boards";
  sectionOrder: BuilderSection[];
};

function stateFromPaper(paper: PaperRecord): BuilderState {
  return {
    title: paper.title,
    institute: paper.institute,
    examName: paper.examName,
    className: paper.className,
    subject: paper.subject,
    date: paper.settings.date ?? "",
    time: paper.settings.time ?? "",
    durationMinutes: paper.durationMinutes,
    instructions: paper.settings.instructions ?? "",
    cqInstruction: paper.settings.cqInstruction ?? "",
    sqInstruction: paper.settings.sqInstruction ?? "",
    cqChoice: paper.settings.cqChoice ?? null,
    sqChoice: paper.settings.sqChoice ?? null,
    mcqChoice: paper.settings.mcqChoice ?? null,
    sqMarks: paper.settings.sqMarks,
    columns: paper.settings.columns,
    columnDivider: paper.settings.columnDivider,
    restartNumbering: paper.settings.restartNumbering,
    fontSize: paper.settings.fontSize,
    spacing: paper.settings.spacing,
    paperSize: paper.settings.paperSize,
    marginPreset: paper.settings.marginPreset,
    margins: paper.settings.margins,
    figureSize: paper.settings.figureSize,
    keepQuestionTogether: paper.settings.keepQuestionTogether,
    compactHeader: paper.settings.compactHeader,
    showPageNumbers: paper.settings.showPageNumbers,
    suggestion: paper.settings.suggestion,
    chapterLabel: paper.settings.chapterLabel ?? "",
    chapterLabelTouched: true,
    columnsTouched: true,
    pageBreakBefore: paper.settings.pageBreakBefore,
    showAnswers: paper.settings.showAnswers,
    showSource: paper.settings.showSource,
    watermark: paper.settings.watermark,
    setCode: paper.settings.setCode,
    logoUrl: paper.settings.logoUrl,
    sets: paper.settings.sets,
    mode: paper.settings.mode,
    grouping: paper.settings.grouping,
    chapterPageBreak: paper.settings.chapterPageBreak,
    sortBy: paper.settings.sortBy,
    sectionOrder: paper.settings.sectionOrder,
  };
}

const DEFAULT_STATE: BuilderState = {
  title: "রসায়ন প্রথম পত্র — মডেল টেস্ট",
  institute: "আদর্শ উচ্চ বিদ্যালয়",
  examName: "বার্ষিক পরীক্ষা ২০২৬",
  className: "দশম শ্রেণি",
  subject: "chemistry",
  date: "",
  time: "",
  durationMinutes: 180,
  instructions: DEFAULT_GENERAL_INSTRUCTIONS,
  cqInstruction: "যেকোনো ৩টি প্রশ্নের উত্তর দাও",
  sqInstruction: "যেকোনো ৫টি প্রশ্নের উত্তর দাও",
  cqChoice: 3,
  sqChoice: 5,
  mcqChoice: null,
  sqMarks: 2,
  columns: "1",
  columnDivider: false,
  restartNumbering: false,
  fontSize: "normal",
  spacing: "normal",
  paperSize: "A4" as PaperSizeKey,
  marginPreset: "normal" as MarginPresetKey,
  margins: { ...MARGIN_PRESETS.normal },
  figureSize: "medium" as const,
  keepQuestionTogether: true,
  compactHeader: false,
  showPageNumbers: true,
  suggestion: {
    showTime: false,
    showMarks: false,
    showInstructions: false,
    showChoice: false,
    showTotal: false,
  },
  chapterLabel: "",
  chapterLabelTouched: false,
  columnsTouched: false,
  pageBreakBefore: [],
  showAnswers: false,
  showSource: false,
  watermark: false,
  setCode: "ক",
  logoUrl: null,
  sets: [],
  mode: "exam",
  grouping: "chapter",
  chapterPageBreak: false,
  sortBy: "id",
  sectionOrder: ["MCQ", "SQ", "CQ"],
};

/** Fixed zoom steps offered in the preview toolbar. */
const ZOOM_STEPS = [0.6, 0.75, 0.85, 1];

const MARGIN_LABELS = { top: "উপর", right: "ডান", bottom: "নিচ", left: "বাম" } as const;

function shuffleIds(ids: string[]): string[] {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = next[i];
    const b = next[j];
    if (a && b) {
      next[i] = b;
      next[j] = a;
    }
  }
  return next;
}

/**
 * The paper generator: manual/auto selection on the left, an exact live
 * preview on the right (same page size as print/PDF: A5/A4/B5/Letter).
 * Saving, printing and PDF export all use the same model.
 */
export function PaperBuilder({ initial }: { initial?: PaperRecord }) {
  const router = useRouter();
  const selection = useSelection();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  const [allQuestions, setAllQuestions] = useState<QuestionRecord[]>([]);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [boards, setBoards] = useState<string[]>([]);
  const [availableImages, setAvailableImages] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);
  const [pdfPending, setPdfPending] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [printPending, setPrintPending] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [state, setState] = useState<BuilderState>(initial ? stateFromPaper(initial) : DEFAULT_STATE);
  const [items, setItems] = useState<BuilderItem[]>(
    initial
      ? initial.questions.map((q) => ({
          questionId: q.questionId,
          section:
            q.section === "CQ" || q.section === "SQ" || q.section === "MCQ" ? q.section : null,
          selectedParts: q.selectedParts,
        }))
      : [],
  );
  const [rules, setRules] = useState<RuleRow[]>([{ chapter: 6, cq: 2, sq: 5 }]);
  const [boardFilter, setBoardFilter] = useState("");
  const [excludeUsed, setExcludeUsed] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(true);
  const [appendOnGenerate, setAppendOnGenerate] = useState(false);
  const [zoom, setZoom] = useState(0.85);
  const [dragId, setDragId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const seededStepOne = useRef(false);

  // ?step=2 / ?step=3 deep-links from the workspace panel.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("step");
    const next = Number(raw);
    if (next === 2 || next === 3) setStep(next);
  }, []);

  /**
   * “নতুন পেপার” must always start from scratch. The link already wiped the
   * shared selection; this also resets this mounted builder's title, sections
   * and settings (the component survives same-route navigations).
   */
  useEffect(() => {
    const onNewPaper = () => {
      setState({ ...DEFAULT_STATE });
      setItems([]);
      setRules([{ chapter: 6, cq: 2, sq: 5 }]);
      setBoardFilter("");
      setSavedId(null);
      setPdfError(null);
      setStep(1);
      seededStepOne.current = false;
    };
    window.addEventListener(NEW_PAPER_EVENT, onNewPaper);
    return () => window.removeEventListener(NEW_PAPER_EVENT, onNewPaper);
  }, []);

  /**
   * Step ১ is the workspace: it edits the shared selection. Entering it seeds
   * that selection from the paper being built, then the selection is the source
   * of truth, so the list, the panel and the builder never disagree.
   */
  useEffect(() => {
    if (step !== 1 || !selection.ready) {
      if (step !== 1) seededStepOne.current = false;
      return;
    }
    // Wait for the question index: entries carry part marks, so seeding before
    // it arrives would clear the tray for a paper being edited.
    if (allQuestions.length === 0) return;
    if (!seededStepOne.current) {
      seededStepOne.current = true;
      // A brand-new paper takes its starting point from the tray, so leave the
      // (possibly not-yet-copied) selection alone and let the sync below run.
      if (items.length === 0 && !initial) return;
      const byIdNow = new Map(allQuestions.map((q) => [q.id, q]));
      selection.replace(
        items
          .filter((item) => byIdNow.has(item.questionId))
          .map((item) => {
            const question = byIdNow.get(item.questionId)!;
            return {
              questionId: item.questionId,
              type: item.section ?? question.type,
              chapter: question.chapter,
              partMarks: question.parts.map((p) => ({ label: p.label, marks: p.marks })),
              selectedParts: item.selectedParts,
            };
          }),
      );
      return;
    }
    setItems((prev) => {
      const next = selection.entries.map((entry) => ({
        questionId: entry.questionId,
        section: entry.type,
        selectedParts: entry.selectedParts,
      }));
      const same =
        next.length === prev.length &&
        next.every(
          (item, i) =>
            item.questionId === prev[i]!.questionId && item.section === prev[i]!.section,
        );
      return same ? prev : next;
    });
  }, [step, selection, items, allQuestions, initial]);

  // Load the whole bank once: auto-generation, shuffling and marks all need it.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/questions")
      .then(async (res) => {
        const data: {
          items?: QuestionRecord[];
          usedIds?: string[];
          boards?: string[];
          images?: string[];
          error?: string;
        } = await res.json();
        if (!res.ok) throw new Error(data.error ?? "প্রশ্ন লোড করা যায়নি।");
        if (cancelled) return;
        setAllQuestions(data.items ?? []);
        setUsedIds(new Set(data.usedIds ?? []));
        setBoards(data.boards ?? []);
        setAvailableImages(new Set(data.images ?? []));
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "প্রশ্ন লোড করা যায়নি।");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // New paper: seed from the tray once (localStorage-backed).
  useEffect(() => {
    if (initial || !selection.ready) return;
    setItems((prev) =>
      prev.length > 0
        ? prev
        : selection.entries.map((e) => ({
            questionId: e.questionId,
            section: e.type,
            selectedParts: e.selectedParts,
          })),
    );
  }, [initial, selection.ready, selection.entries]);

  const byId = useMemo(() => new Map(allQuestions.map((q) => [q.id, q])), [allQuestions]);

  const docItems: PaperSelectionItem[] = useMemo(
    () =>
      items
        .map((item) => {
          const question = byId.get(item.questionId);
          return question ? { question, selectedParts: item.selectedParts, section: item.section } : null;
        })
        .filter((v): v is PaperSelectionItem => v !== null),
    [items, byId],
  );

  // Chapter line: auto-filled from the selection until the teacher edits it.
  useEffect(() => {
    if (state.chapterLabelTouched) return;
    const chapters = [...new Set(docItems.map((it) => it.question.chapter))].sort((a, b) => a - b);
    const label = chapters.length > 0 ? `অধ্যায়: ${chapters.map(toBanglaDigits).join(", ")}` : "";
    setState((s) => (s.chapterLabelTouched || s.chapterLabel === label ? s : { ...s, chapterLabel: label }));
  }, [docItems, state.chapterLabelTouched]);

  // Default column count: 2 for SQ-only papers, 1 as soon as a CQ is added.
  useEffect(() => {
    if (state.columnsTouched) return;
    const types = new Set(docItems.map((it) => it.question.type));
    if (types.size === 0) return;
    const wanted: "1" | "2" = types.size === 1 && types.has("SQ") ? "2" : "1";
    setState((s) => (s.columns === wanted ? s : { ...s, columns: wanted }));
  }, [docItems, state.columnsTouched]);

  const settings: PaperSettings = useMemo(
    () => ({
      date: state.date.trim() || null,
      time: state.time.trim() || null,
      logoUrl: state.logoUrl,
      instructions: state.instructions.trim() || null,
      cqInstruction: state.cqInstruction.trim() || null,
      sqInstruction: state.sqInstruction.trim() || null,
      cqChoice: state.cqChoice,
      sqChoice: state.sqChoice,
      mcqChoice: state.mcqChoice,
      sqMarks: state.sqMarks,
      columns: state.columns,
      columnDivider: state.columnDivider,
      restartNumbering: state.restartNumbering,
      fontSize: state.fontSize,
      spacing: state.spacing,
      paperSize: state.paperSize,
      marginPreset: state.marginPreset,
      margins: state.margins,
      figureSize: state.figureSize,
      keepQuestionTogether: state.keepQuestionTogether,
      compactHeader: state.compactHeader,
      showPageNumbers: state.showPageNumbers,
      suggestion: state.suggestion,
      chapterLabel: state.chapterLabel.trim() || null,
      setCode: state.setCode,
      showSource: state.showSource,
      watermark: state.watermark,
      pageBreakBefore: state.pageBreakBefore,
      showAnswers: state.showAnswers,
      sectionOrder: state.sectionOrder,
      sets: state.sets,
      mode: state.mode,
      grouping: state.grouping,
      chapterPageBreak: state.chapterPageBreak,
      sortBy: state.sortBy,
    }),
    [state],
  );

  const model = useMemo(
    () =>
      buildPaperDoc(
        docItems,
        settings,
        {
          institute: state.institute,
          logoSrc: state.logoUrl ? (questionImageUrl(state.logoUrl) ?? state.logoUrl) : null,
          examName: state.examName,
          className: state.className,
          subjectLabel: subjectLabel(state.subject),
          date: state.date.trim() || null,
          time: state.time.trim() || null,
          durationMinutes: state.durationMinutes,
          totalMarks: 0,
          instructions: state.instructions.trim() || null,
        },
        {
          imageSrc: (p) => questionImageUrl(p) ?? "",
          imageAvailable: (_id, p) => (p ? availableImages.has(p) : false),
        },
      ),
    [docItems, settings, state, availableImages],
  );

  const shownTotal = model.sets.reduce((sum, s) => sum + s.totalMarks, 0);
  const previewDims = paperDims(state.paperSize);

  const duplicates = useMemo(
    () =>
      findNearDuplicates(
        docItems.map((it) => ({
          id: it.question.id,
          text: [
            it.question.question ?? "",
            ...it.question.stem,
            ...it.question.parts.map((p) => p.text),
          ].join(" "),
        })),
      ),
    [docItems],
  );

  const chapters = useMemo(() => {
    const set = new Set<number>();
    for (const q of allQuestions) set.add(q.chapter);
    return [...set].sort((a, b) => a - b);
  }, [allQuestions]);

  // ---------------------------------------------------------------- actions
  function setSuggestion(patch: Partial<SuggestionFlags>) {
    setState((s) => ({ ...s, suggestion: { ...s.suggestion, ...patch } }));
  }

  function updateItem(id: string, patch: Partial<BuilderItem>) {
    setItems((prev) => prev.map((it) => (it.questionId === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.questionId !== id));
  }

  function moveItem(id: string, direction: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.questionId === id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const a = next[idx];
      const b = next[target];
      if (!a || !b) return prev;
      next[idx] = b;
      next[target] = a;
      return next;
    });
  }

  function onDropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setItems((prev) => {
      const ids = prev.map((it) => it.questionId);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(to, 0, moved);
      return next;
    });
    setDragId(null);
  }

  function reorderItems(ids: string[]) {
    setItems((prev) => {
      const map = new Map(prev.map((it) => [it.questionId, it]));
      const ordered = ids
        .map((id) => map.get(id))
        .filter((v): v is BuilderItem => Boolean(v));
      for (const item of prev) if (!ids.includes(item.questionId)) ordered.push(item);
      return ordered;
    });
  }

  function shuffleItems() {
    reorderItems(shuffleIds(items.map((it) => it.questionId)));
  }

  /** Set খ: the set-ক order shuffled; set ক itself is kept untouched. */
  function shuffleSetB() {
    const currentIds = items.map((it) => it.questionId);
    const known = new Set(currentIds);
    const baseSet = state.sets.find((s) => s.name === "ক");
    const baseIds = baseSet
      ? [...baseSet.ids.filter((id) => known.has(id)), ...currentIds.filter((id) => !baseSet.ids.includes(id))]
      : currentIds;
    const shuffled = shuffleIds(baseIds);
    reorderItems(shuffled);
    setState((s) => ({
      ...s,
      setCode: "খ",
      sets: [
        { name: "ক", ids: baseIds },
        { name: "খ", ids: shuffled },
      ],
    }));
    push("success", "সেট খ তৈরি হয়েছে — ক্রম শাফল করা হয়েছে।");
  }

  function chooseSet(code: string) {
    if (code === state.setCode) return;
    const target = state.sets.find((s) => s.name === code);
    if (!target) {
      if (code === "খ") shuffleSetB();
      return;
    }
    const currentIds = items.map((it) => it.questionId);
    const known = new Set(currentIds);
    const ids = [...target.ids.filter((id) => known.has(id)), ...currentIds.filter((id) => !target.ids.includes(id))];
    reorderItems(ids);
    setState((s) => ({
      ...s,
      setCode: code,
      sets: [...s.sets.filter((x) => x.name !== s.setCode), { name: s.setCode, ids: currentIds }],
    }));
  }

  function runAutoGenerate() {
    const candidates = allQuestions.map((q) => ({
      id: q.id,
      chapter: q.chapter,
      type: q.type,
      boards: q.boards,
    }));
    const res = autoGenerate(
      candidates,
      { rules, board: boardFilter || null, excludeUsed, shuffle: shuffleOn },
      { usedIds },
    );
    const selected = res.ids
      .map((id) => byId.get(id))
      .filter((q): q is QuestionRecord => Boolean(q))
      .map<BuilderItem>((q) => ({
        questionId: q.id,
        section: q.type,
        selectedParts: [],
      }));
    setItems((prev) => {
      if (!appendOnGenerate) return selected;
      const existing = new Set(prev.map((i) => i.questionId));
      return [...prev, ...selected.filter((s) => !existing.has(s.questionId))];
    });
    if (res.warnings.length > 0) {
      push("info", res.warnings.join(" "));
    } else {
      push("success", `${toBanglaDigits(selected.length)}টি প্রশ্ন নির্বাচন করা হয়েছে।`);
    }
    if (res.ids.length === 0) push("error", "কোনো প্রশ্ন পাওয়া যায়নি — নিয়ম বা ফিল্টার বদলান।");
  }

  function validate(): string | null {
    if (!state.title.trim()) return "পেপারের নাম দিন।";
    if (items.length === 0) return "অন্তত একটি প্রশ্ন নির্বাচন করুন।";
    return null;
  }

  function buildPayload() {
    return {
      title: state.title.trim(),
      institute: state.institute.trim(),
      examName: state.examName.trim(),
      className: state.className.trim(),
      subject: state.subject,
      durationMinutes: state.durationMinutes,
      totalMarks: shownTotal,
      settings,
      questions: items.map((item) => ({
        questionId: item.questionId,
        section: item.section,
        selectedParts: item.selectedParts,
      })),
    };
  }

  function onSave() {
    const problem = validate();
    if (problem) {
      push("error", problem);
      return;
    }
    startTransition(async () => {
      const payload = buildPayload();
      const res = savedId ? await updatePaperAction(savedId, payload) : await savePaperAction(payload);
      if (!res.ok) {
        push("error", res.message);
        return;
      }
      push("success", res.message);
      if (!savedId) {
        setSavedId(res.id);
        router.replace(`/admin/papers/${res.id}/edit`);
      }
      router.refresh();
    });
  }

  async function onPdf() {
    if (!savedId) {
      push("error", "PDF ডাউনলোডের আগে পেপারটি সংরক্ষণ করুন।");
      return;
    }
    setPdfPending(true);
    setPdfError(null);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId: savedId }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        const message = data.error ?? "PDF তৈরি করা যায়নি।";
        setPdfError(message);
        push("error", message);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.title || "question-paper"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      push("success", "PDF ডাউনলোড হয়েছে।");
    } catch {
      const message = "PDF তৈরি করা যায়নি। ইন্টারনেট বা সার্ভার সমস্যা হতে পারে — আবার চেষ্টা করুন।";
      setPdfError(message);
      push("error", message);
    } finally {
      setPdfPending(false);
    }
  }

  /**
   * “দ্রুত প্রিন্ট”: save, then open the real print view in a new tab with
   * `?print=1`, which opens the print dialog once the sheet is ready. Printing
   * here (window.print on the builder) would print the editor and its preview
   * box, not the paper, so this is the only correct browser-print path.
   */
  async function onQuickPrint() {
    const problem = validate();
    if (problem) {
      push("error", problem);
      return;
    }
    setPrintPending(true);
    try {
      const payload = buildPayload();
      const res = savedId
        ? await updatePaperAction(savedId, payload)
        : await savePaperAction(payload);
      if (!res.ok) {
        push("error", res.message);
        return;
      }
      const id = savedId ?? res.id;
      if (!savedId) {
        setSavedId(res.id);
        router.replace(`/admin/papers/${res.id}/edit`);
      }
      const opened = window.open(`/print/${id}?print=1`, "_blank", "noopener,noreferrer");
      if (!opened) {
        push("error", "পপ-আপ ব্লক হয়েছে — “প্রিন্ট ভিউ” লিংক থেকে খুলুন।");
      }
    } catch {
      push("error", "প্রিন্ট ভিউ খোলা যায়নি — আবার চেষ্টা করুন।");
    } finally {
      setPrintPending(false);
    }
  }

  async function onLogoUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", `logo-${Date.now()}`);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data: { path?: string; error?: string } = await res.json();
    if (!res.ok || !data.path) {
      push("error", data.error ?? "লোগো আপলোড ব্যর্থ।");
      return;
    }
    setState((s) => ({ ...s, logoUrl: data.path ?? null }));
    push("success", "লোগো যুক্ত হয়েছে।");
  }

  // Ctrl/Cmd+S saves without reaching for the mouse (latest-ref pattern).
  const saveRef = useRef<() => void>(() => {});
  saveRef.current = onSave;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ---------------------------------------------------------------- render
  return (
    <>
      <BuilderStepper
        step={step}
        onChange={setStep}
        title={initial ? "পেপার সম্পাদনা" : "নতুন পেপার"}
        itemCount={items.length}
      />

      {step === 1 ? (
        <div className="mt-3 pb-28 min-[1100px]:pb-16">
          <p className="mb-2 text-[12.5px] text-muted">
            তালিকা থেকে প্রশ্নে টিক দিন — ডান পাশের “আমার পেপার” সাথেই আপডেট হবে।
          </p>
          <BankWorkspace
            questions={allQuestions}
            subjectId={state.subject}
            embedded
            loading={allQuestions.length === 0 && !loadError}
          />
        </div>
      ) : (
      <div
        className={cn(
          "mt-3 grid gap-4",
          step === 2 ? "xl:grid-cols-[400px_minmax(0,1fr)]" : "grid-cols-1",
        )}
      >
      <div className={cn("no-print space-y-3 pb-24", step === 3 && "hidden")}>

        {loadError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>
        ) : null}

        {duplicates.length > 0 ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
            <p className="font-semibold">⚠ সম্ভাব্য পুনরাবৃত্তি</p>
            <ul className="mt-1 space-y-0.5">
              {duplicates.map((pair) => (
                <li key={`${pair.a}-${pair.b}`}>
                  <span className="font-mono">{pair.a}</span> ও <span className="font-mono">{pair.b}</span> — একই
                  প্রশ্ন
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[11px]">সংরক্ষণে কোনো বাধা নেই; শুধু সতর্ক করা হচ্ছে।</p>
          </div>
        ) : null}

        <SettingsGroup title="পেপারের তথ্য" defaultOpen>
          <Field label="পেপারের নাম" htmlFor="title">
            <input
              id="title"
              className="field-input"
              value={state.title}
              onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
            />
          </Field>
          <Field label="প্রতিষ্ঠান" htmlFor="institute">
            <input
              id="institute"
              className="field-input"
              value={state.institute}
              onChange={(e) => setState((s) => ({ ...s, institute: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="পরীক্ষার নাম" htmlFor="exam">
              <input
                id="exam"
                className="field-input"
                value={state.examName}
                onChange={(e) => setState((s) => ({ ...s, examName: e.target.value }))}
              />
            </Field>
            <Field label="শ্রেণি" htmlFor="class">
              <input
                id="class"
                className="field-input"
                value={state.className}
                onChange={(e) => setState((s) => ({ ...s, className: e.target.value }))}
              />
            </Field>
            <Field label="বিষয়" htmlFor="subject">
              <input id="subject" className="field-input" value={subjectLabel(state.subject)} readOnly />
            </Field>
            <Field label="অধ্যায় (স্বয়ংক্রিয়, সম্পাদনাযোগ্য)" htmlFor="chapterlabel">
              <input
                id="chapterlabel"
                className="field-input"
                placeholder="অধ্যায়: ৬, ৭"
                value={state.chapterLabel}
                onChange={(e) =>
                  setState((s) => ({ ...s, chapterLabel: e.target.value, chapterLabelTouched: true }))
                }
              />
            </Field>
            <Field label="তারিখ" htmlFor="date">
              <input
                id="date"
                className="field-input"
                value={state.date}
                placeholder="১০/০৩/২০২৬"
                onChange={(e) => setState((s) => ({ ...s, date: e.target.value }))}
              />
            </Field>
            <Field label="সময়" htmlFor="time">
              <input
                id="time"
                className="field-input"
                value={state.time}
                placeholder="সকাল ১০টা"
                onChange={(e) => setState((s) => ({ ...s, time: e.target.value }))}
              />
            </Field>
            <Field label="সময়কাল (মিনিট)" htmlFor="duration">
              <input
                id="duration"
                type="number"
                min={0}
                className="field-input"
                value={state.durationMinutes ?? ""}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    durationMinutes: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </Field>
            <Field label="সেট কোড" htmlFor="setcode">
              <div className="flex gap-1">
                {["ক", "খ"].map((code) => (
                  <button
                    key={code}
                    id={code === "ক" ? "setcode" : undefined}
                    type="button"
                    aria-pressed={state.setCode === code}
                    className={
                      "flex-1 rounded-md border px-2 py-2 text-sm font-semibold " +
                      (state.setCode === code
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
                    }
                    onClick={() => chooseSet(code)}
                  >
                    {code}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn-secondary shrink-0 px-3"
                  onClick={shuffleSetB}
                  disabled={items.length < 2}
                  title="সেট খ-এর জন্য ক্রম শাফল করুন"
                >
                  শাফল
                </button>
              </div>
            </Field>
          </div>

          <Field label="নির্দেশনা (হেডারের নিচে)" htmlFor="instructions">
            <input
              id="instructions"
              className="field-input"
              value={state.instructions}
              onChange={(e) => setState((s) => ({ ...s, instructions: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CQ বিভাগের নির্দেশনা" htmlFor="cqins">
              <input
                id="cqins"
                className="field-input"
                value={state.cqInstruction}
                onChange={(e) => setState((s) => ({ ...s, cqInstruction: e.target.value }))}
              />
            </Field>
            <Field label="SQ বিভাগের নির্দেশনা" htmlFor="sqins">
              <input
                id="sqins"
                className="field-input"
                value={state.sqInstruction}
                onChange={(e) => setState((s) => ({ ...s, sqInstruction: e.target.value }))}
              />
            </Field>
            {state.mode === "exam" ? (
              <Field label="CQ-তে উত্তর দেবে (কতটি)" htmlFor="cqchoice">
              <input
                id="cqchoice"
                type="number"
                min={1}
                className="field-input"
                placeholder="সব"
                value={state.cqChoice ?? ""}
                onChange={(e) =>
                  setState((s) => ({ ...s, cqChoice: e.target.value ? Number(e.target.value) : null }))
                }
              />
              </Field>
            ) : null}
            {state.mode === "exam" ? (
            <Field label="SQ-তে উত্তর দেবে (কতটি)" htmlFor="sqchoice">
              <input
                id="sqchoice"
                type="number"
                min={1}
                className="field-input"
                placeholder="সব"
                value={state.sqChoice ?? ""}
                onChange={(e) =>
                  setState((s) => ({ ...s, sqChoice: e.target.value ? Number(e.target.value) : null }))
                }
              />
              </Field>
            ) : null}
            {state.mode === "exam" ? (
            <Field label="MCQ-তে উত্তর দেবে (কতটি)" htmlFor="mcqchoice">
              <input
                id="mcqchoice"
                type="number"
                min={1}
                className="field-input"
                placeholder="সব"
                value={state.mcqChoice ?? ""}
                onChange={(e) =>
                  setState((s) => ({ ...s, mcqChoice: e.target.value ? Number(e.target.value) : null }))
                }
              />
              </Field>
            ) : null}
          </div>
        </SettingsGroup>

        <SettingsGroup title="লেআউট" defaultOpen>
          <div className="grid grid-cols-2 gap-3">
            <Field label="কাগজের মাপ" htmlFor="papersize">
              <select
                id="papersize"
                className="field-input"
                value={state.paperSize}
                onChange={(e) =>
                  setState((s) => ({ ...s, paperSize: e.target.value as PaperSizeKey }))
                }
              >
                {PAPER_SIZE_KEYS.map((key) => {
                  const d = paperDims(key);
                  return (
                    <option key={key} value={key}>
                      {key} ({toBanglaDigits(d.widthMm)}×{toBanglaDigits(d.heightMm)} মিমি)
                    </option>
                  );
                })}
              </select>
            </Field>
            <Field label="মার্জিন" htmlFor="marginpreset">
              <select
                id="marginpreset"
                className="field-input"
                value={state.marginPreset}
                onChange={(e) =>
                  setState((s) => ({ ...s, marginPreset: e.target.value as MarginPresetKey }))
                }
              >
                <option value="narrow">সংকীর্ণ (৮ মিমি)</option>
                <option value="normal">স্বাভাবিক (১২ মিমি)</option>
                <option value="wide">প্রশস্ত (১৮ মিমি)</option>
                <option value="custom">কাস্টম (নিচে লিখুন)</option>
              </select>
            </Field>
          </div>

          {state.marginPreset === "custom" ? (
            <div className="grid grid-cols-4 gap-2">
              {(["top", "right", "bottom", "left"] as const).map((side) => (
                <label
                  key={side}
                  className="text-[11px] font-medium text-slate-600"
                  htmlFor={`margin-${side}`}
                >
                  {MARGIN_LABELS[side]}
                  <input
                    id={`margin-${side}`}
                    type="number"
                    min={0}
                    max={40}
                    step={0.5}
                    className="field-input mt-1"
                    value={state.margins[side]}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        marginPreset: "custom",
                        margins: { ...s.margins, [side]: Number(e.target.value) || 0 },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label="কলাম" htmlFor="columns">
              <select
                id="columns"
                className="field-input"
                value={state.columns}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    columns: e.target.value as "1" | "2",
                    columnsTouched: true,
                  }))
                }
              >
                <option value="1">১ কলাম</option>
                <option value="2">২ কলাম</option>
              </select>
            </Field>
            <Field label="ফন্ট" htmlFor="font">
              <select
                id="font"
                className="field-input"
                value={state.fontSize}
                onChange={(e) =>
                  setState((s) => ({ ...s, fontSize: e.target.value as "small" | "normal" | "large" }))
                }
              >
                <option value="small">ছোট</option>
                <option value="normal">সাধারণ</option>
                <option value="large">বড়</option>
              </select>
            </Field>
            <Field label="স্পেসিং" htmlFor="spacing">
              <select
                id="spacing"
                className="field-input"
                value={state.spacing}
                onChange={(e) =>
                  setState((s) => ({ ...s, spacing: e.target.value as "compact" | "normal" }))
                }
              >
                <option value="normal">সাধারণ</option>
                <option value="compact">কম্প্যাক্ট</option>
              </select>
            </Field>
            <Field label="ছবির আকার" htmlFor="figuresize">
              <select
                id="figuresize"
                className="field-input"
                value={state.figureSize}
                onChange={(e) =>
                  setState((s) => ({ ...s, figureSize: e.target.value as "small" | "medium" | "large" }))
                }
              >
                <option value="small">ছোট (৪০ মিমি)</option>
                <option value="medium">মাঝারি (৫৫ মিমি)</option>
                <option value="large">বড় (৭৫ মিমি)</option>
              </select>
            </Field>
            <Field label="SQ নম্বর" htmlFor="sqmarks">
              <input
                id="sqmarks"
                type="number"
                min={1}
                max={20}
                className="field-input"
                value={state.sqMarks}
                onChange={(e) => setState((s) => ({ ...s, sqMarks: Number(e.target.value) || 1 }))}
              />
            </Field>
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            <Toggle
              id="divider"
              checked={state.columnDivider}
              onChange={(v) => setState((s) => ({ ...s, columnDivider: v }))}
              label="কলামের মাঝে উল্লম্ব দাগ"
            />
            <Toggle
              id="restart"
              checked={state.restartNumbering}
              onChange={(v) => setState((s) => ({ ...s, restartNumbering: v }))}
              label="প্রতিটি বিভাগে নম্বর ০১ থেকে শুরু"
            />
            <Toggle
              id="pageNumbers"
              checked={state.showPageNumbers}
              onChange={(v) => setState((s) => ({ ...s, showPageNumbers: v }))}
              label="পাতার নম্বর (১ / ৩) নিচে ছাপাও"
            />
            <Toggle
              id="keeptogether"
              checked={state.keepQuestionTogether}
              onChange={(v) => setState((s) => ({ ...s, keepQuestionTogether: v }))}
              label="প্রশ্ন একসাথে রাখো (ভাগ হবে না)"
            />
            <Toggle
              id="compactheader"
              checked={state.compactHeader}
              onChange={(v) => setState((s) => ({ ...s, compactHeader: v }))}
              label="কম্প্যাক্ট হেডার — শ্রেণি · বিষয় · অধ্যায় এক লাইনে"
            />
          </div>
          <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
            পৃষ্ঠা: {state.paperSize} · মার্জিন {marginsCss(resolveMargins(state.marginPreset, state.margins))}
          </p>
        </SettingsGroup>

        <SettingsGroup title="প্রিন্ট অপশন" defaultOpen>
          <div className="space-y-2 text-sm text-slate-700">
            <Toggle
              id="showsource"
              checked={state.showSource}
              onChange={(v) => setState((s) => ({ ...s, showSource: v }))}
              label="প্রশ্নের উৎস দেখাও (যেমন [ঢাকা বোর্ড ২০২৪])"
            />
            <Toggle
              id="watermark"
              checked={state.watermark}
              onChange={(v) => setState((s) => ({ ...s, watermark: v }))}
              label="ওয়াটারমার্ক (প্রতিষ্ঠানের নাম)"
            />
          </div>
          <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
            পূর্ণমান স্বয়ংক্রিয়: <strong>{toBanglaDigits(shownTotal)}</strong>
            {state.mode === "suggestion"
              ? " — সব প্রশ্নের নম্বরের যোগফল।"
              : " — প্রতিটি বিভাগের “যেকোনো N × নম্বর” যোগফল।"}
          </p>
        </SettingsGroup>

        <SettingsGroup title="অ্যাডভান্সড" defaultOpen={false}>

          <SettingsGroup title="মোড ও বিন্যাস" defaultOpen>
            <div className="grid grid-cols-2 gap-3">
              <Field label="মোড" htmlFor="mode">
                <select
                  id="mode"
                  className="field-input"
                  value={state.mode}
                  onChange={(e) => {
                    const mode = e.target.value as "exam" | "suggestion";
                    setState((s) => ({
                      ...s,
                      mode,
                      showSource: mode === "suggestion" ? true : s.showSource,
                    }));
                  }}
                >
                  <option value="exam">পরীক্ষা</option>
                  <option value="suggestion">সাজেশন শীট</option>
                </select>
              </Field>
              <Field label="গ্রুপিং" htmlFor="grouping">
                <select
                  id="grouping"
                  className="field-input"
                  value={state.grouping}
                  onChange={(e) =>
                    setState((s) => ({ ...s, grouping: e.target.value as "chapter" | "type" }))
                  }
                >
                  <option value="chapter">অধ্যায় অনুযায়ী</option>
                  <option value="type">ধরন অনুযায়ী</option>
                </select>
              </Field>
              <Field label="বিভাগের ক্রম" htmlFor="sectionorder">
                <select
                  id="sectionorder"
                  className="field-input"
                  value={state.sectionOrder.join(",")}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      sectionOrder: e.target.value.split(",") as BuilderSection[],
                    }))
                  }
                >
                  <option value="MCQ,SQ,CQ">MCQ → SQ → CQ</option>
                  <option value="CQ,SQ">CQ → SQ</option>
                  <option value="SQ,CQ">SQ → CQ</option>
                  {["MCQ,SQ,CQ", "CQ,SQ", "SQ,CQ"].includes(state.sectionOrder.join(",")) ? null : (
                    <option value={state.sectionOrder.join(",")}>
                      {state.sectionOrder.join(" → ")}
                    </option>
                  )}
                </select>
              </Field>
              <Field label="বিভাগের ভেতরে সাজান" htmlFor="sortby">
                <select
                  id="sortby"
                  className="field-input"
                  value={state.sortBy}
                  onChange={(e) => setState((s) => ({ ...s, sortBy: e.target.value as "id" | "boards" }))}
                >
                  <option value="id">আইডি অনুযায়ী</option>
                  <option value="boards">বেশি বোর্ডে এসেছে</option>
                </select>
              </Field>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <Toggle
                id="chapterbreak"
                checked={state.chapterPageBreak}
                onChange={(v) => setState((s) => ({ ...s, chapterPageBreak: v }))}
                label="প্রতিটি অধ্যায় নতুন পাতায় শুরু"
              />
            </div>
            {state.mode === "suggestion" ? (
              <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                সাজেশন শীটে ডিফল্টভাবে “যেকোনো N” লাইন ছাপা হয় না (নিচের অপশন থেকে চালু করা
                যায়); পূর্ণমান সব প্রশ্নের নম্বরের যোগফল, নম্বর প্রতি বিভাগে ০১ থেকে শুরু।
              </p>
            ) : null}
          </SettingsGroup>

          {state.mode === "suggestion" ? (
            <SettingsGroup title="সাজেশন শীট অপশন" defaultOpen>
              <p className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                সাজেশন শীটে সময়, পূর্ণমান, নির্দেশনা, “যেকোনো N টি” লাইন ও শেষের মোট নম্বর
                ডিফল্টভাবে ছাপা হয় না। দরকার হলে আলাদা করে চালু করুন।
              </p>
              <div className="space-y-2 text-sm text-slate-700">
                <Toggle
                  id="suggtime"
                  checked={state.suggestion.showTime}
                  onChange={(v) => setSuggestion({ showTime: v })}
                  label="সময় দেখাও"
                />
                <Toggle
                  id="suggmarks"
                  checked={state.suggestion.showMarks}
                  onChange={(v) => setSuggestion({ showMarks: v })}
                  label="পূর্ণমান দেখাও"
                />
                <Toggle
                  id="sugginstructions"
                  checked={state.suggestion.showInstructions}
                  onChange={(v) => setSuggestion({ showInstructions: v })}
                  label="নির্দেশনা লাইন দেখাও"
                />
                <Toggle
                  id="suggchoice"
                  checked={state.suggestion.showChoice}
                  onChange={(v) => setSuggestion({ showChoice: v })}
                  label="“যেকোনো N টি” লাইন দেখাও"
                />
                <Toggle
                  id="suggTotal"
                  checked={state.suggestion.showTotal}
                  onChange={(v) => setSuggestion({ showTotal: v })}
                  label="শেষে মোট নম্বর দেখাও"
                />
              </div>
            </SettingsGroup>
          ) : null}
          <Field label="নতুন পাতায় শুরু হবে যে প্রশ্নগুলো (কমা দিয়ে)" htmlFor="breaks">
            <input
              id="breaks"
              className="field-input"
              placeholder="যেমন: ৪, ৮"
              value={state.pageBreakBefore.join(", ")}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  pageBreakBefore: e.target.value
                    .split(",")
                    .map((v) => Number(v.trim()))
                    .filter((n) => Number.isInteger(n) && n > 0),
                }))
              }
            />
          </Field>

          <div>
            <label className="field-label" htmlFor="logo">
              লোগো (ঐচ্ছিক)
            </label>
            <input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="field-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onLogoUpload(file);
              }}
            />
            {state.logoUrl ? (
              <button
                type="button"
                className="mt-1 text-xs text-red-700 underline"
                onClick={() => setState((s) => ({ ...s, logoUrl: null }))}
              >
                লোগো সরান
              </button>
            ) : null}
          </div>

          <label className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
            <input
              type="checkbox"
              checked={state.showAnswers}
              onChange={(e) => setState((s) => ({ ...s, showAnswers: e.target.checked }))}
              className="mt-0.5"
            />
            <span>
              উত্তরসহ প্রিন্ট (ফিচার ফ্ল্যাগ — বন্ধ রাখাই নিরাপদ)। বর্তমানে সব উত্তর null, তাই কিছু
              ছাপা হবে না।
            </span>
          </label>

          <div className="space-y-3 border-t border-slate-100 pt-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">স্বয়ংক্রিয় নির্বাচন</h3>
            {rules.map((rule, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_70px_32px] items-end gap-2">
                <label className="text-xs text-slate-600">
                  অধ্যায়
                  <select
                    className="field-input mt-1"
                    value={rule.chapter}
                    onChange={(e) => {
                      const next = [...rules];
                      next[i] = { ...rule, chapter: Number(e.target.value) };
                      setRules(next);
                    }}
                  >
                    {chapters.map((c) => (
                      <option key={c} value={c}>
                        {toBanglaDigits(c)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-600">
                  CQ
                  <input
                    type="number"
                    min={0}
                    className="field-input mt-1"
                    value={rule.cq}
                    onChange={(e) => {
                      const next = [...rules];
                      next[i] = { ...rule, cq: Number(e.target.value) || 0 };
                      setRules(next);
                    }}
                  />
                </label>
                <label className="text-xs text-slate-600">
                  SQ
                  <input
                    type="number"
                    min={0}
                    className="field-input mt-1"
                    value={rule.sq}
                    onChange={(e) => {
                      const next = [...rules];
                      next[i] = { ...rule, sq: Number(e.target.value) || 0 };
                      setRules(next);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn-secondary h-9 px-2"
                  onClick={() => setRules(rules.filter((_, idx) => idx !== i))}
                  aria-label="নিয়ম সরান"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setRules([...rules, { chapter: chapters[0] ?? 6, cq: 1, sq: 0 }])}
            >
              ＋ নিয়ম
            </button>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
              <label className="col-span-2">
                বোর্ড (ঐচ্ছিক)
                <select
                  className="field-input mt-1"
                  value={boardFilter}
                  onChange={(e) => setBoardFilter(e.target.value)}
                >
                  <option value="">সব বোর্ড</option>
                  {boards.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={excludeUsed}
                  onChange={(e) => setExcludeUsed(e.target.checked)}
                />
                আগের পেপারের প্রশ্ন বাদ
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={shuffleOn}
                  onChange={(e) => setShuffleOn(e.target.checked)}
                />
                শাফল
              </label>
              <label className="col-span-2 flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={appendOnGenerate}
                  onChange={(e) => setAppendOnGenerate(e.target.checked)}
                />
                বর্তমান নির্বাচনের সাথে যোগ করুন
              </label>
            </div>

            <div className="flex gap-2">
              <button type="button" className="btn-primary flex-1" onClick={runAutoGenerate}>
                নিয়ম অনুযায়ী নির্বাচন
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={shuffleItems}
                disabled={items.length < 2}
              >
                শাফল
              </button>
            </div>
          </div>
        </SettingsGroup>

        {/* selected list */}
        <section className="card space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">
              নির্বাচিত প্রশ্ন ({toBanglaDigits(items.length)})
            </h2>
            {items.length > 0 ? (
              <button
                type="button"
                className="text-xs text-red-700 underline"
                onClick={() => setItems([])}
              >
                সব সরান
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="rounded-md bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              কোনো প্রশ্ন নেই — ট্রে থেকে যোগ করুন বা নিয়ম দিয়ে তৈরি করুন।
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((item, index) => {
                const q = byId.get(item.questionId);
                return (
                  <li
                    key={item.questionId}
                    draggable
                    onDragStart={() => setDragId(item.questionId)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDropOn(item.questionId)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1.5"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-slate-500">{toBanglaDigits(index + 1)}</span>
                      <span className="font-mono text-[11px] text-slate-600">{item.questionId}</span>
                      <span className="chip">{item.section ?? q?.type ?? "?"}</span>
                      {q ? <span className="text-slate-500">অধ্যায় {toBanglaDigits(q.chapter)}</span> : null}
                      <span className="ml-auto font-semibold text-slate-700">
                        {q ? toBanglaDigits(questionMarks(q, { selectedParts: item.selectedParts, sqMarks: state.sqMarks })) : "?"} নম্বর
                      </span>
                      <button
                        type="button"
                        onClick={() => moveItem(item.questionId, -1)}
                        aria-label="উপরে নিন"
                        className="px-1 text-slate-500 hover:text-slate-900"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(item.questionId, 1)}
                        aria-label="নিচে নিন"
                        className="px-1 text-slate-500 hover:text-slate-900"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.questionId)}
                        aria-label="সরান"
                        className="px-1 text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                    {q && q.type === "CQ" ? (
                      <div className="mt-1 flex flex-wrap gap-2 pl-8 text-[11px] text-slate-600">
                        {resolveParts(q, null).map((part) => {
                          const active =
                            item.selectedParts.length === 0 || item.selectedParts.includes(part.label);
                          return (
                            <label key={part.label} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => {
                                  const all = q.parts.map((p) => p.label);
                                  const current =
                                    item.selectedParts.length === 0 ? all : item.selectedParts;
                                  const next = current.includes(part.label)
                                    ? current.filter((l) => l !== part.label)
                                    : [...current, part.label];
                                  updateItem(item.questionId, {
                                    selectedParts: next.length === all.length ? [] : next,
                                  });
                                }}
                              />
                              {part.label} ({toBanglaDigits(part.marks)})
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-slate-100 pt-2 text-xs text-slate-600">
            প্রিন্ট হবে —{" "}
            {model.sets.map((s) => (
              <span key={s.name} className="mr-2">
                সেট {s.name}: {s.sections
                  .map((sec) => `${sec.type} ${toBanglaDigits(sec.summary.choice)}×${toBanglaDigits(sec.summary.marksPerQuestion ?? 0)}`)
                  .join(" + ")}{" "}
                = {toBanglaDigits(s.totalMarks)}
              </span>
            ))}
            · মোট <strong>{toBanglaDigits(shownTotal)}</strong> নম্বর
          </p>
        </section>

        {pdfError ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            <span>{pdfError}</span>
            <span className="flex gap-2">
              {/* No Chromium on the host (501): the browser print view always works. */}
              <button type="button" className="btn-primary" onClick={onQuickPrint} disabled={printPending}>
                ব্রাউজার থেকে প্রিন্ট
              </button>
              <button type="button" className="btn-secondary" onClick={onPdf} disabled={pdfPending}>
                আবার চেষ্টা করুন
              </button>
            </span>
          </div>
        ) : null}

      </div>

      {/* live preview — the same page box as print/PDF */}
      <div className="min-w-0">
        <div className="no-print mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            {state.paperSize} লাইভ প্রিভিউ — প্রিন্ট ও PDF-এর সাথে হুবহু মিলবে। মোট নম্বর:{" "}
            <strong>{toBanglaDigits(shownTotal)}</strong>
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <button
              type="button"
              className="btn-secondary h-7 px-2"
              aria-pressed={showGuide}
              onClick={() => setShowGuide((v) => !v)}
              title="প্রিন্ট মার্জিন কোথায় পড়বে দেখায়"
            >
              {showGuide ? "মার্জিন গাইড ✓" : "মার্জিন গাইড"}
            </button>
            <span className="mx-1">জুম</span>
            <button
              type="button"
              className="btn-secondary h-7 px-2"
              aria-label="জুম কমান"
              onClick={() => setZoom(stepZoom(zoom, -1))}
            >
              −
            </button>
            <select
              className="field-input w-20 py-1"
              aria-label="জুম"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              <option value={0.6}>৬০%</option>
              <option value={0.75}>৭৫%</option>
              <option value={0.85}>৮৫%</option>
              <option value={1}>১০০%</option>
            </select>
            <button
              type="button"
              className="btn-secondary h-7 px-2"
              aria-label="জুম বাড়ান"
              onClick={() => setZoom(stepZoom(zoom, 1))}
            >
              ＋
            </button>
          </div>
        </div>
        <div className="print-root paper-preview-shell overflow-auto rounded-lg bg-slate-200 p-4">
          <div
            className={`paper-preview-frame relative mx-auto bg-white shadow-lg ${previewDims.cssClass}`}
            style={{
              zoom,
              width: previewDims.width,
              minHeight: previewDims.height,
              padding: marginsCss(model.meta.margins),
            }}
          >
            {showGuide ? (
              <div
                className="paper-margin-guide"
                aria-hidden="true"
                style={{
                  top: `${model.meta.margins.top}mm`,
                  right: `${model.meta.margins.right}mm`,
                  bottom: `${model.meta.margins.bottom}mm`,
                  left: `${model.meta.margins.left}mm`,
                }}
              />
            ) : null}
            <PaperDocument meta={model.meta} sets={model.sets} />
          </div>
        </div>
      </div>
      </div>
      )}

      <BuilderActionBar
        step={step}
        onStep={setStep}
        itemCount={items.length}
        pending={pending}
        onSave={onSave}
        onPrint={() => void onQuickPrint()}
        printPending={printPending}
        onPdf={() => void onPdf()}
        pdfPending={pdfPending}
        savedId={savedId}
      />
    </>
  );
}

/** ১ প্রশ্ন বাছাই → ২ পেপার সাজানো → ৩ প্রিন্ট/PDF */
function BuilderStepper({
  step,
  onChange,
  title,
  itemCount,
}: {
  step: 1 | 2 | 3;
  onChange: (step: 1 | 2 | 3) => void;
  title: string;
  itemCount: number;
}) {
  const STEPS: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: "প্রশ্ন বাছাই" },
    { n: 2, label: "পেপার সাজানো" },
    { n: 3, label: "প্রিন্ট/PDF" },
  ];
  return (
    <div className="no-print flex flex-wrap items-center gap-x-3 gap-y-2">
      <h1 className="text-lg font-semibold text-ink">{title}</h1>
      <ol className="flex flex-wrap items-center gap-1" aria-label="ধাপ">
        {STEPS.map((item) => {
          const active = item.n === step;
          const done = item.n < step;
          return (
            <li key={item.n} className="flex items-center gap-1">
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onChange(item.n)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : done
                      ? "border-line bg-surface text-ink hover:border-[#d8d4ca]"
                      : "border-line bg-surface text-muted hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "grid h-4 w-4 place-items-center rounded-full text-[10px] font-semibold",
                    active ? "bg-primary text-white" : done ? "bg-[#e6f4f1] text-[#0b6b5d]" : "bg-[#f3f1ec] text-muted",
                  )}
                  aria-hidden="true"
                >
                  {done ? "✓" : toBanglaDigits(item.n)}
                </span>
                {toBanglaDigits(item.n)} {item.label}
              </button>
              {item.n < 3 ? (
                <span className="text-[#c9c4b8]" aria-hidden="true">
                  ›
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="ml-auto flex items-center gap-2 text-[12px] text-muted">
        <span className="rounded-full bg-[#f3f1ec] px-2 py-0.5">
          {toBanglaDigits(itemCount)}টি প্রশ্ন
        </span>
        <Link href="/admin/papers" className="font-medium text-primary hover:underline">
          সব পেপার
        </Link>
      </div>
    </div>
  );
}

function BuilderActionBar({
  step,
  onStep,
  itemCount,
  pending,
  onSave,
  onPrint,
  printPending,
  onPdf,
  pdfPending,
  savedId,
}: {
  step: 1 | 2 | 3;
  onStep: (step: 1 | 2 | 3) => void;
  itemCount: number;
  pending: boolean;
  onSave: () => void;
  onPrint: () => void;
  printPending: boolean;
  onPdf: () => void;
  pdfPending: boolean;
  savedId: string | null;
}) {
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
        <span className="hidden text-[12px] text-muted sm:inline">
          ধাপ {toBanglaDigits(step)}/৩ · {toBanglaDigits(itemCount)}টি প্রশ্ন
        </span>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={() => onStep((step === 1 ? 1 : step - 1) as 1 | 2 | 3)}
            disabled={step === 1}
          >
            পূর্ববর্তী
          </button>
          <button type="button" className="btn-primary" onClick={onSave} disabled={pending || itemCount === 0}>
            {pending ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ"}
          </button>
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={onPrint}
            disabled={printPending || itemCount === 0}
            aria-busy={printPending}
            title="সংরক্ষণ করে ব্রাউজারের প্রিন্ট ডায়ালগ খুলবে"
          >
            {printPending ? "প্রিন্ট ভিউ খুলছে…" : "প্রিন্ট"}
          </button>
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={onPdf}
            disabled={pdfPending || itemCount === 0}
            aria-busy={pdfPending}
          >
            {pdfPending ? "PDF তৈরি হচ্ছে…" : "PDF ডাউনলোড"}
          </button>
          {savedId ? (
            <Link href={`/print/${savedId}`} target="_blank" className="btn-ghost">
              প্রিন্ট ভিউ
            </Link>
          ) : null}
          {step < 3 ? (
            <button
              type="button"
              className="btn-secondary whitespace-nowrap"
              onClick={() => onStep((step + 1) as 1 | 2 | 3)}
              disabled={step === 1 && itemCount === 0}
            >
              পরবর্তী
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SettingsGroup({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="card [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-1 py-1 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
        {title}
        <span
          aria-hidden="true"
          className={`text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

function Toggle({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label
      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      htmlFor={id}
    >
      <span>{label}</span>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <span className="block h-5 w-9 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-600" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

/** Next zoom step from the toolbar buttons (0.6 → 1 in fixed steps). */
function stepZoom(current: number, dir: 1 | -1): number {
  const i = ZOOM_STEPS.findIndex((z) => (dir === 1 ? z > current : z < current));
  const fallback = dir === 1 ? ZOOM_STEPS[ZOOM_STEPS.length - 1] : ZOOM_STEPS[0];
  return (i === -1 ? fallback : ZOOM_STEPS[i]) ?? current;
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
