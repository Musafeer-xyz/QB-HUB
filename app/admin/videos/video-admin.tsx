"use client";

import { useState, type FormEvent } from "react";
import { EXAM_SECTIONS } from "@/lib/subjects";
import { youtubeThumbnailUrl } from "@/lib/video";
import type { VideoRecord } from "@/lib/types";

type FormState = {
  link: string;
  subject: string;
  topic: string;
  title: string;
  position: string;
  published: boolean;
};

const EMPTY: FormState = {
  link: "",
  subject: EXAM_SECTIONS[0]!.id,
  topic: "",
  title: "",
  position: "0",
  published: true,
};

/** Admin video list with a paste-a-link form (add and edit share it). */
export function VideoAdmin({ initialVideos }: { initialVideos: VideoRecord[] }) {
  const [videos, setVideos] = useState(initialVideos);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  function startEdit(video: VideoRecord) {
    setEditingId(video.id);
    setForm({
      link: video.youtubeId,
      subject: video.subject,
      topic: video.topic,
      title: video.title,
      position: String(video.position),
      published: video.published,
    });
    setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(editingId ? `/api/videos/admin/${editingId}` : "/api/videos/admin", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeId: form.link,
          subject: form.subject,
          topic: form.topic,
          title: form.title,
          position: form.position,
          published: form.published,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "সংরক্ষণ করা যায়নি।");
        return;
      }
      const video = data.video as VideoRecord;
      setVideos((prev) =>
        editingId ? prev.map((v) => (v.id === video.id ? video : v)) : [...prev, video],
      );
      reset();
    } catch {
      setError("সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।");
    } finally {
      setBusy(false);
    }
  }

  async function remove(video: VideoRecord) {
    if (!confirm(`"${video.title}" মুছে ফেলবেন?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/videos/admin/${video.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "মুছে ফেলা যায়নি।");
        return;
      }
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      if (editingId === video.id) reset();
    } catch {
      setError("মুছে ফেলা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।");
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="rounded-lg border border-line bg-surface p-4 shadow-sm">
        <h2 className="mb-4 font-semibold">{editingId ? "ভিডিও সম্পাদনা" : "নতুন ভিডিও"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="link" className="mb-1.5 block text-sm font-medium">
              YouTube লিংক *
            </label>
            <input
              id="link"
              type="text"
              required
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://youtu.be/…"
              className="field-input w-full"
            />
          </div>
          <div>
            <label htmlFor="subject" className="mb-1.5 block text-sm font-medium">
              বিষয় *
            </label>
            <select
              id="subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="field-input w-full"
            >
              {EXAM_SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.english} — {section.bangla}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="topic" className="mb-1.5 block text-sm font-medium">
              টপিক
            </label>
            <input
              id="topic"
              type="text"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              placeholder="যেমন: মোলের ধারণা"
              className="field-input w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
              শিরোনাম *
            </label>
            <input
              id="title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="field-input w-full"
            />
          </div>
          <div>
            <label htmlFor="position" className="mb-1.5 block text-sm font-medium">
              অবস্থান
            </label>
            <input
              id="position"
              type="number"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="field-input w-full"
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              id="published"
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            প্রকাশিত
          </label>
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-danger bg-danger/5 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "সংরক্ষণ হচ্ছে..." : editingId ? "সংরক্ষণ করুন" : "যোগ করুন"}
          </button>
          {editingId ? (
            <button type="button" onClick={reset} className="btn-secondary">
              বাতিল
            </button>
          ) : null}
        </div>
      </form>

      <div className="space-y-2">
        {videos.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-6 text-center text-muted">
            এখনো কোনো ভিডিও নেই।
          </p>
        ) : (
          videos.map((video) => (
            <div
              key={video.id}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-3 shadow-sm"
            >
              <img
                src={youtubeThumbnailUrl(video.youtubeId)}
                alt=""
                width={96}
                height={54}
                loading="lazy"
                className="h-14 w-24 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{video.title}</p>
                <p className="text-xs text-muted">
                  {video.subject} · {video.topic || "—"} · অবস্থান {video.position} ·{" "}
                  {video.published ? "প্রকাশিত" : "খসড়া"}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => startEdit(video)} className="btn-secondary">
                  সম্পাদনা
                </button>
                <button type="button" onClick={() => void remove(video)} className="btn-secondary">
                  মুছুন
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
