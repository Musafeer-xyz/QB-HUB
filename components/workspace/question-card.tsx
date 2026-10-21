"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { RichText } from "@/components/rich-text";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/toast";
import { deleteQuestionAction, resolveFlagAction } from "@/app/actions/questions";
import { questionImageUrl } from "@/lib/images";
import { toBanglaDigits } from "@/lib/bangla";
import { questionMarks } from "@/lib/marks";
import { plainMathPreview } from "@/lib/bank/filter";
import { cn } from "@/lib/cn";
import type { QuestionRecord } from "@/lib/types";

/** Board name abbreviations map */
const BOARD_ABBREVIATIONS: Record<string, string> = {
  "ঢাকা বোর্ড": "ঢা. বো",
  "রাজশাহী বোর্ড": "রা. বো",
  "কুমিল্লা বোর্ড": "কু. বো",
  "যশোর বোর্ড": "য. বো",
  "চট্টগ্রাম বোর্ড": "চ. বো",
  "বরিশাল বোর্ড": "ব. বো",
  "সিলেট বোর্ড": "সি. বো",
  "দিনাজপুর বোর্ড": "দি. বো",
  "ময়মনসিংহ বোর্ড": "ম. বো",
  "মাদ্রাসা বোর্ড": "মা. বো",
};

function abbreviateBoard(board: string): string {
  return BOARD_ABBREVIATIONS[board] || board;
}

/** Card colors by type */
const CARD_COLORS = {
  SQ: { accent: "#0d9488", bg: "#f0fdfa" },
  CQ: { accent: "#d97706", bg: "#fffbeb" },
  MCQ: { accent: "#7c3aed", bg: "#f5f3ff" },
};

