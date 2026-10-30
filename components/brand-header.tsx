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

/**
 * The wordmark carries two colours: the first word is the brand accent and the
 * rest stays in the text colour. `BRAND_NAME` itself is never split elsewhere
 * (the paper header prints the whole string).
 */
function Wordmark() {
  const space = BRAND_NAME.indexOf(" ");
  if (space === -1) return <span style={{ color: "var(--brand-accent)" }}>{BRAND_NAME}</span>;
  return (
    <>
      <span style={{ color: "var(--brand-accent)" }}>{BRAND_NAME.slice(0, space)}</span>
      {" " + BRAND_NAME.slice(space + 1)}
    </>
  );
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
          aria-label={BRAND_NAME}
          className="block text-xl font-extrabold uppercase tracking-[0.12em] text-ink sm:text-3xl sm:tracking-[0.18em]"
        >
          <Wordmark />
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
