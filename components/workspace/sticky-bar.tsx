"use client";

import { useState } from "react";
import Link from "next/link";
import { List, CheckSquare2, ArrowUp, ChevronDown, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { toBanglaDigits } from "@/lib/bangla";
import { withSubject } from "@/lib/admin-subject";

interface StickyBarProps {
  /** The subject being browsed: the builder link carries it. */
  subjectId: string;
  paperTitle: string;
  onTitleChange: (title: string) => void;
  targetMarks: number | null;
  onTargetMarksChange: (marks: number | null) => void;
  selectedCount: number;
  totalMarks: number;
  filteredCount: number;
  onListClick: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRandomAdd: () => void;
  onPreview: () => void;
  onSave: () => void;
  showScrollTop: boolean;
  onScrollTop: () => void;
}

export function StickyBar({
  subjectId,
  paperTitle,
  onTitleChange,
  targetMarks,
  onTargetMarksChange,
  selectedCount,
  totalMarks,
  filteredCount,
  onListClick,
  onSelectAll,
  onDeselectAll,
  onRandomAdd,
  onPreview,
  onSave,
  showScrollTop,
  onScrollTop,
}: StickyBarProps) {
  const [targetMarksInput, setTargetMarksInput] = useState(
    targetMarks ? toBanglaDigits(targetMarks) : ""
  );
  const [confirmSelect, setConfirmSelect] = useState(false);

  const progress = targetMarks ? (totalMarks / targetMarks) * 100 : 0;
  const progressColor = progress >= 100 ? "#16A34A" : progress >= 80 ? "#d97706" : "#1e40af";

  return (
    <div className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-[920px] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Editable paper title */}
          <input
            type="text"
            value={paperTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="পেপারের নাম"
            className="flex-1 min-w-[200px] px-2 py-1 text-sm font-semibold border border-transparent rounded hover:border-line focus:border-primary focus:outline-none"
          />

          {/* Selection chip with target marks */}
          <div className="flex items-center gap-2 rounded-full bg-[#f3f1ec] px-3 py-1.5">
            <span className="text-sm font-medium text-ink">
              {toBanglaDigits(selectedCount)} নির্বাচিত · {toBanglaDigits(totalMarks)} নম্বর
            </span>
            {targetMarks !== null ? (
              <>
                <span className="text-muted">·</span>
                <input
                  type="text"
                  value={targetMarksInput}
                  onChange={(e) => {
                    setTargetMarksInput(e.target.value);
                    const num = parseInt(e.target.value.replace(/[০-৯]/g, (c) =>
                      String("০১২৩৪৫৬৭৮৯".indexOf(c))
                    ), 10);
                    if (!isNaN(num)) {
                      onTargetMarksChange(num);
                    }
                  }}
                  placeholder="লক্ষ্য"
                  className="w-16 px-1 py-0.5 text-xs text-center border border-line rounded focus:border-primary focus:outline-none"
                />
              </>
            ) : null}
          </div>

          {/* Progress bar */}
          {targetMarks !== null ? (
            <div className="flex-1 min-w-[100px] h-2 rounded-full bg-[#e7e4dd] overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: progressColor,
                }}
              />
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary flex items-center gap-1.5 text-xs"
              onClick={onListClick}
            >
              <List className="h-3.5 w-3.5" />
              তালিকা
            </button>

            {/* Two independent controls: selecting all never clears. */}
            <button
              type="button"
              className="btn-secondary flex items-center gap-1.5 text-xs"
              onClick={() => setConfirmSelect(true)}
            >
              <CheckSquare2 className="h-3.5 w-3.5" />
              সব নির্বাচন
            </button>

            {selectedCount > 0 ? (
              <button
                type="button"
                className="btn-danger flex items-center gap-1.5 text-xs"
                onClick={onDeselectAll}
              >
                <X className="h-3.5 w-3.5" />
                নির্বাচন মুছুন ({toBanglaDigits(selectedCount)})
              </button>
            ) : null}

            <button
              type="button"
              className="btn-secondary flex items-center gap-1.5 text-xs"
              onClick={onRandomAdd}
            >
              <ChevronDown className="h-3.5 w-3.5" />
              এলোমেলো যোগ
            </button>

            <Link
              href={withSubject("/admin/papers/new?step=2", subjectId)}
              className="btn-secondary flex items-center gap-1.5 text-xs"
              onClick={onPreview}
            >
              প্রিভিউ
            </Link>

            <button
              type="button"
              className="btn-primary flex items-center gap-1.5 text-xs"
              onClick={onSave}
            >
              সেভ
            </button>
          </div>
        </div>
      </div>

      {/* Floating Top ↑ button */}
      {showScrollTop ? (
        <button
          type="button"
          className="fixed bottom-6 right-6 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover transition-colors"
          onClick={onScrollTop}
          aria-label="উপরে যান"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      ) : null}

      {/* Bulk confirmation modal */}
      <Modal
        open={confirmSelect}
        onClose={() => setConfirmSelect(false)}
        title="ফিল্টারের সব প্রশ্ন নির্বাচন করবেন?"
        description={
          <>
            বর্তমান ফিল্টারে মিলে যাওয়া <strong>{toBanglaDigits(filteredCount)}</strong>টি প্রশ্ন
            পেপারে যোগ হবে। ইতিমধ্যে যোগ করা প্রশ্ন বাদ যাবে।
          </>
        }
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setConfirmSelect(false)}>
              বাতিল
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onSelectAll();
                setConfirmSelect(false);
              }}
            >
              নির্বাচন করুন
            </button>
          </>
        }
      />
    </div>
  );
}
