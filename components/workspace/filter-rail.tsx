"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, RotateCcw, Search, X } from "lucide-react";
import { toBanglaDigits } from "@/lib/bangla";
import { subjectChapterName } from "@/lib/subjects";
import type { BankFilters } from "@/lib/bank/filter";
import type { QuestionType } from "@/lib/schemas/question";
import type { QuestionFacets } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Left pane: subject → chapters (with SQ/CQ/MCQ sub-counts), collapsible
 * filter groups and the active-filter chips. All client-side and instant.
 */
export function FilterRail({
  subjectId,
  facets,
  filters,
  resultCount,
  onChange,
  onClear,
}: {
  subjectId: string;
  facets: QuestionFacets;
  filters: BankFilters;
  resultCount: number;
  onChange: (next: BankFilters) => void;
  onClear: () => void;
}) {
  const [boardSearch, setBoardSearch] = useState("");

  const boards = useMemo(() => {
    const term = boardSearch.trim().toLowerCase();
    return facets.boards.filter((b) => !term || b.board.toLowerCase().includes(term)).slice(0, 80);
  }, [facets.boards, boardSearch]);

  const chips = useMemo(() => {
    const out: { key: string; label: string; clear: () => void }[] = [];
    for (const chapter of filters.chapters) {
      out.push({
        key: `chapter-${chapter}`,
        label: subjectChapterName(subjectId, chapter),
        clear: () => onChange({ ...filters, chapters: filters.chapters.filter((c) => c !== chapter) }),
      });
    }
    for (const type of filters.types) {
      out.push({
        key: `type-${type}`,
        label: type,
        clear: () => onChange({ ...filters, types: filters.types.filter((t) => t !== type) }),
      });
    }
    for (const board of filters.boards) {
      out.push({
        key: `board-${board}`,
        label: board,
        clear: () => onChange({ ...filters, boards: filters.boards.filter((b) => b !== board) }),
      });
    }
    for (const topic of filters.topics) {
      out.push({
        key: `topic-${topic}`,
        label: topic,
        clear: () => onChange({ ...filters, topics: filters.topics.filter((t) => t !== topic) }),
      });
    }
    // Hide star filter from UI as per requirements
    // if (filters.stars !== null) {
    //   out.push({
    //     key: "stars",
    //     label: "★".repeat(filters.stars),
    //     clear: () => onChange({ ...filters, stars: null }),
    //   });
    // }
    if (filters.hasImage) {
      out.push({ key: "image", label: "ছবি আছে", clear: () => onChange({ ...filters, hasImage: false }) });
    }
    if (filters.flagged) {
      out.push({ key: "flagged", label: "যাচাই দরকার", clear: () => onChange({ ...filters, flagged: false }) });
    }
    if (filters.used !== null) {
      out.push({
        key: "used",
        label: filters.used ? "ব্যবহৃত" : "অব্যবহৃত",
        clear: () => onChange({ ...filters, used: null }),
      });
    }
    if (filters.search.trim()) {
      out.push({ key: "search", label: `“${filters.search.trim()}”`, clear: () => onChange({ ...filters, search: "" }) });
    }
    return out;
  }, [filters, onChange, subjectId]);

  return (
    <aside className="pane hidden min-h-0 flex-col overflow-auto md:flex" aria-label="ফিল্টার">
      <div className="border-b border-line px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
          <h2 className="text-[13px] font-semibold text-ink">ফিল্টার</h2>
          <span className="ml-auto text-[11px] text-muted">
            {toBanglaDigits(resultCount)}টি ফলাফল
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        <section className="mb-3">
          <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            অধ্যায়
          </p>
          <ul className="space-y-0.5">
            {facets.chapters.map((chapter) => {
              const active = filters.chapters.includes(chapter.chapter);
              return (
                <li key={chapter.chapter}>
                  <button
                    type="button"
                    data-testid={`chapter-${chapter.chapter}`}
                    aria-pressed={active}
                    onClick={() =>
                      onChange({
                        ...filters,
                        chapters: active
                          ? filters.chapters.filter((c) => c !== chapter.chapter)
                          : [...filters.chapters, chapter.chapter],
                      })
                    }
                    className={cn(
                      "w-full rounded-md px-2 py-1.5 text-left transition-colors",
                      active ? "bg-primary-soft text-primary" : "text-ink hover:bg-[#faf9f7]",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
                      <span className="min-w-0 flex-1 truncate">
                        {subjectChapterName(subjectId, chapter.chapter)}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted">
                        {toBanglaDigits(chapter.total)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex gap-2 pl-0 text-[10px] text-muted">
                      <span>SQ {toBanglaDigits(chapter.sq)}</span>
                      <span>CQ {toBanglaDigits(chapter.cq)}</span>
                      {chapter.mcq > 0 ? <span>MCQ {toBanglaDigits(chapter.mcq)}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <FilterSection title="ধরন" open>
          <div className="flex flex-wrap gap-1.5 px-1">
            {facets.types.map((type) => {
              const active = filters.types.includes(type.type);
              return (
                <button
                  key={type.type}
                  type="button"
                  data-testid={`type-${type.type}`}
                  aria-pressed={active}
                  onClick={() =>
                    onChange({
                      ...filters,
                      types: active
                        ? filters.types.filter((t) => t !== type.type)
                        : [...filters.types, type.type as QuestionType],
                    })
                  }
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-line bg-surface text-ink hover:border-[#d8d4ca]",
                  )}
                >
                  {type.type} <span className="font-normal text-muted">{toBanglaDigits(type.total)}</span>
                </button>
              );
            })}
          </div>
        </FilterSection>

        <FilterSection title={`বোর্ড (${toBanglaDigits(facets.boards.length)})`}>
          <div className="relative px-1 pb-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              className="field-input py-1.5 pl-7 text-xs"
              placeholder="বোর্ড খুঁজুন"
              value={boardSearch}
              onChange={(e) => setBoardSearch(e.target.value)}
            />
          </div>
          <div className="max-h-52 space-y-0.5 overflow-auto px-1">
            {boards.map((board) => {
              const active = filters.boards.includes(board.board);
              return (
                <label
                  key={board.board}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[11.5px] text-ink hover:bg-[#faf9f7]"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[var(--primary)]"
                    checked={active}
                    onChange={() =>
                      onChange({
                        ...filters,
                        boards: active
                          ? filters.boards.filter((b) => b !== board.board)
                          : [...filters.boards, board.board],
                      })
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{board.board}</span>
                  <span className="text-muted">{toBanglaDigits(board.total)}</span>
                </label>
              );
            })}
            {boards.length === 0 ? <p className="px-1 text-[11px] text-muted">কিছু পাওয়া যায়নি।</p> : null}
          </div>
        </FilterSection>

        {facets.topics.length > 0 && filters.chapters.length === 1 ? (
          <FilterSection title="টপিক">
            <div className="max-h-40 space-y-0.5 overflow-auto px-1">
              {facets.topics.map((topic) => {
                const active = filters.topics.includes(topic.topic);
                return (
                  <label
                    key={topic.topic}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[11.5px] text-ink hover:bg-[#faf9f7]"
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-[var(--primary)]"
                      checked={active}
                      onChange={() =>
                        onChange({
                          ...filters,
                          topics: active
                            ? filters.topics.filter((t) => t !== topic.topic)
                            : [...filters.topics, topic.topic],
                        })
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{topic.topic}</span>
                    <span className="text-muted">{toBanglaDigits(topic.total)}</span>
                  </label>
                );
              })}
            </div>
          </FilterSection>
        ) : null}

        <FilterSection title="আরও ফিল্টার">
          <div className="space-y-1.5 px-1 text-[12px] text-ink">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-[var(--primary)]"
                checked={filters.hasImage}
                onChange={() => onChange({ ...filters, hasImage: !filters.hasImage })}
              />
              ছবি আছে <span className="text-muted">({toBanglaDigits(facets.withImage)})</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-[var(--primary)]"
                checked={filters.flagged}
                onChange={() => onChange({ ...filters, flagged: !filters.flagged })}
              />
              যাচাই দরকার <span className="text-muted">({toBanglaDigits(facets.flagged)})</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                className="field-input py-1.5 text-xs flex-1"
                value={filters.used === null ? "" : filters.used ? "used" : "unused"}
                aria-label="ব্যবহার অবস্থা"
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({ ...filters, used: val === "" ? null : val === "used" });
                }}
              >
                <option value="">সব</option>
                <option value="used">ব্যবহৃত ({toBanglaDigits(facets.used)})</option>
                <option value="unused">অব্যবহৃত ({toBanglaDigits(facets.unused)})</option>
              </select>
            </div>
          </div>
        </FilterSection>

        {chips.length > 0 ? (
          <div className="mt-2 border-t border-line pt-2">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold text-muted">সক্রিয় ফিল্টার</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                onClick={onClear}
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" /> সব মুছুন
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-ink hover:border-[#d8d4ca]"
                  aria-label={`${chip.label} ফিল্টার সরান`}
                >
                  <span className="max-w-[130px] truncate">{chip.label}</span>
                  <X className="h-3 w-3 text-muted" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function FilterSection({
  title,
  open = false,
  children,
}: {
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="group mb-2 border-t border-line pt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1 px-1 py-1 text-[11px] font-semibold text-muted [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="pt-1">{children}</div>
    </details>
  );
}
