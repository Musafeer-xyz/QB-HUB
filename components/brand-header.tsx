import { BRAND_NAME } from "@/lib/brand";

/** Simple branded header for the public student pages. */
export function BrandHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="container mx-auto max-w-4xl px-4 py-3 text-center">
        <p className="text-sm font-bold tracking-[0.2em] text-ink">{BRAND_NAME}</p>
      </div>
    </header>
  );
}
