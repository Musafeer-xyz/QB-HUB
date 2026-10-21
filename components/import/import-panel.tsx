"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { commitImportAction, previewImportAction, type ImportPreviewResult } from "@/app/actions/import";
import { toBanglaDigits } from "@/lib/bangla";

type SourceFile = { name: string; items: unknown[] };

const ACTION_LABELS: Record<string, string> = {
  insert: "নতুন",
  update: "হালনাগাদ",
  unchanged: "অপরিবর্তিত",
  skipped: "বাতিল",
};

const ACTION_CLASSES: Record<string, string> = {
  insert: "bg-emerald-50 text-emerald-800",
  update: "bg-sky-50 text-sky-800",
  unchanged: "bg-[#f3f1ec] text-muted",
  skipped: "bg-red-50 text-red-700",
};

function parsePasted(text: string): unknown[] {
  const data: unknown = JSON.parse(text);
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { questions?: unknown }).questions)) {
    return (data as { questions: unknown[] }).questions;
  }
  throw new Error("JSON একটি অ্যারে হতে হবে (অথবা { \"questions\": [...] })।");
}

/**
 * Import workflow: paste/choose JSON + figures, see the per-item diff first,
 * then confirm. Nothing is written until the confirm button is pressed.
 */
export function ImportPanel() {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  const [pasted, setPasted] = useState("");
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onUploadImages(list: FileList | null) {
    if (!list || list.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(list)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("name", file.name);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data: { path?: string; error?: string } = await res.json();
        if (!res.ok || !data.path) {
          push("error", data.error ?? `“${file.name}” আপলোড ব্যর্থ।`);
          continue;
        }
        uploaded.push(data.path);
      }
      if (uploaded.length > 0) {
        setImages((prev) => [...new Set([...prev, ...uploaded])]);
        push("success", `${toBanglaDigits(uploaded.length)}টি ছবি আপলোড হয়েছে।`);
      }
    } finally {
      setUploading(false);
    }
  }

  function collectFiles(): SourceFile[] {
    const out = [...files];
    if (pasted.trim()) {
      out.push({ name: "paste.json", items: parsePasted(pasted) });
    }
    return out;
  }

  function onPreview() {
    setError(null);
    setPreview(null);
    let parsedFiles: SourceFile[];
    try {
      parsedFiles = collectFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON পড়া যায়নি।");
      return;
    }
    if (parsedFiles.length === 0) {
      setError("JSON পেস্ট করুন বা .json ফাইল বেছে নিন।");
      return;
    }
    startTransition(async () => {
      const res = await previewImportAction({ files: parsedFiles, images });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setPreview(res);
    });
  }

  function onConfirm() {
    if (!preview || !preview.ok) return;
    let parsedFiles: SourceFile[];
    try {
      parsedFiles = collectFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON পড়া যায়নি।");
      return;
    }
    startTransition(async () => {
      const res = await commitImportAction({ files: parsedFiles, images });
      if (!res.ok) {
        push("error", res.message);
        return;
      }
      push("success", res.message);
      setPreview(null);
      router.refresh();
    });
  }

  const totals = preview && preview.ok ? preview.totals : null;
  const savable = totals ? totals.insert + totals.update : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">প্রশ্ন ইমপোর্ট</h1>
        <span className="text-xs text-muted">একই id হলে আগের প্রশ্ন হালনাগাদ হবে</span>
      </div>

      <section className="card space-y-3">
        <div>
          <label className="field-label" htmlFor="paste-json">
            JSON পেস্ট করুন
          </label>
          <textarea
            id="paste-json"
            className="field-input min-h-[160px] font-mono text-[12px]"
            placeholder='[ { "id": "chem-06-sq-001", "type": "SQ", ... } ]'
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              setPreview(null);
            }}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="json-files">
              অথবা .json ফাইল
            </label>
            <input
              id="json-files"
              type="file"
              accept="application/json,.json"
              multiple
              className="field-input"
              onChange={async (e) => {
                const chosen = Array.from(e.target.files ?? []);
                const next: SourceFile[] = [];
                for (const file of chosen) {
                  try {
                    next.push({ name: file.name, items: parsePasted(await file.text()) });
                  } catch (err) {
                    setError(
                      `“${file.name}”: ${err instanceof Error ? err.message : "JSON পড়া যায়নি।"}`,
                    );
                  }
                }
                setFiles(next);
                setPreview(null);
              }}
            />
            {files.length > 0 ? (
              <p className="mt-1 text-xs text-muted">
                {toBanglaDigits(files.length)}টি ফাইল ·{" "}
                {toBanglaDigits(files.reduce((sum, f) => sum + f.items.length, 0))}টি আইটেম
              </p>
            ) : null}
          </div>

          <div>
            <label className="field-label" htmlFor="image-files">
              চিত্র (PNG/JPEG/WebP)
            </label>
            <input
              id="image-files"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="field-input"
              disabled={uploading}
              onChange={(e) => void onUploadImages(e.target.files)}
            />
            <p className="mt-1 text-xs text-muted">
              {uploading
                ? "আপলোড হচ্ছে…"
                : `${toBanglaDigits(images.length)}টি ছবি প্রস্তুত — সংরক্ষণের আগে আপলোড হয়`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={onPreview}
            disabled={pending || uploading}
          >
            {pending ? "যাচাই হচ্ছে…" : "যাচাই করুন"}
          </button>
          <span className="text-xs text-muted">
            আগে যাচাই করুন — কোনো কিছু তখনো সংরক্ষিত হয়নি।
          </span>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {preview && preview.ok ? (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">যাচাইয়ের রিপোর্ট</h2>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="chip">নতুন {toBanglaDigits(preview.totals.insert)}</span>
              <span className="chip">হালনাগাদ {toBanglaDigits(preview.totals.update)}</span>
              <span className="chip">অপরিবর্তিত {toBanglaDigits(preview.totals.unchanged)}</span>
              <span className="chip">বাতিল {toBanglaDigits(preview.totals.skipped)}</span>
            </div>
          </div>

          {preview.issues.length > 0 ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              <p className="font-semibold">
                {toBanglaDigits(preview.issues.length)}টি ডেটা-ত্রুটি — ঠিক না করা পর্যন্ত সংরক্ষণ
                বন্ধ:
              </p>
              <ul className="mt-1 space-y-0.5">
                {preview.issues.map((issue, i) => (
                  <li key={`${issue.id}-${i}`}>
                    <span className="font-mono">{issue.file}</span> →{" "}
                    <span className="font-mono">{issue.id}</span>: {issue.problem}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="max-h-96 overflow-auto rounded-lg border border-line">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#faf9f7] text-muted">
                <tr>
                  <th className="px-2 py-1.5">ফাইল</th>
                  <th className="px-2 py-1.5">id</th>
                  <th className="px-2 py-1.5">অবস্থা</th>
                  <th className="px-2 py-1.5">কারণ / সতর্কতা</th>
                </tr>
              </thead>
              <tbody>
                {preview.entries.map((entry, i) => (
                  <tr key={`${entry.file}-${entry.id}-${i}`} className="border-t border-line">
                    <td className="px-2 py-1.5 font-mono text-muted">{entry.file}</td>
                    <td className="px-2 py-1.5 font-mono">{entry.id}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className={
                          "rounded px-1.5 py-0.5 font-semibold " +
                          (ACTION_CLASSES[entry.action] ?? "bg-[#f3f1ec] text-muted")
                        }
                      >
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-muted">
                      {entry.reason}
                      {entry.warnings.length > 0 ? (
                        <span className="block text-amber-700">! {entry.warnings.join(" · ")}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={onConfirm}
              disabled={pending || savable === 0 || preview.issues.length > 0}
            >
              {pending ? "সংরক্ষণ হচ্ছে…" : `নিশ্চিত করে সংরক্ষণ করুন (${toBanglaDigits(savable)})`}
            </button>
            <span className="text-xs text-muted">
              {savable === 0
                ? "সংরক্ষণের মতো নতুন বা বদলানো প্রশ্ন নেই।"
                : "শুধু নতুন ও হালনাগাদ আইটেম লেখা হবে; অপরিবর্তিত ও বাতিল বাদ যাবে।"}
            </span>
          </div>
        </section>
      ) : null}
    </div>
  );
}