export function QuestionCard({
  question,
  selected,
  compact = false,
  sqMarks = 2,
  onToggleSelect,
  onDeleted,
}: {
  question: QuestionRecord;
  selected: boolean;
  compact?: boolean;
  sqMarks?: number;
  onToggleSelect: () => void;
  onDeleted?: (id: string) => void;
}) {
  const { push } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const marks = questionMarks(question, { sqMarks });
  const colors = CARD_COLORS[question.type] || CARD_COLORS.SQ;

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function onDelete() {
    setConfirming(false);
    startTransition(async () => {
      const res = await deleteQuestionAction(question.id);
      if (!res.ok) {
        push("error", res.message);
        return;
      }
      push("success", "প্রশ্ন মুছে ফেলা হয়েছে।");
      onDeleted?.(question.id);
    });
  }

  function onCardClick(e: React.MouseEvent) {
    // Don't toggle if clicking on buttons, menus, links, or the figure
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest('[role="menu"]') ||
      target.closest("img")
    ) {
      return;
    }
    onToggleSelect();
  }

  const boardTag = useMemo(() => {
    if (question.boards.length === 0) return null;
    const primary = question.boards[0]!;
    const abbreviated = abbreviateBoard(primary);
    const extra = question.boards.length - 1;
    return (
      <div
        className="group relative inline-flex items-center"
        title={question.boards.join(", ")}
      >
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{
            backgroundColor: colors.bg,
            color: colors.accent,
          }}
        >
          {abbreviated}
          {extra > 0 ? (
            <span className="ml-1">+{toBanglaDigits(extra)}</span>
          ) : null}
        </span>
        {/* Full list on hover */}
        <div className="absolute right-0 top-full z-20 mt-1 hidden w-48 rounded-lg border border-line bg-surface p-2 shadow-pop group-hover:block">
          <div className="space-y-1 text-xs">
            {question.boards.map((board) => (
              <div key={board} className="truncate text-ink">
                {board}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [question.boards, colors]);

  const usedChip = useMemo(() => {
    const used = question.usedInPapers ?? 0;
    if (used === 0) return null;
    return (
      <span className="text-[11px] text-muted">
        {toBanglaDigits(used)} পেপারে ব্যবহৃত
      </span>
    );
  }, [question.usedInPapers]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative mx-auto max-w-[920px] rounded-[12px] border bg-white transition-all",
        selected
          ? "border-[#16A34A] bg-[#f0fdf4]"
          : "border-[#e7e4dd] hover:border-[#d8d4ca]",
      )}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: colors.accent,
      }}
      onClick={onCardClick}
      data-question-id={question.id}
    >
      {/* Check badge for selected cards */}
      {selected ? (
        <div className="absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#16A34A] text-white">
          <Check className="h-4 w-4" />
        </div>
      ) : null}

      {/* Board tag top-right */}
      <div className="absolute right-3 top-3 z-10">{boardTag}</div>

      {/* Card content */}
      <div className={cn("p-4", selected ? "pl-12" : "pl-5")}>
        {/* Header: id, type, used chip, flags */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-mono text-[#4b5563]">{question.id}</span>
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: colors.bg,
              color: colors.accent,
            }}
          >
            {question.type}
          </span>
          {usedChip}
          {question.flags.length > 0 ? (
            <span className="tag-flag">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {toBanglaDigits(question.flags.length)}
            </span>
          ) : null}
          <span className="ml-auto font-medium text-[#4b5563]">
            {toBanglaDigits(marks)} নম্বর
          </span>
        </div>

        {/* Question content */}
        {compact ? (
          <CompactView question={question} sqMarks={sqMarks} />
        ) : (
          <FullView
            question={question}
            sqMarks={sqMarks}
            onLightboxOpen={() => setLightboxOpen(true)}
          />
        )}

        {/* Action menu */}
        <div className="relative mt-3 flex items-center justify-end">
          <button
            type="button"
            className="btn-ghost h-7 w-7 p-0"
            aria-label={`${question.id} এর কাজ`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>

          {menuOpen ? (
            <div
              ref={menuRef}
              role="menu"
              className="absolute right-0 top-8 z-30 w-40 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-pop"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                href={`/admin/questions/${encodeURIComponent(question.id)}/edit`}
                role="menuitem"
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-[#faf9f7]"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> সম্পাদনা
              </Link>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-danger hover:bg-danger-soft"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirming(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> মুছুন
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Lightbox for figure */}
      {lightboxOpen && question.imagePath ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="বন্ধ করুন"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
          <img
            src={questionImageUrl(question.imagePath) ?? ""}
            alt={question.imageDesc ?? "প্রশ্নের চিত্র"}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      {/* Delete confirmation modal */}
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="আপনি কি নিশ্চিত? এই প্রশ্নটি মুছে যাবে।"
        description={<span className="font-mono text-xs">{question.id}</span>}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setConfirming(false)}>
              বাতিল
            </button>
            <button type="button" className="btn-danger" onClick={onDelete} disabled={pending}>
              {pending ? "মুছে ফেলা হচ্ছে…" : "নিশ্চিত"}
            </button>
          </>
        }
      />
    </div>
  );
}

function FullView({
  question,
  sqMarks,
  onLightboxOpen,
}: {
  question: QuestionRecord;
  sqMarks: number;
  onLightboxOpen: () => void;
}) {
  const { push } = useToast();
  const [flags, setFlags] = useState(question.flags);
  const [pending, startTransition] = useTransition();
  const imageUrl = questionImageUrl(question.imagePath);

  function resolve(flagId: string) {
    startTransition(async () => {
      const res = await resolveFlagAction(question.id, flagId);
      if (res.ok) {
        setFlags((prev) => prev.filter((f) => f.id !== flagId));
        push("success", "ফ্ল্যাগ সরানো হয়েছে।");
      } else {
        push("error", res.message);
      }
    });
  }

  return (
    <div className="question-text space-y-3 text-[16px] leading-[1.8] text-ink">
      {flags.length > 0 ? (
        <div className="mb-2 rounded-lg border border-[#f0d9a8] bg-[#fffaf0] px-2.5 py-1.5 text-xs text-[#8a5300]">
          <p className="font-semibold">⚠ যাচাই দরকার</p>
          <ul className="mt-1 space-y-1">
            {flags.map((flag) => (
              <li key={flag.id} className="flex items-start gap-2">
                <span className="flex-1">{flag.text}</span>
                <button
                  type="button"
                  className="rounded border border-[#e9d7a8] bg-surface px-1.5 py-0.5 text-[11px] font-semibold hover:bg-[#fdf6e3]"
                  onClick={() => resolve(flag.id)}
                  disabled={pending}
                >
                  যাচাই হয়েছে
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {question.type === "CQ" ? (
        <>
          <div className="flex gap-4">
            {/* Stem and parts */}
            <div className="flex-1">
              {question.stem.map((line, i) => (
                <RichText key={i} text={line} className="block" />
              ))}

              {/* Parts table */}
              <table className="mt-2 w-full border-collapse text-[14px]">
                <tbody>
                  {question.parts.map((part) => (
                    <tr key={part.label} className="align-top">
                      <td className="w-8 py-1 font-semibold">({part.label})</td>
                      <td className="py-1">
                        <RichText text={part.text} />
                      </td>
                      <td className="w-12 whitespace-nowrap py-1 text-right text-muted">
                        [{toBanglaDigits(part.marks)}]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Figure thumbnail */}
            {imageUrl ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  className="relative overflow-hidden rounded-lg border border-line bg-[#fbfaf7]"
                  onClick={onLightboxOpen}
                  style={{
                    maxWidth: "220px",
                    maxHeight: "140px",
                    // Reserve space based on intrinsic dimensions to prevent layout shift
                    aspectRatio: question.imageWidth && question.imageHeight
                      ? `${question.imageWidth} / ${question.imageHeight}`
                      : undefined,
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={question.imageDesc ?? "প্রশ্নের চিত্র"}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain"
                    style={{ maxWidth: "220px", maxHeight: "140px" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity hover:bg-black/10 hover:opacity-100">
                    <ImageIcon className="h-8 w-8 text-white/80" />
                  </div>
                </button>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex items-start gap-2">
          <RichText text={question.question ?? ""} className="min-w-0 flex-1" />
          <span className="shrink-0 text-sm text-muted">[{toBanglaDigits(sqMarks)}]</span>
        </div>
      )}

      {/* Hidden answer slot for future use */}
      <div className="hidden" aria-hidden="true">
        উত্তর দেখুন
      </div>
    </div>
  );
}

function CompactView({ question, sqMarks }: { question: QuestionRecord; sqMarks: number }) {
  // Strip LaTeX and convert simple formulas to Unicode
  const plainText = useMemo(() => {
    if (question.type === "SQ") {
      return plainMathPreview(question.question ?? "");
    }
    const stemText = question.stem.map((line) => plainMathPreview(line)).join(" ");
    const partsText = question.parts
      .map((p) => `(${p.label}) ${plainMathPreview(p.text)}`)
      .join(" ");
    return `${stemText} ${partsText}`;
  }, [question]);

  return (
    <div className="text-[14px] leading-[1.6] text-ink">
      {question.type === "SQ" ? (
        <div className="flex items-start gap-2">
          <span className="font-mono text-[11px] text-muted">{question.id}</span>
          <p className="flex-1">{plainText || "(শব্দহীন প্রশ্ন)"}</p>
          <span className="shrink-0 text-xs text-muted">[{toBanglaDigits(sqMarks)}]</span>
        </div>
      ) : (
        <div>
          <p className="mb-1">{plainText || "(শব্দহীন প্রশ্ন)"}</p>
          <div className="flex flex-wrap gap-1 text-[11px] text-muted">
            {question.parts.map((part) => (
              <span key={part.label}>
                ({part.label}) {toBanglaDigits(part.marks)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
