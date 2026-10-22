"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deletePaperAction, duplicatePaperAction } from "@/app/actions/papers";
import { NewPaperLink } from "@/components/papers/new-paper-link";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/toast";
import { toBanglaDigits } from "@/lib/bangla";
import { formatDate } from "@/lib/format";
import type { PaperRecord } from "@/lib/types";

export function PaperList({ papers }: { papers: PaperRecord[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const headerBoxRef = useRef<HTMLInputElement>(null);

  const allSelected = papers.length > 0 && selected.size === papers.length;
  const partSelected = selected.size > 0 && !allSelected;

  // The header box shows the usual dash when only some rows are ticked.
  useEffect(() => {
    if (headerBoxRef.current) headerBoxRef.current.indeterminate = partSelected;
  }, [partSelected]);

  // A refresh can remove papers; never keep ticking a row that is gone.
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(papers.map((paper) => paper.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [papers]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(papers.map((paper) => paper.id)));
  }

  function onDelete(paper: PaperRecord) {
    if (!window.confirm(`“${paper.title}” মুছে ফেলতে চান?`)) return;
    setBusyId(paper.id);
    startTransition(async () => {
      const res = await deletePaperAction(paper.id);
      if (!res.ok) push("error", res.message);
      else {
        push("success", res.message);
        router.refresh();
      }
      setBusyId(null);
    });
  }

  /** Bulk delete reuses the single-paper action, one paper at a time. */
  function onDeleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setConfirmBulk(false);
    setBusyId("__bulk__");
    startTransition(async () => {
      let removed = 0;
      let error: string | null = null;
      for (const id of ids) {
        const res = await deletePaperAction(id);
        if (res.ok) removed += 1;
        else error = res.message;
      }
      setSelected(new Set());
      setBusyId(null);
      if (error) push("error", error);
      else push("success", `${toBanglaDigits(removed)}টি পেপার মুছে ফেলা হয়েছে।`);
      router.refresh();
    });
  }

  function onDuplicate(paper: PaperRecord) {
    setBusyId(paper.id);
    startTransition(async () => {
      const res = await duplicatePaperAction(paper.id);
      if (!res.ok) push("error", res.message);
      else {
        push("success", res.message);
        router.refresh();
      }
      setBusyId(null);
    });
  }

  if (papers.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-lg font-semibold">এখনো কোনো পেপার সংরক্ষিত হয়নি</p>
        <p className="mt-1 text-sm text-muted">প্রশ্নব্যাংক থেকে প্রশ্ন বেছে পেপার তৈরি করুন।</p>
        <NewPaperLink className="btn-primary mt-4 inline-flex">নতুন পেপার</NewPaperLink>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        {selected.size > 0 ? (
          <div
            className="flex flex-wrap items-center gap-2 border-b border-line bg-[#faf9f7] px-4 py-2 text-sm"
            role="status"
          >
            <span className="font-medium text-ink">
              {toBanglaDigits(selected.size)} টি নির্বাচিত
            </span>
            <span className="text-muted" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              className="btn-danger !px-2 !py-1 text-xs"
              onClick={() => setConfirmBulk(true)}
              disabled={pending}
            >
              মুছুন
            </button>
            <button
              type="button"
              className="btn-secondary !px-2 !py-1 text-xs"
              onClick={() => setSelected(new Set())}
              disabled={pending}
            >
              বাতিল
            </button>
          </div>
        ) : null}

        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-[#faf9f7] text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  ref={headerBoxRef}
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer align-middle"
                  aria-label="সব পেপার নির্বাচন"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4 py-2">নাম</th>
              <th className="px-4 py-2">শ্রেণি</th>
              <th className="px-4 py-2">প্রশ্ন</th>
              <th className="px-4 py-2">নম্বর</th>
              <th className="px-4 py-2">হালনাগাদ</th>
              <th className="px-4 py-2 text-right">কাজ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {papers.map((paper) => (
              <tr
                key={paper.id}
                data-paper-id={paper.id}
                className={selected.has(paper.id) ? "bg-[#f3f8f6]" : "hover:bg-[#faf9f7]"}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer align-middle"
                    aria-label={`“${paper.title}” নির্বাচন`}
                    checked={selected.has(paper.id)}
                    onChange={() => toggleOne(paper.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink">{paper.title}</p>
                  <p className="text-xs text-muted">
                    {[paper.institute, paper.examName].filter(Boolean).join(" · ") || "—"}
                  </p>
                </td>
                <td className="px-4 py-3">{paper.className || "—"}</td>
                <td className="px-4 py-3">{toBanglaDigits(paper.questions.length)}</td>
                <td className="px-4 py-3">{toBanglaDigits(paper.totalMarks)}</td>
                <td className="px-4 py-3 text-xs text-muted">{formatDate(paper.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Link href={`/admin/papers/${paper.id}/edit`} className="btn-secondary !px-2 !py-1 text-xs">
                      সম্পাদনা
                    </Link>
                    <Link href={`/print/${paper.id}`} target="_blank" className="btn-secondary !px-2 !py-1 text-xs">
                      প্রিন্ট
                    </Link>
                    <button
                      type="button"
                      className="btn-secondary !px-2 !py-1 text-xs"
                      onClick={() => onDuplicate(paper)}
                      disabled={pending && busyId === paper.id}
                    >
                      কপি
                    </button>
                    <button
                      type="button"
                      className="btn-danger !px-2 !py-1 text-xs"
                      onClick={() => onDelete(paper)}
                      disabled={pending && busyId === paper.id}
                    >
                      মুছুন
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        title={`${toBanglaDigits(selected.size)} টি পেপার মুছবেন?`}
        description="শুধু পেপার মুছবে, প্রশ্ন নয়।"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setConfirmBulk(false)}>
              বাতিল
            </button>
            <button type="button" className="btn-danger" onClick={onDeleteSelected}>
              মুছুন
            </button>
          </>
        }
      />
    </>
  );
}
