"use client";

import { Download } from "lucide-react";
import { toBanglaDigits } from "@/lib/bangla";
import { attemptsCsv } from "@/lib/exams";
import type { AttemptRecord } from "@/lib/types";

interface ExamResultsProps {
  attempts: AttemptRecord[];
}

export function ExamResults({ attempts }: ExamResultsProps) {
  // Sort by score desc, then by submitted_at desc
  const sorted = [...attempts].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.submittedAt || "").localeCompare(a.submittedAt || "");
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-center">
        <p className="text-muted">এখনো কোনো জমা দেওয়া নেই।</p>
      </div>
    );
  }

  function download() {
    const blob = new Blob([attemptsCsv(sorted)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exam-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={download} className="btn-secondary text-xs">
          <Download className="h-3 w-3" aria-hidden="true" /> CSV ডাউনলোড
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead className="bg-[#f3f1ec]">
          <tr>
            <th className="px-4 py-3 text-left font-medium">নাম</th>
            <th className="px-4 py-3 text-left font-medium">আইডি</th>
            <th className="px-4 py-3 text-right font-medium">নম্বর</th>
            <th className="px-4 py-3 text-right font-medium">মোট</th>
            <th className="px-4 py-3 text-left font-medium">জমা দেওয়ার সময়</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((attempt) => (
            <tr key={attempt.id} className="border-t border-line">
              <td className="px-4 py-3 font-medium">{attempt.studentName}</td>
              <td className="px-4 py-3 text-muted">{attempt.studentId || "-"}</td>
              <td className="px-4 py-3 text-right font-semibold text-primary">
                {toBanglaDigits(attempt.score)}
              </td>
              <td className="px-4 py-3 text-right text-muted">
                {toBanglaDigits(attempt.total)}
              </td>
              <td className="px-4 py-3 text-muted">
                {attempt.submittedAt
                  ? new Date(attempt.submittedAt).toLocaleString("bn-BD", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
