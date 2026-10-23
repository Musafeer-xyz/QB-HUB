import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";

/** Simple branded header for the public student pages. */
export function BrandHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="container mx-auto max-w-4xl px-4 py-3 text-center">
        <p className="text-sm font-bold tracking-[0.2em] text-ink">{BRAND_NAME}</p>
        <nav className="mt-1 flex justify-center gap-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          <Link href="/exams" className="transition-colors hover:text-ink">
            EXAM
          </Link>
          <Link href="/videos" className="transition-colors hover:text-ink">
            VIDEO
          </Link>
        </nav>
      </div>
    </header>
  );
}
