"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RichTextLivePreview } from "@/components/rich-text";
import { MathTextarea } from "@/components/bank/math-textarea";
import { useToast } from "@/components/toast";
import { saveQuestionAction } from "@/app/actions/questions";
import { questionImageUrl } from "@/lib/images";
import { toBanglaDigits } from "@/lib/bangla";
import type { QuestionRecord } from "@/lib/types";

type PartForm = { label: string; marks: number; text: string; answer: string | null };

const EMPTY_PART: PartForm = { label: "", marks: 1, text: "", answer: null };

/**
 * Create/edit a question. The right column is a live preview that renders the
 * exact same Bangla + KaTeX output used in the bank, print preview and PDF.
 */
export function QuestionForm({ initial }: { initial?: QuestionRecord }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  const [id, setId] = useState(initial?.id ?? "");
  const [chapter, setChapter] = useState(initial?.chapter ?? 6);
  const [type, setType] = useState<"CQ" | "SQ" | "MCQ">(initial?.type ?? "CQ");
  const [stars, setStars] = useState<number | null>(initial?.stars ?? null);
  const [boardsText, setBoardsText] = useState((initial?.boards ?? []).join(", "));
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [stem, setStem] = useState<string[]>(initial?.stem ?? []);
  const [image, setImage] = useState<string | null>(initial?.imagePath ?? null);
  const [imageDesc, setImageDesc] = useState(initial?.imageDesc ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [parts, setParts] = useState<PartForm[]>(
    initial?.parts.length
      ? initial.parts.map((p) => ({ label: p.label, marks: p.marks, text: p.text, answer: p.answer }))
      : [
          { label: "ক", marks: 1, text: "", answer: null },
          { label: "খ", marks: 2, text: "", answer: null },
          { label: "গ", marks: 3, text: "", answer: null },
          { label: "ঘ", marks: 4, text: "", answer: null },
        ],
  );
  const [uploading, setUploading] = useState(false);

  const boards = useMemo(
    () =>
      boardsText
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean),
    [boardsText],
  );

  const totalMarks = useMemo(
    () => (type === "CQ" ? parts.reduce((sum, p) => sum + (Number(p.marks) || 0), 0) : 2),
    [parts, type],
  );

  async function onUpload(file: File) {
    if (!id.trim()) {
      push("error", "আগে প্রশ্নের id দিন, তারপর ছবি আপলোড করুন।");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", id.trim());
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data: { path?: string; error?: string } = await res.json();
      if (!res.ok || !data.path) {
        push("error", data.error ?? "আপলোড ব্যর্থ হয়েছে।");
        return;
      }
      setImage(data.path);
      push("success", "ছবি আপলোড হয়েছে।");
    } finally {
      setUploading(false);
    }
  }

  function onSave() {
    startTransition(async () => {
      const res = await saveQuestionAction({
        id: id.trim(),
        subject: "chemistry",
        chapter: Number(chapter),
        type,
        stars,
        boards,
        question: type === "SQ" || type === "MCQ" ? question : question.trim() || null,
        stem: type === "CQ" ? stem.map((s) => s) : [],
        image: type === "SQ" ? null : image,
        image_desc: type === "SQ" ? null : imageDesc.trim() || null,
        answer: answer.trim() || null,
        parts: type === "CQ" ? parts.filter((p) => p.label.trim() && p.text.trim()) : [],
      });
      if (!res.ok) {
        push("error", res.message);
        return;
      }
      push("success", res.message);
      router.push("/admin/bank");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ---------------- form ---------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{initial ? "প্রশ্ন সম্পাদনা" : "নতুন প্রশ্ন"}</h1>
          <button type="button" className="btn-primary" onClick={onSave} disabled={pending}>
            {pending ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
          </button>
        </div>

        <div className="card grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="qid">id</label>
            <input
              id="qid"
              className="field-input font-mono"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="chem-06-cq-001"
              readOnly={Boolean(initial)}
            />
            <p className="mt-1 text-xs text-muted">অনন্য ও স্থায়ী — পরে বদলানো যায় না।</p>
          </div>
          <div>
            <label className="field-label" htmlFor="chapter">অধ্যায়</label>
            <input
              id="chapter"
              type="number"
              min={1}
              max={99}
              className="field-input"
              value={chapter}
              onChange={(e) => setChapter(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="type">ধরন</label>
            <select
              id="type"
              className="field-input"
              value={type}
              onChange={(e) => setType(e.target.value as "CQ" | "SQ" | "MCQ")}
            >
              <option value="CQ">CQ (সৃজনশীল)</option>
              <option value="SQ">SQ (সংক্ষিপ্ত)</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="stars">কাঠিন্য (১–৫, ঐচ্ছিক)</label>
            <select
              id="stars"
              className="field-input"
              value={stars ?? ""}
              onChange={(e) => setStars(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">নেই</option>
              {[1, 2, 3, 4, 5].map((s) => (
                <option key={s} value={s}>{"★".repeat(s)}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="boards">বোর্ড (কমা দিয়ে আলাদা)</label>
            <input
              id="boards"
              className="field-input"
              value={boardsText}
              onChange={(e) => setBoardsText(e.target.value)}
              placeholder="ঢাকা বোর্ড ২০২০, রাজশাহী বোর্ড ২০১৯"
            />
          </div>
        </div>

        {type === "SQ" || type === "MCQ" ? (
          <div className="card">
            <label className="field-label" htmlFor="question">প্রশ্ন</label>
            <MathTextarea
              id="question"
              className="min-h-[110px]"
              value={question}
              onChange={setQuestion}
            />
            <p className="mt-1 text-xs text-muted">
              Bangla টেক্সট ও $...$ LaTeX/chemistry একসাথে ব্যবহার করা যায়।
            </p>
          </div>
        ) : (
          <>
            <div className="card">
              <label className="field-label">স্টেম (উদ্দীপক) — প্রতিটি লাইন আলাদা প্যারাগ্রাফ</label>
              {stem.map((line, i) => (
                <div key={i} className="mb-2 flex items-start gap-2">
                  <MathTextarea
                    className="min-h-[64px]"
                    value={line}
                    onChange={(value) => {
                      const next = [...stem];
                      next[i] = value;
                      setStem(next);
                    }}
                    ariaLabel={`স্টেম লাইন ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-secondary shrink-0"
                    onClick={() => setStem(stem.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="btn-secondary" onClick={() => setStem([...stem, ""])}>
                ＋ লাইন যোগ করুন
              </button>
            </div>

            <div className="card">
              <label className="field-label" htmlFor="image">চিত্র (PNG/JPEG/WebP)</label>
              <input
                id="image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="field-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUpload(file);
                }}
                disabled={uploading}
              />
              {image ? (
                <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                  ফাইল: <code className="rounded bg-[#f3f1ec] px-1">{image}</code>
                  <button type="button" className="text-red-700 underline" onClick={() => setImage(null)}>
                    সরান
                  </button>
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted">ছবি না দিলে প্রিন্টে প্লেসহোল্ডার দেখানো হবে।</p>
              )}
              <label className="field-label mt-3" htmlFor="imagedesc">চিত্রের বর্ণনা (alt text)</label>
              <input
                id="imagedesc"
                className="field-input"
                value={imageDesc}
                onChange={(e) => setImageDesc(e.target.value)}
              />
            </div>

            <div className="card">
              <div className="mb-2 flex items-center justify-between">
                <span className="field-label mb-0">পার্টসমূহ (মোট {toBanglaDigits(totalMarks)} নম্বর)</span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setParts([...parts, { ...EMPTY_PART }])}
                >
                  ＋ পার্ট
                </button>
              </div>
              {parts.map((part, i) => (
                <div key={i} className="mb-3 rounded-lg border border-line p-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="field-input w-16 text-center"
                      value={part.label}
                      onChange={(e) => {
                        const next = [...parts];
                        next[i] = { ...part, label: e.target.value };
                        setParts(next);
                      }}
                      aria-label="পার্ট লেবেল"
                      placeholder="ক"
                    />
                    <input
                      className="field-input w-24"
                      type="number"
                      min={0}
                      max={100}
                      value={part.marks}
                      onChange={(e) => {
                        const next = [...parts];
                        next[i] = { ...part, marks: Number(e.target.value) };
                        setParts(next);
                      }}
                      aria-label="নম্বর"
                    />
                    <span className="ml-auto text-xs text-muted">পার্ট {i + 1}</span>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setParts(parts.filter((_, idx) => idx !== i))}
                    >
                      ✕
                    </button>
                  </div>
                  <MathTextarea
                    className="mt-2 min-h-[56px]"
                    value={part.text}
                    onChange={(value) => {
                      const next = [...parts];
                      next[i] = { ...part, text: value };
                      setParts(next);
                    }}
                    placeholder="পার্টের প্রশ্ন"
                    ariaLabel="পার্টের প্রশ্ন"
                  />
                  <input
                    className="field-input mt-2"
                    value={part.answer ?? ""}
                    onChange={(e) => {
                      const next = [...parts];
                      next[i] = { ...part, answer: e.target.value || null };
                      setParts(next);
                    }}
                    placeholder="উত্তর (প্রিন্টে দেখানো হবে না)"
                    aria-label="পার্টের উত্তর"
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="card">
          <label className="field-label" htmlFor="answer">সাধারণ উত্তর (ঐচ্ছিক)</label>
          <textarea
            id="answer"
            className="field-input min-h-[70px]"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="বর্তমানে সব প্রশ্নের উত্তর null; ভবিষ্যতের জন্য সংরক্ষিত"
          />
          <p className="mt-1 text-xs text-muted">
            উত্তর কেবল অ্যাডমিনে সংরক্ষিত থাকে — ফিচার ফ্ল্যাগ বন্ধ থাকায় প্রিন্টযোগ্য পেপারে কখনো দেখা যায় না।
          </p>
        </div>
      </section>

      {/* ---------------- live preview ---------------- */}
      <section className="lg:sticky lg:top-16 lg:h-fit">
        <div className="rounded-xl border border-line bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <h2 className="text-sm font-bold text-ink">লাইভ প্রিভিউ</h2>
            <span className="chip">{type} · মোট {toBanglaDigits(totalMarks)} নম্বর</span>
          </div>
          <div className="max-h-[75vh] space-y-3 overflow-auto p-4 text-[15px] leading-7">
            {type === "CQ" ? (
              <>
                {stem.map((line, i) => (
                  <RichTextLivePreview key={i} text={line} className="question-text" />
                ))}
                {image ? (
                  <figure className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={questionImageUrl(image) ?? ""}
                      alt={imageDesc || "প্রশ্নের চিত্র"}
                      className="max-h-56 max-w-full object-contain"
                    />
                    {imageDesc ? (
                      <figcaption className="text-xs text-muted">{imageDesc}</figcaption>
                    ) : null}
                  </figure>
                ) : null}
                <table className="w-full border-collapse">
                  <tbody>
                    {parts.map((part, i) => (
                      <tr key={i} className="align-top">
                        <td className="w-7 py-1 font-semibold">({part.label || "?"})</td>
                        <td className="py-1">
                          <RichTextLivePreview text={part.text} />
                        </td>
                        <td className="w-12 py-1 text-right text-muted">
                          [{toBanglaDigits(part.marks || 0)}]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <RichTextLivePreview text={question} className="question-text" />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
