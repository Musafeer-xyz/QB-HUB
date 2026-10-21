"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { RichText } from "@/components/rich-text";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/toast";
import { deleteQuestionAction, resolveFlagAction } from "@/app/actions/questions";
import { questionImageUrl } from "@/lib/images";
import { toBanglaDigits } from "@/lib/bangla";
import { questionMarks } from "@/lib/marks";
import { rowPreview } from "@/lib/bank/filter";
import { cn } from "@/lib/cn";
import type { QuestionRecord } from "@/lib/types";

/** One dense row in the workspace list (expandable in place). */
export function QuestionRow({
  question,
  expanded,
  selected,
  sqMarks = 2,
  onToggleExpand,
  onToggleSelect,
  onDeleted,
}: {
  question: QuestionRecord;
  expanded: boolean;
  selected: boolean;
  sqMarks?: number;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onDeleted?: (id: string) => void;
}) {
  const { push } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const marks = questionMarks(question, { sqMarks });

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

  return (
    <div className="border-b border-line last:border-b-0" data-question-id={question.id}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        className={cn(
          "group flex cursor-pointer items-start gap-2 px-3 py-2.5 transition-colors focus-visible:bg-primary-soft/40",
          expanded ? "bg-[#fbfaf7]" : "hover:bg-[#faf9f7]",
        )}
      >
        <input
          type="checkbox"
          checked={selected}
          aria-label={`${question.id} পেপারে যোগ/বাদ`}
          className="mt-[3px] h-4 w-4 shrink-0 accent-[var(--primary)]"
          onClick={(e) => e.stopPropagation()}
          onChange={onToggleSelect}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span className="font-mono text-[11px] tracking-tight text-[#4b5563]">{question.id}</span>
            <TypeTag type={question.type} />
            <span>অধ্যায় {toBanglaDigits(question.chapter)}</span>
            <BoardsChip boards={question.boards} />
            {question.imagePath ? (
              <span className="inline-flex items-center gap-1 text-muted" title="ছবি আছে">
                <ImageIcon className="h-3 w-3" aria-hidden="true" />
              </span>
            ) : null}
            {question.stars ? (
              <span className="text-[#b45309]" title={`কাঠিন্য ${question.stars}/5`}>
                {"★".repeat(question.stars)}
              </span>
            ) : null}
            {question.flags.length > 0 ? (
              <span className="tag-flag">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {toBanglaDigits(question.flags.length)}
              </span>
            ) : null}
            <span className="ml-auto shrink-0 font-medium text-[#4b5563]">
              {toBanglaDigits(marks)} নম্বর
            </span>
          </div>

          <p className="mt-1 line-clamp-2 text-[13.5px] leading-[1.6] text-ink">
            {rowPreview(question) || "(শব্দহীন প্রশ্ন)"}
          </p>
        </div>

        <div className="relative mt-0.5 flex shrink-0 items-center gap-0.5">
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
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted transition-transform",
              expanded ? "rotate-90" : "",
            )}
            aria-hidden="true"
          />

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

      {expanded ? (
        <QuestionDetail
          question={question}
          sqMarks={sqMarks}
          selected={selected}
          onToggleSelect={onToggleSelect}
          pushToast={push}
        />
      ) : null}

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

function TypeTag({ type }: { type: string }) {
  const cls = type === "SQ" ? "tag-sq" : type === "CQ" ? "tag-cq" : "tag-mcq";
  return <span className={cls}>{type}</span>;
}

function BoardsChip({ boards }: { boards: string[] }) {
  if (boards.length === 0) return <span className="text-[#9ca3af]">বোর্ড নেই</span>;
  const label = boards.length > 1 ? `${toBanglaDigits(boards.length)} বোর্ড` : boards[0]!;
  return (
    <span
      className="inline-block max-w-[170px] truncate rounded bg-[#f3f1ec] px-1.5 py-0.5 text-[11px] text-[#4b5563]"
      title={boards.join(", ")}
    >
      {label}
    </span>
  );
}

