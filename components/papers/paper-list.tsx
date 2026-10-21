"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePaperAction, duplicatePaperAction } from "@/app/actions/papers";
import { useToast } from "@/components/toast";
import { toBanglaDigits } from "@/lib/bangla";
import { formatDate } from "@/lib/format";
import type { PaperRecord } from "@/lib/types";

export function PaperList({ papers }: { papers: PaperRecord[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

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
        <Link href="/admin/papers/new" className="btn-primary mt-4 inline-flex">
          নতুন পেপার
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-[#faf9f7] text-left text-xs uppercase tracking-wide text-muted">
          <tr>
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
            <tr key={paper.id} className="hover:bg-[#faf9f7]">
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
  );
}
