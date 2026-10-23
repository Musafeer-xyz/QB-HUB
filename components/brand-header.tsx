"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";

/** Accent colours match the two cards on the public home page. */
const TABS = [
  { href: "/exams", label: "EXAM", accent: "#0f9d8a" },
  { href: "/videos", label: "VIDEO", accent: "#7c3aed" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/exams") return pathname === "/exams" || pathname.startsWith("/exam/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Simple branded header for the public student pages. */
export function BrandHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-surface">
      <div className="container mx-auto max-w-4xl px-4 py-3 text-center">
        <p className="text-sm font-bold tracking-[0.2em] text-ink">{BRAND_NAME}</p>
        <nav className="mt-2 flex justify-center gap-2" aria-label="বিভাগ">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center justify-center rounded-full border px-5 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors",
                  active
                    ? "border-transparent text-white shadow-sm"
                    : "border-line bg-surface text-muted hover:border-[#d8d4ca] hover:text-ink",
                )}
                style={active ? { backgroundColor: tab.accent } : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