/**
 * Full question, rendered only when the row is open: KaTeX, figure and parts
 * cost nothing until a teacher actually looks at the question.
 */
function QuestionDetail({
  question,
  sqMarks,
  selected,
  onToggleSelect,
  pushToast,
}: {
  question: QuestionRecord;
  sqMarks: number;
  selected: boolean;
  onToggleSelect: () => void;
  pushToast: (kind: "success" | "error" | "info", message: string) => void;
}) {
  const [flags, setFlags] = useState(question.flags);
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const imageUrl = questionImageUrl(question.imagePath);

  // Rendered HTML is cached per question so collapsing/expanding is free.
  const body = useMemo(
    () => ({
      stem: question.stem,
      parts: question.parts,
      question: question.question,
    }),
    [question],
  );

  function resolve(flagId: string) {
    startTransition(async () => {
      const res = await resolveFlagAction(question.id, flagId);
      if (res.ok) {
        setFlags((prev) => prev.filter((f) => f.id !== flagId));
        pushToast("success", "ফ্ল্যাগ সরানো হয়েছে।");
      } else {
        pushToast("error", res.message);
      }
    });
  }

  return (
    <div className="border-t border-line bg-surface px-3 pb-3 pt-2.5 pl-9">
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

      <div className="question-text space-y-1 text-[14px] leading-[1.75] text-ink">
        {question.type === "CQ" ? (
          <>
            {body.stem.map((line, i) => (
              <RichText key={i} text={line} className="block" />
            ))}

            {imageUrl ? (
              // Fixed box reserves the figure height: expanding never shifts the list.
              <figure className="relative my-2 flex h-[190px] w-full items-center justify-center overflow-hidden rounded-lg border border-line bg-[#fbfaf7]">
                {broken ? (
                  <span className="px-3 text-center text-xs text-muted">
                    চিত্র পাওয়া যায়নি{question.imageDesc ? ` — ${question.imageDesc}` : ""}
                  </span>
                ) : (
                  <>
                    {!loaded ? (
                      <span className="skeleton absolute inset-2 rounded" aria-hidden="true" />
                    ) : null}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={question.imageDesc ?? "প্রশ্নের চিত্র"}
                      loading="lazy"
                      decoding="async"
                      className={cn(
                        "relative h-full w-full object-contain transition-opacity",
                        loaded ? "opacity-100" : "opacity-0",
                      )}
                      onLoad={() => setLoaded(true)}
                      onError={() => setBroken(true)}
                    />
                  </>
                )}
              </figure>
            ) : null}

            <table className="mt-1 w-full border-collapse text-[13.5px]">
              <tbody>
                {body.parts.map((part) => (
                  <tr key={part.label} className="align-top">
                    <td className="w-6 py-0.5 font-semibold">({part.label})</td>
                    <td className="py-0.5">
                      <RichText text={part.text} />
                    </td>
                    <td className="w-10 whitespace-nowrap py-0.5 text-right text-muted">
                      [{toBanglaDigits(part.marks)}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="flex items-start gap-2">
            <RichText text={body.question} className="min-w-0 flex-1" />
            <span className="shrink-0 text-sm text-muted">[{toBanglaDigits(sqMarks)}]</span>
          </div>
        )}
      </div>

      {question.boards.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {question.boards.map((board) => (
            <span key={board} className="chip">
              {board}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={selected ? "btn-secondary" : "btn-primary"} onClick={onToggleSelect}>
          {selected ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> পেপারে আছে
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> পেপারে যোগ করুন
            </>
          )}
        </button>
        <Link
          href={`/admin/questions/${encodeURIComponent(question.id)}/edit`}
          className="btn-secondary"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> সম্পাদনা
        </Link>
        <span className="ml-auto text-xs text-muted">
          {question.type === "CQ"
            ? `${toBanglaDigits(question.parts.length)}টি অংশ`
            : `${toBanglaDigits(sqMarks)} নম্বর`}
        </span>
      </div>
    </div>
  );
}
