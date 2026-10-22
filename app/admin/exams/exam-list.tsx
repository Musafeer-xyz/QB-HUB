"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Users, Download, Eye, EyeOff } from "lucide-react";
import { toBanglaDigits } from "@/lib/bangla";
import { attemptsCsv, examChapterLabel } from "@/lib/exams";
import type { AttemptRecord, ExamRecord } from "@/lib/types";

interface ExamListProps {
  exams: ExamRecord[];
}

export function ExamList({ exams }: ExamListProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  async function handleToggle(id: string, isOpen: boolean) {
    setToggling(id);
    try {
      const res = await fetch(`/api/exams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: !isOpen }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "হালনাগাদ করা যায়নি।");
      } else {
        router.refresh();
      }
    } catch {
      alert("হালনাগাদ করা যায়নি।");
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("এই এক্সাম মুছে ফেলবেন?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/exams/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "মুছে ফেলা যায়নি।");
      } else {
        router.refresh();
      }
    } catch {
      alert("মুছে ফেলা যায়নি।");
    } finally {
      setDeleting(null);
    }
  }

  async function handleDownloadResults(id: string, title: string) {
    try {
      const res = await fetch(`/api/exams/${id}/results`);
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "ফলাফল লোড করা যায়নি।");
        return;
      }
      const data = (await res.json()) as { attempts?: AttemptRecord[] };
      const blob = new Blob([attemptsCsv(data.attempts ?? [])], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, "_")}_results.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("ফলাফল ডাউনলোড করা যায়নি।");
    }
  }

  if (exams.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-center">
        <p className="text-muted">এখনো কোনো এক্সাম নেই।</p>
        <a href="/admin/bank" className="mt-4 inline-block btn-primary">
          প্রথম এক্সাম তৈরি করুন
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exams.map((exam) => (
        <div
          key={exam.id}
          data-exam-id={exam.id}
          className="rounded-lg border border-line bg-surface p-4 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-semibold">{exam.title}</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                <span>
                  বিষয়: <span className="font-medium text-ink">{exam.subject}</span>
                </span>
                <span>
                  অধ্যায়:{" "}
                  <span className="font-medium text-ink">
                    {examChapterLabel(exam.subject, exam.chapter)}
                  </span>
                </span>
                <span>
                  প্রশ্ন: <span className="font-medium text-ink">{toBanglaDigits(exam.questionIds.length)}টি</span>
                </span>
                <span>
                  সময়: <span className="font-medium text-ink">{toBanglaDigits(exam.durationMin)} মিনিট</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    exam.isOpen
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {exam.isOpen ? (
                    <>
                      <Eye className="h-3 w-3" />
                      খোলা
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3" />
                      বন্ধ
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggle(exam.id, exam.isOpen)}
                disabled={toggling === exam.id}
                className="btn-secondary text-xs"
              >
                {toggling === exam.id ? "..." : exam.isOpen ? "বন্ধ করুন" : "খুলুন"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/admin/exams/${exam.id}/results`)}
                className="btn-secondary text-xs"
              >
                <Users className="h-3 w-3" />
                ফলাফল
              </button>
              <button
                type="button"
                onClick={() => handleDownloadResults(exam.id, exam.title)}
                className="btn-secondary text-xs"
              >
                <Download className="h-3 w-3" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => handleDelete(exam.id)}
                disabled={deleting === exam.id}
                className="btn-danger text-xs"
              >
                <Trash2 className="h-3 w-3" />
                {deleting === exam.id ? "..." : "মুছুন"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
