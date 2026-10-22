"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  FileText,
  LayoutDashboard,
  LibraryBig,
  Plus,
  Upload,
  UserRound,
} from "lucide-react";
import { NEW_PAPER_EVENT, useSelection } from "@/components/selection/selection-context";
import { SUBJECTS } from "@/lib/subjects";
import { toBanglaDigits } from "@/lib/bangla";
import type { QuestionRecord } from "@/lib/types";

type PaletteQuestion = { id: string; text: string; chapter: number; type: string };

/**
 * Command palette: ⌘K / Ctrl+K. Navigation and subject switching are always
 * available; the first open lazily loads the question index so a teacher can
 * jump straight to a question by id or text.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const selection = useSelection();
  const [questions, setQuestions] = useState<PaletteQuestion[] | null>(null);

  useEffect(() => {
    if (!open) {
      setQuestions(null);
      return;
    }
    let cancelled = false;
    fetch("/api/questions")
      .then(async (res) => (res.ok ? ((await res.json()) as { items?: QuestionRecord[] }) : null))
      .then((data) => {
        if (cancelled) return;
        setQuestions(
          (data?.items ?? []).map((q) => ({
            id: q.id,
            text: [q.question ?? "", ...q.stem, ...q.parts.map((p) => p.text)].join(" ").slice(0, 160),
            chapter: q.chapter,
            type: q.type,
          })),
        );
      })
      .catch(() => !cancelled && setQuestions([]));
    return () => {
      cancelled = true;
    };
  }, [open]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  /** “নতুন পেপার” starts empty: drop the saved draft and tell the builder. */
  function newPaper() {
    selection.reset();
    window.dispatchEvent(new Event(NEW_PAPER_EVENT));
    go("/admin/papers/new");
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="কমান্ড"
      title="কমান্ড"
      shouldFilter
    >
      <Command.Input placeholder="খুঁজুন: পাতা, বিষয় বা প্রশ্নের id…" autoFocus />
      <Command.List>
        <Command.Empty>কিছু পাওয়া যায়নি।</Command.Empty>

        <Command.Group heading="যান">
          <Item icon={<LayoutDashboard />} label="ড্যাশবোর্ড" onSelect={() => go("/admin")} />
          <Item icon={<LibraryBig />} label="প্রশ্নব্যাংক" onSelect={() => go("/admin/bank")} />
          <Item icon={<FileText />} label="পেপার" onSelect={() => go("/admin/papers")} />
          <Item icon={<Upload />} label="ইমপোর্ট" onSelect={() => go("/admin/import")} />
        </Command.Group>

        <Command.Group heading="তৈরি করুন">
          <Item icon={<Plus />} label="নতুন প্রশ্ন" onSelect={() => go("/admin/questions/new")} />
          <Item icon={<FileText />} label="নতুন পেপার" onSelect={newPaper} />
        </Command.Group>

        <Command.Group heading="বিষয়">
          {SUBJECTS.map((subject) => (
            <Item
              key={subject.id}
              icon={<UserRound />}
              label={subject.label}
              onSelect={() => go(`/admin/bank?subject=${subject.id}`)}
            />
          ))}
        </Command.Group>

        {questions !== null ? (
          <Command.Group heading={`প্রশ্ন (${toBanglaDigits(questions.length)})`}>
            {questions.map((q) => (
              <Command.Item
                key={q.id}
                value={`${q.id} ${q.text}`}
                onSelect={() => go(`/admin/questions/${encodeURIComponent(q.id)}/edit`)}
              >
                <span className="font-mono text-[11px] text-muted">{q.id}</span>
                <span className="truncate">{q.text || "(শব্দহীন প্রশ্ন)"}</span>
              </Command.Item>
            ))}
          </Command.Group>
        ) : (
          <Command.Loading>প্রশ্ন লোড হচ্ছে…</Command.Loading>
        )}
      </Command.List>
    </Command.Dialog>
  );
}

function Item({
  icon,
  label,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item value={label} onSelect={onSelect}>
      <span className="grid h-5 w-5 place-items-center text-muted [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </Command.Item>
  );
}
