/**
 * `/api/pdf` answers 501 with `code: "chromium_unavailable"` on a host that has
 * no usable Chromium (e.g. serverless). The builder then falls back to the same
 * browser-print flow as the প্রিন্ট button instead of showing an error.
 */
export type PdfFailureBody = {
  error?: string;
  code?: string;
  fallback?: string;
};

export const BROWSER_PRINT_FALLBACK_MESSAGE =
  "ব্রাউজার প্রিন্ট খুলছে — 'Save as PDF' বেছে নিন।";

/** True only for the Chromium-unavailable answer (status 501 + its markers). */
export function isChromiumUnavailable(status: number, body: unknown): boolean {
  if (status !== 501) return false;
  if (!body || typeof body !== "object") return false;
  const data = body as PdfFailureBody;
  if (data.code === "chromium_unavailable" || data.fallback === "browser-print") return true;
  return typeof data.error === "string" && /chromium/i.test(data.error);
}
