import crypto from "node:crypto";

/**
 * In-memory PDF cache.
 *
 * The key is a hash of everything that can change the printed bytes: the
 * paper (title/header/marks/settings), the selected parts and the full content
 * of the questions used. Any edit therefore produces a new key and the old
 * entry simply ages out — there is nothing to invalidate by hand.
 */
export type CachedPdf = { pdf: Buffer; createdAt: number; pages: number | null };

const MAX_ENTRIES = 24;
const MAX_BYTES = 96 * 1024 * 1024;

const cache = new Map<string, CachedPdf>();
let totalBytes = 0;

/** Stable JSON (sorted keys) so an equivalent payload hashes identically. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}

export function pdfCacheKey(parts: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(parts)).digest("hex");
}

export function getCachedPdf(key: string): CachedPdf | null {
  const hit = cache.get(key);
  if (!hit) return null;
  // Refresh LRU position.
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

export function setCachedPdf(key: string, pdf: Buffer, pages: number | null = null): CachedPdf {
  const existing = cache.get(key);
  if (existing) {
    totalBytes -= existing.pdf.byteLength;
    cache.delete(key);
  }
  const entry: CachedPdf = { pdf, createdAt: Date.now(), pages };
  cache.set(key, entry);
  totalBytes += pdf.byteLength;

  while (cache.size > MAX_ENTRIES || totalBytes > MAX_BYTES) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    const victim = cache.get(oldest.value);
    cache.delete(oldest.value);
    if (victim) totalBytes -= victim.pdf.byteLength;
  }
  return entry;
}

export function clearPdfCache(): void {
  cache.clear();
  totalBytes = 0;
}

export function pdfCacheStats(): { entries: number; bytes: number } {
  return { entries: cache.size, bytes: totalBytes };
}
