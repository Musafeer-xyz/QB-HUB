import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { pdfTextItems } from "./utils/pdf-raster";

/**
 * "প্রতিটি অধ্যায় নতুন পাতায় শুরু" (Advanced → মোড ও বিন্যাস) decides whether
 * chapter 2 starts a new page. The server PDF is rendered from `/print/[id]`,
 * the same page window.print() uses, so this covers the print view too.
 *
 * Page counts are read from the PDF itself and the chapter boundary is read
 * from page geometry (where the last text of page 1 sits) — never from
 * extracted Bangla text, which pdf.js mangles.
 */
test.describe.configure({ mode: "serial" });

const PAPERS_FILE = path.join(process.cwd(), "local-data", "papers.json");
const DATA_DIR = path.join(process.cwd(), "data");

const ID_SHORT_OFF = "3e2e4444-0000-4000-8000-000000000001";
const ID_SHORT_ON = "3e2e4444-0000-4000-8000-000000000002";
const ID_LONG_OFF = "3e2e4444-0000-4000-8000-000000000003";
const ID_LONG_ON = "3e2e4444-0000-4000-8000-000000000004";
const SEEDED_IDS = [ID_SHORT_OFF, ID_SHORT_ON, ID_LONG_OFF, ID_LONG_ON];

/** Bottom edge of the printable area: A4, 14 mm bottom margin (≈ 40 pt). */
const CONTENT_FLOOR_PT = 36;

type SeedQuestion = { id: string; type: string; chapter: number };

function bankQuestions(): SeedQuestion[] {
  const all: SeedQuestion[] = [];
  for (const file of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).sort()) {
    all.push(...(JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as SeedQuestion[]));
  }
  return all;
}

function pick(chapter: number, type: "CQ" | "SQ", count: number): SeedQuestion[] {
  const found = bankQuestions().filter((q) => q.chapter === chapter && q.type === type);
  expect(found.length, `chapter ${chapter} needs ${type} questions`).toBeGreaterThanOrEqual(count);
  return found.slice(0, count);
}

function writePaper(
  id: string,
  title: string,
  chapterPageBreak: boolean,
  chapterSix: SeedQuestion[],
  chapterSeven: SeedQuestion[],
): void {
  const store = JSON.parse(fs.readFileSync(PAPERS_FILE, "utf8")) as { papers: unknown[] };
  const questions = [...chapterSix, ...chapterSeven];
  const paper = {
    id,
    title,
    institute: "পরীক্ষা উচ্চ বিদ্যালয়",
    examName: "বার্ষিক পরীক্ষা ২০২৬",
    className: "দশম শ্রেণি",
    subject: "chemistry",
    durationMinutes: 180,
    totalMarks: 0,
    settings: {
      columns: "1",
      paperSize: "A4",
      marginPreset: "normal",
      grouping: "chapter",
      sectionOrder: ["SQ", "CQ"],
      chapterPageBreak,
      chapterLabel: "অধ্যায়: ৬, ৭",
      cqChoice: null,
      sqChoice: null,
    },
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: questions.map((q, i) => ({
      questionId: q.id,
      position: i,
      section: q.type,
      selectedParts: [],
    })),
  };
  store.papers = store.papers.filter((p) => (p as { id?: string }).id !== id);
  store.papers.push(paper);
  fs.writeFileSync(PAPERS_FILE, JSON.stringify(store, null, 2));
}

test.beforeAll(() => {
  const shortSix = pick(6, "SQ", 1);
  const shortSeven = pick(7, "SQ", 1);
  writePaper(ID_SHORT_OFF, "E2E — অধ্যায় বিরতি বন্ধ (সংক্ষিপ্ত)", false, shortSix, shortSeven);
  writePaper(ID_SHORT_ON, "E2E — অধ্যায় বিরতি চালু (সংক্ষিপ্ত)", true, shortSix, shortSeven);

  const longSix = [...pick(6, "SQ", 2), ...pick(6, "CQ", 1)];
  const longSeven = [...pick(7, "SQ", 2), ...pick(7, "CQ", 1)];
  writePaper(ID_LONG_OFF, "E2E — অধ্যায় বিরতি বন্ধ (লম্বা)", false, longSix, longSeven);
  writePaper(ID_LONG_ON, "E2E — অধ্যায় বিরতি চালু (লম্বা)", true, longSix, longSeven);
});

test.afterAll(() => {
  const ids = new Set(SEEDED_IDS);
  const store = JSON.parse(fs.readFileSync(PAPERS_FILE, "utf8")) as { papers: { id?: string }[] };
  store.papers = store.papers.filter((p) => !ids.has(p.id ?? ""));
  fs.writeFileSync(PAPERS_FILE, JSON.stringify(store, null, 2));
});

async function serverPdf(page: Page, id: string): Promise<Buffer> {
  // A cold dev server compiles `/print/[id]` on the first render, so give the
  // render more room than the 30 s API default.
  const res = await page.request.post("/api/pdf", {
    data: { paperId: id },
    timeout: 180_000,
  });
  expect(res.status(), await res.text()).toBe(200);
  return Buffer.from(await res.body());
}

/** Browser print of the print view — what "প্রিন্ট ভিউ" prints. */
async function browserPrintPdf(page: Page, id: string): Promise<Buffer> {
  await page.goto(`/print/${id}`, { timeout: 120_000 });
  await page.waitForSelector('[data-paper-ready="1"]', { timeout: 120_000 });
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: "screen" });
  return Buffer.from(pdf);
}

async function pdfPageCount(pdf: Buffer): Promise<number> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(pdf) });
  const doc = await task.promise;
  const pages = doc.numPages;
  await task.destroy();
  return pages;
}

/** Lowest printed line of page 1, in points above the page's bottom edge. */
async function lowestContentY(pdf: Buffer): Promise<number> {
  const items = await pdfTextItems(pdf, 1);
  // The page number lives in the bottom margin; body text never goes there.
  const body = items.filter((item) => item.y > CONTENT_FLOOR_PT);
  expect(body.length, "page 1 must have printed content").toBeGreaterThan(0);
  return Math.min(...body.map((item) => item.y));
}

test("chapter page break follows 'প্রতিটি অধ্যায় নতুন পাতায় শুরু'", async ({ page }) => {
  // Two short chapters fit on one page; the toggle must push the second to page 2.
  expect(await pdfPageCount(await serverPdf(page, ID_SHORT_OFF))).toBe(1);
  expect(await pdfPageCount(await serverPdf(page, ID_SHORT_ON))).toBe(2);

  // Two chapters that together need more than one page. With the toggle off the
  // second chapter must continue on page 1 (a forced break would leave page 1
  // with a chapter-sized hole and start the next chapter at the top of page 2).
  const off = await serverPdf(page, ID_LONG_OFF);
  const on = await serverPdf(page, ID_LONG_ON);
  const offBottom = await lowestContentY(off);
  const onBottom = await lowestContentY(on);
  expect(offBottom, "toggle off: chapter 2 continues on page 1").toBeLessThan(200);
  expect(onBottom, "toggle on: chapter 2 starts on page 2").toBeGreaterThan(offBottom + 60);

  // The print view window.print() opens must print exactly what the PDF shows.
  const printed = await browserPrintPdf(page, ID_LONG_OFF);
  expect(await pdfPageCount(printed)).toBe(await pdfPageCount(off));
  expect(Math.abs((await lowestContentY(printed)) - offBottom)).toBeLessThan(5);
});
