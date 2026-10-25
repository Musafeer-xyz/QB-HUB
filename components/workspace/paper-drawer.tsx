"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, GripVertical, Printer, X } from "lucide-react";
import { useSelection, entryMarks } from "@/components/selection/selection-context";
import { toBanglaDigits } from "@/lib/bangla";
import { summarizeSection } from "@/lib/paper/sections";
import { cn } from "@/lib/cn";
import { withSubject } from "@/lib/admin-subject";

interface PaperDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: () => void;
  /** The subject being browsed: the builder link carries it. */
  subjectId?: string;
}

export function PaperDrawer({ open, onClose, onNavigate, subjectId }: PaperDrawerProps) {
  const selection = useSelection();
  const [dragId, setDragId] = useState<string | null>(null);

  const entries = selection.entries;
  const cq = entries.filter((e) => e.type === "CQ");
  const sq = entries.filter((e) => e.type === "SQ");
  const mcq = entries.filter((e) => e.type === "MCQ");
  const cqMarks = cq.map((e) => entryMarks(e, 2));
  const sqMarks = sq.map((e) => entryMarks(e, 2));
  const mcqMarks = mcq.map((e) => entryMarks(e, 2));
  const cqSummary = summarizeSection("CQ", cqMarks, selection.choice.CQ);
  const sqSummary = summarizeSection("SQ", sqMarks, selection.choice.SQ);
  const mcqSummary = summarizeSection("MCQ", mcqMarks, selection.choice.MCQ);
  const total = cqSummary.totalMarks + sqSummary.totalMarks + mcqSummary.totalMarks;

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = entries.map((e) => e.questionId);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0] as string);
    selection.setOrder(ids);
    setDragId(null);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        data-testid="paper-drawer"
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-line bg-surface shadow-2xl"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="flex items-center gap-2 border-b border-line px-4 py-3">
            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-ink">আমার পেপার</h2>
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
              {toBanglaDigits(entries.length)}
            </span>
            {entries.length > 0 ? (
              <button
                type="button"
                className="ml-auto text-[11px] font-medium text-danger hover:underline"
                onClick={() => selection.clear()}
              >
                সব খালি
              </button>
            ) : null}
            <button
              type="button"
              className="btn-ghost h-7 w-7 shrink-0 p-0"
              aria-label="বন্ধ করুন"
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-auto">
            {entries.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-5 py-8 text-center">
                <svg width="76" height="62" viewBox="0 0 76 62" fill="none" aria-hidden="true">
                  <rect x="10" y="6" width="56" height="50" rx="8" fill="#F3F1EC" stroke="#E7E4DD" />
                  <rect x="21" y="19" width="34" height="4" rx="2" fill="#E7E4DD" />
                  <rect x="21" y="28" width="26" height="4" rx="2" fill="#E7E4DD" />
                  <path d="M38 37v12m0 0l-5-5m5 5l5-5" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <p className="mt-3 text-sm font-semibold text-ink">পেপার এখনো খালি</p>
                <p className="mt-1 text-xs text-muted">
                  তালিকা থেকে প্রশ্নে টিক দিন — এখানে সাজিয়ে নিন।
                </p>
              </div>
            ) : (
              <div className="py-2">
                <SectionBlock
                  type="MCQ"
                  label="বহুনির্বাচনী (MCQ)"
                  entries={mcq}
                  summary={mcqSummary}
                  onChoice={(v) => selection.setChoice("MCQ", v)}
                  dragId={dragId}
                  setDragId={setDragId}
                  onDrop={onDrop}
                />
                <SectionBlock
                  type="CQ"
                  label="সৃজনশীল (CQ)"
                  entries={cq}
                  summary={cqSummary}
                  onChoice={(v) => selection.setChoice("CQ", v)}
                  dragId={dragId}
                  setDragId={setDragId}
                  onDrop={onDrop}
                />
                <SectionBlock
                  type="SQ"
                  label="সংক্ষিপ্ত (SQ)"
                  entries={sq}
                  summary={sqSummary}
                  onChoice={(v) => selection.setChoice("SQ", v)}
                  dragId={dragId}
                  setDragId={setDragId}
                  onDrop={onDrop}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="border-t border-line px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted">মোট নম্বর</span>
              <strong className="text-lg font-semibold text-ink">{toBanglaDigits(total)}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={subjectId ? withSubject("/admin/papers/new?step=2", subjectId) : "/admin/papers/new?step=2"}
                aria-disabled={entries.length === 0}
                onClick={(e) => {
                  if (entries.length === 0) e.preventDefault();
                  onNavigate?.();
                  onClose();
                }}
                className={cn(
                  "btn-secondary flex-1",
                  entries.length === 0 ? "pointer-events-none opacity-50" : "",
                )}
              >
                প্রিভিউ
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href={subjectId ? withSubject("/admin/papers/new?step=3", subjectId) : "/admin/papers/new?step=3"}
                aria-disabled={entries.length === 0}
                onClick={(e) => {
                  if (entries.length === 0) e.preventDefault();
                  onNavigate?.();
                  onClose();
                }}
                className={cn(
                  "btn-primary flex-1",
                  entries.length === 0 ? "pointer-events-none opacity-50" : "",
                )}
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                প্রিন্ট/PDF
              </Link>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              পছন্দ স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকে — পরে পেপার সাজাতে ফিরে আসতে পারবেন।
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}

