"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus, Search, X } from "lucide-react";
import { useSelection, totalSelectionMarks } from "@/components/selection/selection-context";
import { QuestionCard } from "@/components/workspace/question-card";
import { FilterRail } from "@/components/workspace/filter-rail";
import { StickyBar } from "@/components/workspace/sticky-bar";
import { PaperDrawer } from "@/components/workspace/paper-drawer";
import { RandomAddDialog } from "@/components/workspace/random-add-dialog";
import { TypeControl } from "@/components/workspace/type-control";
import { ViewModeToggle } from "@/components/workspace/view-mode-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { QuestionListSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/toast";
import { toBanglaDigits } from "@/lib/bangla";
import { activeFilterCount, bankFacets, EMPTY_FILTERS, filterBank, type BankFilters } from "@/lib/bank/filter";
import { subjectById, subjectChapterName } from "@/lib/subjects";
import { cn } from "@/lib/cn";
import type { QuestionRecord } from "@/lib/types";

type ViewMode = "open" | "compact";
type TypeFilter = "all" | "SQ" | "CQ" | "MCQ";

/**
 * The question workspace v2: filters on the left, centered card list with
 * sticky top bar, and slide-over drawer for paper management.
 */
export function BankWorkspace({
  questions,
  subjectId,
  embedded = false,
  loading = false,
}: {
  questions: QuestionRecord[];
  subjectId: string;
  embedded?: boolean;
  /** True while the builder is still fetching its question index. */
  loading?: boolean;
}) {
  const subject = subjectById(subjectId);
  const selection = useSelection();
  const { push } = useToast();
  const [items, setItems] = useState(questions);
  const [filters, setFilters] = useState<BankFilters>(EMPTY_FILTERS);
  const [paperTitle, setPaperTitle] = useState("");
  const [targetMarks, setTargetMarks] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("open");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [typeLocked, setTypeLocked] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [randomOpen, setRandomOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Initialize view mode from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("qbhub.viewMode");
      if (saved === "open" || saved === "compact") {
        setViewMode(saved);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setItems(questions), [questions]);

  const facets = useMemo(() => bankFacets(items, subjectId), [items, subjectId]);
  const filtered = useMemo(() => filterBank(items, filters, subjectId), [items, filters, subjectId]);

  // Reset type filter when chapter changes if type lock is enabled
  useEffect(() => {
    if (typeLocked && filters.chapters.length === 1) {
      setTypeFilter("all");
    }
  }, [filters.chapters, typeLocked]);

  // Apply type filter
  const typeFiltered = useMemo(() => {
    if (typeFilter === "all") return filtered;
    return filtered.filter((q) => q.type === typeFilter);
  }, [filtered, typeFilter]);

  const virtualizer = useVirtualizer({
    count: typeFiltered.length,
    getScrollElement: () => listRef.current,
    // Cards are measured after mount; the estimate only has to keep the scroll
    // bar close. MCQ cards are taller (statement lines + four option tiles).
    estimateSize: (index) => {
      const type = typeFiltered[index]?.type;
      if (viewMode === "open") return type === "MCQ" ? 380 : type === "CQ" ? 320 : 220;
      return type === "MCQ" ? 110 : 100;
    },
    overscan: 4,
    getItemKey: (index) => typeFiltered[index]!.id,
  });

  const selectedCount = selection.entries.length;
  const totalMarks = totalSelectionMarks(selection.entries, 2);

  // Type facets for the control
  const typeFacets = useMemo(() => ({
    total: facets.total,
    sq: facets.types.find((t) => t.type === "SQ")?.total ?? 0,
    cq: facets.types.find((t) => t.type === "CQ")?.total ?? 0,
    mcq: facets.types.find((t) => t.type === "MCQ")?.total ?? 0,
  }), [facets]);

  // "/" focuses search unless the user is already typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setRandomOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Show scroll to top button after scrolling
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onScroll = () => {
      setShowScrollTop(list.scrollTop > 400);
    };
    list.addEventListener("scroll", onScroll);
    return () => list.removeEventListener("scroll", onScroll);
  }, []);

  const onToggleSelect = useCallback(
    (question: QuestionRecord) => {
      if (selection.has(question.id)) {
        selection.remove(question.id);
        return;
      }
      selection.add({
        questionId: question.id,
        type: question.type,
        chapter: question.chapter,
        partMarks: question.parts.map((p) => ({ label: p.label, marks: p.marks })),
        selectedParts: [],
      });
    },
    [selection],
  );

  const onDeleted = useCallback((id: string) => {
    setItems((prev) => prev.filter((q) => q.id !== id));
  }, []);

  /** “সব নির্বাচন”: the filtered result set becomes the paper's questions. */
  function selectAll() {
    if (typeFiltered.length === 0) {
      push("info", "ফিল্টারে কোনো প্রশ্ন নেই।");
      return;
    }
    selection.replace(
      typeFiltered.map((question) => ({
        questionId: question.id,
        type: question.type,
        chapter: question.chapter,
        partMarks: question.parts.map((p) => ({ label: p.label, marks: p.marks })),
        selectedParts: [],
      })),
    );
    push("success", `${toBanglaDigits(typeFiltered.length)}টি প্রশ্ন নির্বাচন করা হয়েছে।`);
  }

  /** “নির্বাচন মুছুন (N)”: drop every selected question. */
  function clearSelection() {
    const count = selection.entries.length;
    selection.clear();
    push("success", `${toBanglaDigits(count)}টি প্রশ্ন নির্বাচন মুছে ফেলা হয়েছে।`);
  }

  function handleRandomAdd(cqCount: number, sqCount: number, skipSelected: boolean, skipUsed: boolean) {
    let pool = typeFiltered;
    if (skipSelected) {
      pool = pool.filter((q) => !selection.has(q.id));
    }
    if (skipUsed) {
      pool = pool.filter((q) => (q.usedInPapers ?? 0) === 0);
    }

    const cqPool = pool.filter((q) => q.type === "CQ");
    const sqPool = pool.filter((q) => q.type === "SQ");

    // Shuffle
    const shuffle = <T,>(arr: T[]): T[] => {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j]!, result[i]!];
      }
      return result;
    };

    const selectedCQ = shuffle(cqPool).slice(0, cqCount);
    const selectedSQ = shuffle(sqPool).slice(0, sqCount);

    for (const q of [...selectedCQ, ...selectedSQ]) {
      onToggleSelect(q);
    }

    setRandomOpen(false);
    push("success", `${toBanglaDigits(selectedCQ.length + selectedSQ.length)}টি প্রশ্ন যোগ হয়েছে।`);
  }

  function handleSave() {
    // Save draft paper - would need to implement the actual save action
    push("success", "পেপার সংরক্ষিত হয়েছে");
  }

  function handleScrollTop() {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  const listHeight = embedded
    ? "h-[calc(100dvh-180px)] min-h-[300px]"
    : "h-[calc(100dvh-180px)] min-h-[400px]";

  return (
    <>
      <div className="grid min-h-0 gap-3 md:grid-cols-[230px_minmax(0,1fr)]">
        <FilterRail
          subjectId={subjectId}
          facets={facets}
          filters={filters}
          resultCount={filtered.length}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />

        <section className="flex min-h-0 flex-col" aria-label="প্রশ্নের তালিকা">
          {/* Sticky bar */}
          {!embedded ? (
            <StickyBar
              paperTitle={paperTitle}
              onTitleChange={setPaperTitle}
              targetMarks={targetMarks}
              onTargetMarksChange={setTargetMarks}
              selectedCount={selectedCount}
              totalMarks={totalMarks}
              filteredCount={typeFiltered.length}
              onListClick={() => setDrawerOpen(true)}
              onSelectAll={selectAll}
              onDeselectAll={clearSelection}
              onRandomAdd={() => setRandomOpen(true)}
              onPreview={() => {}}
              onSave={handleSave}
              showScrollTop={showScrollTop}
              onScrollTop={handleScrollTop}
            />
          ) : null}

          {/* Controls bar */}
          <div className="border-b border-line px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  ref={searchRef}
                  id="bank-search"
                  type="search"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="বাংলা টেক্সট বা id দিয়ে খুঁজুন…"
                  aria-label="প্রশ্ন খুঁজুন"
                  className="field-input py-1.5 pl-8 pr-8 text-[13px]"
                />
                {filters.search ? (
                  <button
                    type="button"
                    aria-label="খোঁজা মুছুন"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink"
                    onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line bg-[#faf9f7] px-1 py-0.5 text-[10px] text-muted">
                    /
                  </kbd>
                )}
              </div>

              {/* Type control */}
              <TypeControl
                facets={typeFacets}
                selectedType={typeFilter}
                onTypeChange={setTypeFilter}
                onTypeLockChange={setTypeLocked}
                typeLocked={typeLocked}
              />

              {/* View mode toggle */}
              <ViewModeToggle mode={viewMode} onModeChange={setViewMode} />

              {/* New question button */}
              <Link href="/admin/questions/new" className="btn-primary">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> নতুন প্রশ্ন
              </Link>
            </div>

            {/* Status text */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
              <span>
                {filters.search.trim() || activeFilterCount(filters) > 0
                  ? `${toBanglaDigits(typeFiltered.length)}টি মিলেছে (মোট ${toBanglaDigits(facets.total)}টি)`
                  : `মোট ${toBanglaDigits(facets.total)}টি প্রশ্ন`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="subject-dot" style={{ background: subject.dot }} aria-hidden="true" />
                {subject.label}
              </span>
              {filters.chapters.length === 1 ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">
                    {subjectChapterName(subjectId, filters.chapters[0]!)}
                  </span>
                </>
              ) : null}
              {activeFilterCount(filters) > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => setFilters(EMPTY_FILTERS)}
                  >
                    ফিল্টার মুছুন
                  </button>
                </span>
              ) : null}
            </div>
          </div>

          {/* Question list */}
          {loading && typeFiltered.length === 0 ? (
            <QuestionListSkeleton rows={6} />
          ) : typeFiltered.length === 0 ? (
            <EmptyState
              variant={facets.total === 0 ? "questions" : "search"}
              title={facets.total === 0 ? "এই বিষয়ে এখনো কোনো প্রশ্ন নেই" : "কোনো প্রশ্ন পাওয়া যায়নি"}
              description={
                facets.total === 0
                  ? "ইমপোর্ট থেকে প্রশ্ন যোগ করুন, অথবা নতুন প্রশ্ন তৈরি করুন।"
                  : "ফিল্টার বদলান বা খোঁজার লেখা মুছে দেখুন।"
              }
              action={
                facets.total === 0 ? (
                  <Link href="/admin/questions/new" className="btn-primary">
                    নতুন প্রশ্ন
                  </Link>
                ) : (
                  <button type="button" className="btn-secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                    ফিল্টার মুছুন
                  </button>
                )
              }
            />
          ) : (
            <div
              ref={listRef}
              className={cn("min-h-0 overflow-auto overscroll-contain px-4 py-4", listHeight)}
              role="list"
              aria-label="প্রশ্ন"
            >
              <div className="relative w-full space-y-4" style={{ minHeight: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const question = typeFiltered[virtualRow.index]!;
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      role="listitem"
                      className="absolute left-0 top-0 w-full"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      <QuestionCard
                        question={question}
                        selected={selection.has(question.id)}
                        compact={viewMode === "compact"}
                        onToggleSelect={() => onToggleSelect(question)}
                        onDeleted={onDeleted}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <footer className="flex items-center gap-2 border-t border-line px-4 py-1.5 text-[11px] text-muted">
            <span>{toBanglaDigits(typeFiltered.length)}টি প্রশ্ন দেখানো হচ্ছে</span>
          </footer>
        </section>
      </div>

      {/* Paper drawer */}
      {!embedded ? (
        <PaperDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}

      {/* Random add dialog */}
      <RandomAddDialog
        open={randomOpen}
        onClose={() => setRandomOpen(false)}
        onConfirm={handleRandomAdd}
        availableCQ={typeFiltered.filter((q) => q.type === "CQ").length}
        availableSQ={typeFiltered.filter((q) => q.type === "SQ").length}
      />
    </>
  );
}
