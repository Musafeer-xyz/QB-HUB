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

interface BrandHeaderProps {
  /** Hide nav links (used during active exam to prevent accidental exit) */
  hideNav?: boolean;
}

/** Simple branded header for the public student pages. */
export function BrandHeader({ hideNav = false }: BrandHeaderProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const showNav = !hideNav && !isHome;

  return (
    <header className="border-b border-line bg-surface">
      <div className="container mx-auto max-w-4xl px-4 py-4 text-center">
        <Link
          href="/"
          className="block text-xl font-extrabold uppercase tracking-[0.12em] text-ink sm:text-3xl sm:tracking-[0.18em]"
        >
          {BRAND_NAME}
        </Link>
        {showNav && (
          <nav className="mt-3 flex items-center justify-center gap-6" aria-label="বিভাগ">
            {TABS.map((tab) => {
              const active = isActive(pathname, tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "min-h-10 text-xs font-semibold uppercase tracking-[0.12em] transition-colors sm:text-sm sm:tracking-[0.15em]",
                    active
                      ? "text-ink"
                      : "text-muted hover:text-ink",
                  )}
                  style={{
                    borderBottom: active ? `2px solid ${tab.accent}` : undefined,
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
