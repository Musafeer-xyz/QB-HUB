"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { RichText } from "@/components/rich-text";
import { toBanglaDigits } from "@/lib/bangla";
import type { AttemptResult, ExamRecord } from "@/lib/types";
import type { PublicExamQuestion } from "@/lib/exams";

const tokenKey = (examId: string) => `qbhub.exam.token.${examId}`;
const draftKey = (attemptId: string) => `qbhub.exam.draft.${attemptId}`;

type Step = "start" | "exam" | "result";

type StartResponse = {
  attemptId: string;
  exam: { id: string; title: string; durationMin: number };
  deadlineAt: number;
  questions: PublicExamQuestion[];
  answers?: Record<string, string>;
};

export function ExamClient({ examId, exam }: { examId: string; exam: ExamRecord }) {
  const [step, setStep] = useState<Step>("start");
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PublicExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const remaining = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : exam.durationMin * 60;

  /** Resume: a token in localStorage means this browser already started. */
  useEffect(() => {
    const token = localStorage.getItem(tokenKey(examId));
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/attempts/${token}`);
        if (!res.ok) {
          localStorage.removeItem(tokenKey(examId));
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data.submitted) {
          setResult(data.result);
          setStep("result");
          return;
        }
        const draft = localStorage.getItem(draftKey(token));
        setAttemptId(token);
        setQuestions(data.questions);
        setAnswers(draft ? (JSON.parse(draft) as Record<string, string>) : (data.answers ?? {}));
        setDeadline(data.deadlineAt);
        setNow(Date.now());
        setStep("exam");
      } catch {
        // Offline or deleted attempt: keep the start screen.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  /** Server-timed countdown; the deadline comes from the attempt row. */
  useEffect(() => {
    if (step !== "exam") return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [step]);

  const submit = useCallback(
    async (payload: Record<string, string>) => {
      if (!attemptId || submittedRef.current) return;
      submittedRef.current = true;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/attempts/${attemptId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: payload }),
        });
        const data = await res.json();
        if (!res.ok) {
          submittedRef.current = false;
          setError(data.error ?? "জমা দেওয়া যায়নি।");
          return;
        }
        localStorage.removeItem(draftKey(attemptId));
        setResult(data.result);
        setExpired(Boolean(data.expired));
        setStep("result");
      } catch {
        submittedRef.current = false;
        setError("জমা দেওয়া যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।");
      } finally {
        setBusy(false);
      }
    },
    [attemptId],
  );

  /** At zero the client submits by itself, inside the server's grace window. */
  useEffect(() => {
    if (step !== "exam" || !deadline) return;
    if (now >= deadline && !submittedRef.current) void submit(answers);
  }, [answers, deadline, now, step, submit]);

  useEffect(() => {
    if (step !== "exam" || !attemptId) return;
    try {
      localStorage.setItem(draftKey(attemptId), JSON.stringify(answers));
    } catch {
      // Storage disabled: the attempt still works, drafts are just not kept.
    }
  }, [answers, attemptId, step]);

  async function start() {
    if (!studentName.trim()) {
      setError("নাম লিখুন।");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/exams/${examId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName: studentName.trim(), studentId: studentId.trim() || null }),
      });
      const data = (await res.json()) as StartResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "শুরু করা যায়নি।");
        return;
      }
      localStorage.setItem(tokenKey(examId), data.attemptId);
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setAnswers({});
      setDeadline(data.deadlineAt);
      setNow(Date.now());
      setStep("exam");
    } catch {
      setError("শুরু করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।");
    } finally {
      setBusy(false);
    }
  }

  if (step === "start") {
    return (
      <div className="min-h-screen bg-[#F6F5F2]">
        <div className="container mx-auto max-w-lg px-4 py-10">
          <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
            <h1 className="mb-2 text-2xl font-bold">{exam.title}</h1>
            <div className="mb-6 space-y-1 text-sm text-muted">
              <p>প্রশ্ন: {toBanglaDigits(exam.questionIds.length)}টি</p>
              <p>সময়: {toBanglaDigits(exam.durationMin)} মিনিট</p>
              <p>বিষয়: {exam.subject}</p>
            </div>

            {!exam.isOpen ? (
              <div className="rounded-lg border border-danger bg-danger/5 p-4 text-sm text-danger">
                এই এক্সামটি এখন বন্ধ। নতুন করে শুরু করা যাবে না।
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void start();
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                    নাম *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="আপনার নাম লিখুন"
                    className="field-input w-full"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="student-id" className="mb-1.5 block text-sm font-medium">
                    আইডি (ঐচ্ছিক)
                  </label>
                  <input
                    id="student-id"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="রোল নম্বর বা আইডি"
                    className="field-input w-full"
                  />
                </div>
                {error ? (
                  <div className="rounded-lg border border-danger bg-danger/5 p-3 text-sm text-danger">
                    {error}
                  </div>
                ) : null}
                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy ? "শুরু হচ্ছে..." : "শুরু করুন"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === "exam") {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return (
      <div className="min-h-screen bg-[#F6F5F2]">
        <div className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
          <div className="container mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <h1 className="truncate text-lg font-semibold">{exam.title}</h1>
            <div
              className="flex shrink-0 items-center gap-2 rounded-full bg-[#f3f1ec] px-4 py-2"
              aria-live="polite"
            >
              <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-mono font-semibold text-primary">
                {toBanglaDigits(minutes)}:{toBanglaDigits(String(seconds).padStart(2, "0"))}
              </span>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-3xl px-4 py-6">
          <div className="space-y-4" data-exam-questions>
            {questions.map((q, idx) => (
              <div
                key={q.id}
                data-exam-question={q.id}
                className="rounded-lg border border-line bg-surface p-4 shadow-sm"
              >
                <p className="mb-2 text-sm font-medium text-muted">
                  প্রশ্ন {toBanglaDigits(idx + 1)}
                </p>
                {q.stem.length > 0 ? (
                  <div className="mb-2 space-y-1 text-sm">
                    {q.stem.map((line, i) => (
                      <p key={i} className="text-ink">
                        <RichText text={line} />
                      </p>
                    ))}
                  </div>
                ) : null}
                {q.question ? (
                  <p className="mb-3 text-ink">
                    <RichText text={q.question} />
                  </p>
                ) : null}
                {q.options ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {q.options.map((opt) => (
                      <label
                        key={opt.label}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                          answers[q.id] === opt.label
                            ? "border-primary bg-primary/5"
                            : "border-line hover:border-primary/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={opt.label}
                          checked={answers[q.id] === opt.label}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.label }))}
                          className="h-4 w-4 accent-[var(--primary)]"
                        />
                        <span className="flex-1 text-sm">
                          <span className="font-semibold">{opt.label}. </span>
                          <RichText text={opt.text} />
                        </span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-danger bg-danger/5 p-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="mt-6">
            <button
              type="button"
              onClick={() => void submit(answers)}
              disabled={busy}
              className="btn-primary w-full"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> জমা দেওয়া হচ্ছে...
                </span>
              ) : (
                "জমা দিন"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;
  const percentage =
    result.attempt.total > 0 ? Math.round((result.attempt.score / result.attempt.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F6F5F2]">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
          <h1 className="mb-1 text-2xl font-bold">ফলাফল</h1>
          <p className="mb-6 text-muted">{result.exam.title}</p>

          <div className="mb-6 rounded-lg bg-[#f3f1ec] p-4 text-center">
            <p className="text-4xl font-bold text-primary" data-score>
              {toBanglaDigits(result.attempt.score)} / {toBanglaDigits(result.attempt.total)}
            </p>
            <p className="mt-1 text-sm text-muted">{toBanglaDigits(percentage)}%</p>
          </div>

          {expired ? (
            <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              সময়সীমা শেষ, তাই সংরক্ষিত উত্তর স্বয়ংক্রিয়ভাবে জমা হয়েছে।
            </p>
          ) : null}

          <div className="space-y-4">
            {result.questions.map((q, idx) => (
              <div
                key={q.id}
                data-result-question={q.id}
                data-is-correct={q.isCorrect ? "true" : "false"}
                className={`rounded-lg border p-4 ${
                  q.isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                <div className="mb-2 flex items-start gap-2">
                  {q.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
                  )}
                  <p className="text-sm font-medium text-muted">প্রশ্ন {toBanglaDigits(idx + 1)}</p>
                </div>
                {q.stem.length > 0 ? (
                  <div className="mb-2 space-y-1 pl-7 text-sm">
                    {q.stem.map((line, i) => (
                      <p key={i} className="text-ink">
                        <RichText text={line} />
                      </p>
                    ))}
                  </div>
                ) : null}
                {q.question ? (
                  <p className="mb-2 pl-7 text-sm text-ink">
                    <RichText text={q.question} />
                  </p>
                ) : null}
                <div className="space-y-1 pl-7 text-sm">
                  <p className="text-muted">
                    আপনার উত্তর:{" "}
                    <span
                      className={
                        q.isCorrect ? "font-semibold text-green-700" : "font-semibold text-red-700"
                      }
                    >
                      {q.studentAnswer ?? "দেওয়া হয়নি"}
                    </span>
                  </p>
                  <p className="text-muted">
                    সঠিক উত্তর:{" "}
                    <span className="font-semibold text-green-700">{q.correctOption ?? "-"}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <a href="/exams" className="btn-secondary block w-full text-center">
              আরও পরীক্ষা দিন
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
