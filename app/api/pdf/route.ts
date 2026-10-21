import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { Browser, Page } from "playwright-core";
import { getAuthUser, isAdminUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import { getStore } from "@/lib/data/store";
import { createPrintToken } from "@/lib/print-token";
import { acquireBrowser, releaseBrowser } from "@/lib/pdf/browser";
import { getCachedPdf, pdfCacheKey, setCachedPdf } from "@/lib/pdf/cache";
import { paperDims } from "@/lib/paper/sizes";
import type { PaperRecord, QuestionRecord } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({ paperId: z.string().min(1) });

type Timings = {
  cache: "hit" | "miss";
  launchMs: number;
  navigateMs: number;
  readyMs: number;
  pdfMs: number;
  totalMs: number;
};

function pdfResponse(pdf: Buffer, paper: PaperRecord, timings: Timings) {
  const safeName = paper.title.replace(/[^\p{L}\p{N}\s_-]/gu, "").trim() || "question-paper";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${safeName}.pdf`)}`,
      "Cache-Control": "no-store",
      "X-Pdf-Cache": timings.cache,
      "X-Pdf-Timings": JSON.stringify(timings),
    },
  });
}

/**
 * Count pages from the PDF itself (cheap, no parser dependency). Every page
 * tree node has a `/Count`; the root has the total, i.e. the largest one.
 */
function countPdfPages(pdf: Buffer): number | null {
  const text = pdf.toString("latin1");
  let max = 0;
  for (const match of text.matchAll(/\/Type\s*\/Pages[\s\S]{0,120}?\/Count\s+(\d+)/g)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > max) max = value;
  }
  if (max > 0) return max;
  const pages = text.match(/\/Type\s*\/Page(?![s\w])/g);
  return pages ? pages.length : null;
}

/**
 * Renders the saved paper to PDF.
 *
 * Everything printed comes from `/print/[id]` — the same page the browser
 * prints — so page size, margins, columns and page numbers cannot diverge.
 *
 * Speed:
 *  - one shared Chromium, launched lazily and reused (new page per request);
 *  - no fixed sleeps: waits for fonts, figures and the document's
 *    `data-paper-ready` flag (set after KaTeX formulas are fitted);
 *  - results are cached under a hash of paper + settings + question content,
 *    so re-downloading an unchanged paper costs a map lookup.
 */
export async function POST(request: NextRequest) {
  const requestStart = Date.now();
  if (!isLocalMode()) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "লগইন প্রয়োজন।" }, { status: 401 });
    if (!(await isAdminUser())) return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "paperId দরকার।" }, { status: 400 });
  }
  const { paperId } = parsed.data;

  const store = await getStore();
  const paper = await store.getPaper(paperId);
  if (!paper) return NextResponse.json({ error: "পেপার পাওয়া যায়নি।" }, { status: 404 });

  // The cache key covers the paper, its settings and the actual question
  // content used — any edit changes the hash, so stale PDFs are impossible.
  const questions: QuestionRecord[] = [];
  for (const pq of paper.questions) {
    const question = await store.getQuestion(pq.questionId);
    if (question) questions.push(question);
  }
  const cacheKey = pdfCacheKey({ paper, questions });

  const cached = getCachedPdf(cacheKey);
  if (cached) {
    const timings: Timings = {
      cache: "hit",
      launchMs: 0,
      navigateMs: 0,
      readyMs: 0,
      pdfMs: 0,
      totalMs: Date.now() - requestStart,
    };
    console.info(
      `[pdf] paper=${paperId} cache=hit pages=${cached.pages ?? "?"} total=${timings.totalMs}ms`,
    );
    return pdfResponse(cached.pdf, paper, timings);
  }

  const origin = new URL(request.url).origin;
  const token = createPrintToken(paperId);
  const url = `${origin}/print/${paperId}?t=${encodeURIComponent(token)}`;

  let browser: Browser | null = null;
  let page: Page | null = null;
  const timings: Timings = {
    cache: "miss",
    launchMs: 0,
    navigateMs: 0,
    readyMs: 0,
    pdfMs: 0,
    totalMs: 0,
  };

  try {
    const dims = paperDims(paper.settings.paperSize);
    const acquired = await acquireBrowser();
    browser = acquired.browser;
    timings.launchMs = acquired.launchMs;

    page = await browser.newPage({
      viewport: { width: dims.viewportWidth, height: dims.viewportHeight },
    });

    // The renderer is offline: only the app's own files may load. This keeps
    // analytics/CDNs from adding jitter and makes the page count deterministic.
    await page.route("**/*", (route) => {
      const target = route.request().url();
      if (
        target.startsWith(origin) ||
        target.startsWith("data:") ||
        target.startsWith("blob:") ||
        target.startsWith("about:")
      ) {
        return route.continue();
      }
      return route.abort();
    });

    const navigateStart = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    timings.navigateMs = Date.now() - navigateStart;

    // No fixed sleeps: the document sets `data-paper-ready` after fonts are
    // loaded, every figure is decoded and oversized formulas are scaled.
    const readyStart = Date.now();
    await page.waitForFunction(
      () => document.querySelector('[data-paper-ready="1"]') !== null,
      undefined,
      { timeout: 25_000 },
    );
    timings.readyMs = Date.now() - readyStart;

    const pdfStart = Date.now();
    const pdf = await page.pdf({
      // The document's own @page rule (size + margins + page numbers) wins;
      // Chromium must not add its own margins or header/footer on top of it.
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    timings.pdfMs = Date.now() - pdfStart;

    const buffer = Buffer.from(pdf);
    const pages = countPdfPages(buffer);
    setCachedPdf(cacheKey, buffer, pages);
    timings.totalMs = Date.now() - requestStart;
    console.info(
      `[pdf] paper=${paperId} cache=miss launch=${timings.launchMs}ms navigate=${timings.navigateMs}ms ready=${timings.readyMs}ms pdf=${timings.pdfMs}ms total=${timings.totalMs}ms pages=${pages ?? "?"}`,
    );

    return pdfResponse(buffer, paper, timings);
  } catch (err) {
    console.error(`[pdf] paper=${paperId} failed`, err);
    return NextResponse.json(
      { error: `PDF তৈরি ব্যর্থ: ${err instanceof Error ? err.message : "অজানা সমস্যা"}` },
      { status: 500 },
    );
  } finally {
    await page?.close().catch(() => undefined);
    if (browser) releaseBrowser();
  }
}