function SectionBlock({
  type,
  label,
  entries,
  summary,
  onChoice,
  dragId,
  setDragId,
  onDrop,
}: {
  type: "CQ" | "SQ" | "MCQ";
  label: string;
  entries: ReturnType<typeof useSelection>["entries"];
  summary: ReturnType<typeof summarizeSection>;
  onChoice: (value: number | null) => void;
  dragId: string | null;
  setDragId: (id: string | null) => void;
  onDrop: (targetId: string) => void;
}) {
  const selection = useSelection();
  if (entries.length === 0) return null;
  const shownChoice = Math.min(summary.choice, summary.count);

  return (
    <section className="mb-2">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className={type === "CQ" ? "tag-cq" : type === "MCQ" ? "tag-mcq" : "tag-sq"}>{type}</span>
        <span className="text-[11px] font-medium text-muted">
          {toBanglaDigits(entries.length)}টি
        </span>
        <label className="ml-auto flex items-center gap-1 text-[11px] text-muted">
          <span>যেকোনো</span>
          <select
            value={shownChoice}
            aria-label={`${label}: কতটি প্রশ্নের উত্তর দেবে`}
            onChange={(e) => {
              const next = Number(e.target.value);
              onChoice(Number.isFinite(next) ? Math.min(entries.length, Math.max(1, next)) : null);
            }}
            className="field-input h-6 w-14 py-0 pl-1 pr-0 text-[11px]"
          >
            {Array.from({ length: entries.length }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {toBanglaDigits(n)}
              </option>
            ))}
          </select>
          <span>/{toBanglaDigits(entries.length)}</span>
        </label>
      </div>

      <ul className="px-2">
        {entries.map((entry) => (
          <li
            key={entry.questionId}
            draggable
            onDragStart={() => setDragId(entry.questionId)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(entry.questionId)}
            className={cn(
              "mb-1 flex items-center gap-1.5 rounded-md border px-1.5 py-1.5 text-[12px] transition-colors",
              dragId === entry.questionId
                ? "border-primary bg-primary-soft"
                : "border-line bg-surface",
            )}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[#b6b1a6]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[10.5px] text-muted">{entry.questionId}</p>
              <p className="text-[11px] text-ink">
                অধ্যায় {toBanglaDigits(entry.chapter)} ·{" "}
                {toBanglaDigits(entryMarks(entry, 2))} নম্বর
                {entry.selectedParts.length > 0 ? ` · ${entry.selectedParts.join(", ")}` : ""}
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost h-6 w-6 shrink-0 p-0"
              aria-label={`${entry.questionId} পেপার থেকে সরান`}
              onClick={() => selection.remove(entry.questionId)}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <p className="px-3 pb-1 text-[11px] text-muted">
        {summary.equalMarks && summary.marksPerQuestion !== null
          ? `যেকোনো ${toBanglaDigits(shownChoice)}টি × ${toBanglaDigits(summary.marksPerQuestion)} = ${toBanglaDigits(summary.totalMarks)}`
          : `মোট ${toBanglaDigits(summary.totalMarks)} নম্বর`}
        {summary.note ? ` — ${summary.note}` : ""}
      </p>
    </section>
  );
}
