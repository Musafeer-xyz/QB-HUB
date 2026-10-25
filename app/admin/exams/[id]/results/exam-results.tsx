"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { toBanglaDigits } from "@/lib/bangla";
import { attemptsCsv, type AttemptQuestionRow } from "@/lib/exams";
import { splitMcqStem } from "@/lib/mcq-layout";
import { RichText } from "@/components/rich-text";
import type { AttemptRecord } from "@/lib/types";

/** Per-question review of each submitted attempt, built on the server. */
export type AttemptDetails = Record<string, AttemptQuestionRow[]>;

interface ExamResultsProps {
  attempts: AttemptRecord[];
  details: AttemptDetails;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" });
}

export function ExamResults({ attempts, details }: ExamResultsProps) {
  const [openId, setOpenId] = useState<string | null>(null);

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
          {sorted.map((attempt) => {
            const rows = details[attempt.id];
            const open = Boolean(rows) && openId === attempt.id;
            return (
              <Fragment key={attempt.id}>
                <tr className="border-t border-line">
                  <td className="px-4 py-3 font-medium">
                    {rows ? (
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : attempt.id)}
                        aria-expanded={open}
                        className="inline-flex items-center gap-1 text-left hover:text-primary"
                      >
                        {open ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        )}
                        {attempt.studentName}
                      </button>
                    ) : (
                      attempt.studentName
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{attempt.studentId || "-"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">
                    {toBanglaDigits(attempt.score)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted">
                    {toBanglaDigits(attempt.total)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {attempt.submittedAt ? formatTime(attempt.submittedAt) : "অসম্পূর্ণ"}
                  </td>
                </tr>
                {open && rows ? (
                  <tr className="border-t border-line bg-[#faf9f6]">
                    <td colSpan={5} className="px-4 py-4">
                      <AttemptReview attempt={attempt} rows={rows} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/**
 * One attempt's answers per question, in exam order. Rendering uses the same
 * helpers as the student result screen (`splitMcqStem` + `RichText`), so math
 * and chemistry look identical; the verdicts come from the server.
 */
function AttemptReview({ attempt, rows }: { attempt: AttemptRecord; rows: AttemptQuestionRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold">{attempt.studentName}</span>
        <span className="text-muted">
          {toBanglaDigits(attempt.score)} / {toBanglaDigits(attempt.total)}
        </span>
        <span className="text-muted">{attempt.submittedAt ? formatTime(attempt.submittedAt) : "-"}</span>
      </div>

      <ol className="space-y-2">
        {rows.map((q, idx) => {
          const { stimulus, prompt, statements } = splitMcqStem(q.stem);
          return (
            <li key={q.id} data-admin-question={q.id} className="rounded-lg border border-line bg-surface p-3">
              <p className="mb-1 text-xs font-medium text-muted">প্রশ্ন {toBanglaDigits(idx + 1)}</p>
              {stimulus.length > 0 ? (
                <div className="mb-1 space-y-1 text-sm">
                  {stimulus.map((line, i) => (
                    <p key={`stimulus-${i}`} className="text-ink">
                      <RichText text={line} />
                    </p>
                  ))}
                </div>
              ) : null}
              {q.question ? (
                <p className="mb-1 text-sm text-ink">
                  <RichText text={q.question} />
                </p>
              ) : null}
              {prompt.length > 0 ? (
                <div className="mb-1 space-y-1 text-sm">
                  {prompt.map((line, i) => (
                    <p key={`prompt-${i}`} className="text-ink">
                      <RichText text={line} />
                    </p>
                  ))}
                </div>
              ) : null}
              {statements.length > 0 ? (
                <div className="mb-1 space-y-1 text-sm">
                  {statements.map((line, i) => (
                    <p key={`statement-${i}`} className="text-ink">
                      <RichText text={line} />
                    </p>
                  ))}
                </div>
              ) : null}

              <div className="mt-2 space-y-1.5 text-sm">
                {q.options ? (
                  q.options.map((opt) => {
                    const isCorrect = opt.label === q.correctOption;
                    const isChosen = q.studentAnswer === opt.label;
                    const isWrongChoice = isChosen && !isCorrect;
                    return (
                      <div
                        key={opt.label}
                        data-review-correct={isCorrect ? "true" : "false"}
                        data-review-chosen={isChosen ? "true" : "false"}
                        className={`flex items-start gap-2 rounded-md border px-3 py-2 ${
                          isCorrect
                            ? "border-green-300 bg-green-100 text-green-900"
                            : isWrongChoice
                              ? "border-red-300 bg-red-100 text-red-900"
                              : "border-line text-ink"
                        }`}
                      >
                        <span className="w-4 shrink-0 text-center font-bold" aria-hidden="true">
                          {isCorrect ? "✓" : isWrongChoice ? "✗" : ""}
                        </span>
                        <span className="flex-1">
                          <span className="font-semibold">{opt.label}. </span>
                          <RichText text={opt.text} />
                          {isCorrect ? <span className="sr-only"> — সঠিক উত্তর</span> : null}
                          {isWrongChoice ? (
                            <span className="sr-only"> — শিক্ষার্থীর ভুল উত্তর</span>
                          ) : null}
                          {isChosen && isCorrect ? (
                            <span className="ml-1 text-xs text-muted">— শিক্ষার্থীর উত্তর</span>
                          ) : null}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted">
                    সঠিক উত্তর:{" "}
                    <span className="font-semibold text-green-700">{q.correctOption ?? "-"}</span>
                  </p>
                )}
                {q.studentAnswer === null ? (
                  <p className="text-xs text-muted">দেওয়া হয়নি</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
