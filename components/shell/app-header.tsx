"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LibraryBig,
  PlayCircle,
  Search,
  Upload,
} from "lucide-react";
import { SUBJECTS, subjectById } from "@/lib/subjects";
import { cn } from "@/lib/cn";
import { CommandPalette } from "@/components/shell/command-palette";

const NAV = [
  { href: "/admin", label: "ড্যাশবোর্ড", icon: LayoutDashboard, exact: true },
  { href: "/admin/bank", label: "প্রশ্নব্যাংক", icon: LibraryBig },
  { href: "/admin/papers", label: "পেপার", icon: FileText },
  { href: "/admin/exams", label: "এক্সাম", icon: ClipboardList },
  { href: "/admin/videos", label: "ভিডিও", icon: PlayCircle },
  { href: "/admin/import", label: "ইমপোর্ট", icon: Upload },
];

/** Slim application header shared by every admin route. */
export function AppHeader({ demo = false }: { demo?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const subject = subjectById(searchParams.get("subject"));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mac, setMac] = useState(false);

  // Show the shortcut this OS actually uses.
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(window.navigator.platform));
  }, []);

  // ⌘K / Ctrl+K opens the palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="no-print sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-3 sm:px-4">
          <Link
            href="/admin"
            className="flex shrink-0 items-center gap-2 rounded-md px-1 py-1 text-ink hover:text-primary"
          >
            <FlaskLogo />
            <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">প্রশ্নব্যাংক</span>
          </Link>

          <SubjectSwitcher subjectId={subject.id} pathname={pathname} />

          <nav className="ml-1 flex items-center gap-0.5" aria-label="প্রধান">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={`${item.href}?subject=${subject.id}`}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  title={item.label}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors sm:px-2.5",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted hover:bg-[#faf9f7] hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {demo ? (
              <span
                className="hidden items-center gap-1.5 rounded-full border border-[#e9d7a8] bg-[#fdf6e3] px-2.5 py-1 text-[11px] font-semibold text-[#8a5300] sm:inline-flex"
                title="Supabase কনফিগার করা নেই — লগইন ছাড়াই কাজ করছে, সব পরিবর্তন লোকাল ফাইলে থাকছে।"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" aria-hidden="true" />
                ডেমো মোড
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-[#d8d4ca] hover:text-ink"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">খুঁজুন</span>
              <kbd className="hidden rounded border border-line bg-[#faf9f7] px-1 py-0.5 font-sans text-[10px] font-semibold sm:inline">
                {mac ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>
          </div>
        </div>
      </header>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}

/** Inline-SVG flask mark (no icon font, no image request). */
function FlaskLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M9 3h6M10 3v5.2L5.4 17A3 3 0 0 0 8 21.5h8a3 3 0 0 0 2.6-4.5L14 8.2V3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.2 15h9.6" stroke="var(--subject-chemistry)" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SubjectSwitcher({ subjectId, pathname }: { subjectId: string; pathname: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const subject = subjectById(subjectId);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-medium text-ink transition-colors hover:border-[#d8d4ca]"
      >
        <span className="subject-dot" style={{ background: subject.dot }} aria-hidden="true" />
        <span>{subject.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="বিষয়"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop"
        >
          {SUBJECTS.map((option) => {
            const active = option.id === subject.id;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  router.push(`${pathname}?subject=${option.id}`);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                  active ? "bg-primary-soft text-primary" : "text-ink hover:bg-[#faf9f7]",
                )}
              >
                <span className="subject-dot" style={{ background: option.dot }} aria-hidden="true" />
                <span className="flex-1">{option.label}</span>
                {!option.hasData ? (
                  <span className="text-[10px] text-muted">ডেটা নেই</span>
                ) : null}
                {active ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              </button>
            );
          })}
          <p className="mt-1 border-t border-line px-3 pb-1 pt-2 text-[11px] text-muted">
            নতুন বিষয় যোগ করতে রেজিস্ট্রি (`lib/subjects.ts`) এ এন্ট্রি দিন।
          </p>
        </div>
      ) : null}
    </div>
  );
}
