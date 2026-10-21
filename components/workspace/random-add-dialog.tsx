"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { toBanglaDigits } from "@/lib/bangla";

interface RandomAddDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (cqCount: number, sqCount: number, skipSelected: boolean, skipUsed: boolean) => void;
  availableCQ: number;
  availableSQ: number;
}

export function RandomAddDialog({
  open,
  onClose,
  onConfirm,
  availableCQ,
  availableSQ,
}: RandomAddDialogProps) {
  const [cqCount, setCqCount] = useState(2);
  const [sqCount, setSqCount] = useState(5);
  const [skipSelected, setSkipSelected] = useState(true);
  const [skipUsed, setSkipUsed] = useState(false);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="এলোমেলো প্রশ্ন যোগ করুন"
      description="বর্তমান ফিল্টার থেকে এলোমেলোভাবে প্রশ্ন নির্বাচন করা হবে।"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            বাতিল
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onConfirm(cqCount, sqCount, skipSelected, skipUsed)}
            disabled={cqCount === 0 && sqCount === 0}
          >
            যোগ করুন
          </button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        {/* CQ count */}
        <div className="flex items-center gap-3">
          <label className="flex-1 text-sm font-medium text-ink">
            সৃজনশীল (CQ)
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary h-8 w-8 p-0"
              onClick={() => setCqCount(Math.max(0, cqCount - 1))}
              disabled={cqCount === 0}
            >
              −
            </button>
            <span className="w-12 text-center font-mono text-sm">
              {toBanglaDigits(cqCount)}
            </span>
            <button
              type="button"
              className="btn-secondary h-8 w-8 p-0"
              onClick={() => setCqCount(Math.min(availableCQ, cqCount + 1))}
              disabled={cqCount >= availableCQ}
            >
              +
            </button>
          </div>
          <span className="text-xs text-muted">
            (সর্বোচ্চ {toBanglaDigits(availableCQ)})
          </span>
        </div>

        {/* SQ count */}
        <div className="flex items-center gap-3">
          <label className="flex-1 text-sm font-medium text-ink">
            সংক্ষিপ্ত (SQ)
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary h-8 w-8 p-0"
              onClick={() => setSqCount(Math.max(0, sqCount - 1))}
              disabled={sqCount === 0}
            >
              −
            </button>
            <span className="w-12 text-center font-mono text-sm">
              {toBanglaDigits(sqCount)}
            </span>
            <button
              type="button"
              className="btn-secondary h-8 w-8 p-0"
              onClick={() => setSqCount(Math.min(availableSQ, sqCount + 1))}
              disabled={sqCount >= availableSQ}
            >
              +
            </button>
          </div>
          <span className="text-xs text-muted">
            (সর্বোচ্চ {toBanglaDigits(availableSQ)})
          </span>
        </div>

        {/* Options */}
        <div className="space-y-2 pt-2 border-t border-line">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--primary)]"
              checked={skipSelected}
              onChange={(e) => setSkipSelected(e.target.checked)}
            />
            ইতিমধ্যে নির্বাচিত প্রশ্ন বাদ দিন
          </label>
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--primary)]"
              checked={skipUsed}
              onChange={(e) => setSkipUsed(e.target.checked)}
            />
            আগে ব্যবহৃত প্রশ্ন বাদ দিন
          </label>
        </div>
      </div>
    </Modal>
  );
}
