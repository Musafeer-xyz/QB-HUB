"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toBanglaDigits } from "@/lib/bangla";

interface CreateExamFormProps {
  mcqIds: string[];
  subject: string;
  chapter: number;
  chapterLabel: string;
  questionCount: number;
}

export function CreateExamForm({
  mcqIds,
  subject,
  chapter,
  chapterLabel,
  questionCount,
}: CreateExamFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const durationMin = parseInt(duration, 10);
      if (!title.trim()) {
        setError("শিরোনাম প্রয়োজন।");
        setLoading(false);
        return;
      }
      if (isNaN(durationMin) || durationMin <= 0) {
        setError("সময়সীমা সঠিক নয়।");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject,
          chapter,
          questionIds: mcqIds,
          durationMin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "এক্সাম তৈরি করা যায়নি।");
        setLoading(false);
        return;
      }

      router.push("/admin/exams");
    } catch {
      setError("এক্সাম তৈরি করা যায়নি।");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-line bg-surface p-6">
        <div className="mb-4 space-y-1">
          <p className="text-sm text-muted">
            বিষয়: <span className="font-medium text-ink">{subject}</span>
          </p>
          <p className="text-sm text-muted">
            অধ্যায়: <span className="font-medium text-ink">{chapterLabel}</span>
          </p>
          <p className="text-sm text-muted">
            প্রশ্ন: <span className="font-medium text-ink">{toBanglaDigits(questionCount)}টি MCQ</span>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
              এক্সামের শিরোনাম
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: অধ্যায় ৬ মোলের ধারণা - অনলাইন পরীক্ষা"
              className="field-input w-full"
              required
            />
          </div>

          <div>
            <label htmlFor="duration" className="mb-1.5 block text-sm font-medium">
              সময়সীমা (মিনিট)
            </label>
            <input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              className="field-input w-full"
              required
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger bg-danger/5 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "তৈরি হচ্ছে..." : "এক্সাম তৈরি করুন"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
          disabled={loading}
        >
          বাতিল
        </button>
      </div>
    </form>
  );
}
