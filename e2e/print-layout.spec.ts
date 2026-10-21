import fs from "node:fs";
import path from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { expect, test, type Page } from "@playwright/test";
import {
  differingRatio,
  inkFraction,
  inkFractionInBox,
  pdfTextItems,
  rasterizePdfPage,
  spacerBoxes,
  unionBox,
} from "./utils/pdf-raster";

/**
 * Print-layout acceptance, run on the real bank (all CQ + SQ of chapters ৬ and
 * ৭ — 92 questions from `data/chem-06..10.json`):
 *
 *  - 1 column and 2 columns must both print through the same @page rule;
 *  - nothing may leave the printable area on any page;
 *  - the server PDF must have exactly the same page count as browser print;
 *  - page numbers print as Bangla numerals in the bottom margin;
 *  - suggestion sheets hide the exam furniture by default;
 *  - a formula wider than its column is scaled down instead of overflowing.
 *
 * The papers are seeded into the local store (the suite runs against it), so
 * this does not depend on clicking through 92 questions in the UI.
 */
test.describe.configure({ mode: "serial" });
test.describe.configure({ timeout: 300_000 });

const PAPERS_FILE = path.join(process.cwd(), "local-data", "papers.json");
const DATA_DIR = path.join(process.cwd(), "data");
const MM_PT = 72 / 25.4;

const ID_2COL = "3e2e0000-0000-4000-8000-000000000001";
const ID_1COL = "3e2e0000-0000-4000-8000-000000000002";
const ID_SUGGESTION = "3e2e0000-0000-4000-8000-000000000003";
const ID_SUGGESTION_ON = "3e2e0000-0000-4000-8000-000000000004";
const ID_A5 = "3e2e0000-0000-4000-8000-000000000005";
/** One real CQ whose stem is `$\\ce{C4H10 + Cl2 -> C4H9Cl + HCl}$` (formula rendering). */
const ID_FORMULA = "3e2e0000-0000-4000-8000-000000000006";
/** Real chapter-৬ CQs with a choice (N < count) — instruction-line rules. */
const ID_INSTR_CHOICE = "3e2e0000-0000-4000-8000-000000000007";
/** Same questions with N = count — the "সবগুলো" wording. */
const ID_INSTR_ALL = "3e2e0000-0000-4000-8000-000000000008";

const SEEDED_IDS = [
  ID_2COL,
  ID_1COL,
  ID_SUGGESTION,
  ID_SUGGESTION_ON,
  ID_A5,
  ID_FORMULA,
  ID_INSTR_CHOICE,
  ID_INSTR_ALL,
];

type Margins = { top: number; right: number; bottom: number; left: number };

const CUSTOM_MARGINS: Margins = { top: 10, right: 14, bottom: 16, left: 9 };
const NORMAL_MARGINS: Margins = { top: 12, right: 12, bottom: 14, left: 12 };

type SeedSettings = Record<string, unknown>;

function bankQuestions(): { id: string; type: string; chapter: number }[] {
  const all: { id: string; type: string; chapter: number }[] = [];
  for (const file of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).sort()) {
    const items = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as {
      id: string;
      type: string;
      chapter: number;
    }[];
    all.push(...items);
  }
  return all;
}

type SeedQuestion = { id: string; type: string; chapter: number };

function writePaper(
  id: string,
  title: string,
  questions: SeedQuestion[],
  settings: SeedSettings,
): void {
  expect(questions.length).toBeGreaterThan(0);

  const store = JSON.parse(fs.readFileSync(PAPERS_FILE, "utf8")) as { papers: unknown[] };
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
      cqChoice: null,
      sqChoice: null,
      chapterLabel: "অধ্যায়: ৬, ৭",
      instructions: "সমস্ত প্রশ্নের উত্তর দিতে হবে; ডান পাশের নম্বর নির্দেশক।",
      cqInstruction: "যেকোনো ১টি প্রশ্নের উত্তর দাও",
      sqInstruction: "যেকোনো ১টি প্রশ্নের উত্তর দাও",
      showSource: true,
      ...settings,
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
  store.papers = store.papers.filter(
    (p) => (p as { id?: string }).id !== id,
  );
  store.papers.push(paper);
  fs.writeFileSync(PAPERS_FILE, JSON.stringify(store, null, 2));
}

function seedPaper(id: string, title: string, settings: SeedSettings): void {
  const questions = bankQuestions().filter(
    (q) => (q.chapter === 6 || q.chapter === 7) && (q.type === "CQ" || q.type === "SQ"),
  );
  expect(questions.length).toBeGreaterThan(50);
  writePaper(id, title, questions, settings);
}

test.beforeAll(() => {
  seedPaper(ID_2COL, "E2E — ২ কলাম A4 (কাস্টম মার্জিন)", {
    columns: "2",
    columnDivider: true,
    paperSize: "A4",
    marginPreset: "custom",
    margins: CUSTOM_MARGINS,
  });
  seedPaper(ID_1COL, "E2E — ১ কলাম A4 (সাধারণ মার্জিন)", {
    columns: "1",
    columnDivider: false,
    paperSize: "A4",
    marginPreset: "normal",
  });
  seedPaper(ID_SUGGESTION, "E2E — সাজেশন শীট (ডিফল্ট)", {
    columns: "1",
    mode: "suggestion",
    marginPreset: "normal",
  });
  seedPaper(ID_SUGGESTION_ON, "E2E — সাজেশন শীট (সব চালু)", {
    columns: "1",
    mode: "suggestion",
    marginPreset: "normal",
    suggestion: {
      showTime: true,
      showMarks: true,
      showInstructions: true,
      showChoice: true,
      showTotal: true,
    },
  });
  seedPaper(ID_A5, "E2E — A5, সংকীর্ণ মার্জিন, প্রশ্ন ভাগ হবে", {
    columns: "1",
    paperSize: "A5",
    marginPreset: "narrow",
    showPageNumbers: false,
    keepQuestionTogether: false,
    compactHeader: true,
    figureSize: "large",
  });

  // A single real chemistry CQ: stem `(i) $\\ce{C4H10 + Cl2 -> C4H9Cl + HCl}$`
  // — the mhchem formula that used to print stray italic X's.
  const formula = bankQuestions().find((q) => q.id === "chem-09-cq-001");
  expect(formula, "chem-09-cq-001 must exist in the real bank").toBeTruthy();
  writePaper(ID_FORMULA, "E2E — সূত্র (একটি CQ)", [formula!], {
    columns: "1",
    paperSize: "A4",
    marginPreset: "normal",
  });

  // Real chapter ৬ CQs only (one chapter → the choice line applies).
  const chapter6Cq = bankQuestions().filter((q) => q.chapter === 6 && q.type === "CQ").slice(0, 6);
  expect(chapter6Cq.length).toBe(6);
  writePaper(ID_INSTR_CHOICE, "E2E — নির্দেশনা (যেকোনো ৩টি)", chapter6Cq, {
    columns: "1",
    paperSize: "A4",
    marginPreset: "normal",
    cqChoice: 3,
    // Saved with a stale N (5) — must never reach the printed page.
    cqInstruction: "যেকোনো ৫টি প্রশ্নের উত্তর দাও",
  });
  writePaper(ID_INSTR_ALL, "E2E — নির্দেশনা (সবগুলো)", chapter6Cq, {
    columns: "1",
    paperSize: "A4",
    marginPreset: "normal",
    cqChoice: null,
    cqInstruction: "যেকোনো ১টি প্রশ্নের উত্তর দাও",
  });
});

test.afterAll(() => {
  // Leave the demo data as we found it (minus the papers this spec seeded).
  const ids = new Set(SEEDED_IDS);
  const store = JSON.parse(fs.readFileSync(PAPERS_FILE, "utf8")) as { papers: { id?: string }[] };
  store.papers = store.papers.filter((p) => !ids.has(p.id ?? ""));
  fs.writeFileSync(PAPERS_FILE, JSON.stringify(store, null, 2));
});

async function openPrint(page: Page, id: string, query = ""): Promise<void> {
  await page.goto(`/print/${id}${query}`);
  await page.waitForSelector('[data-paper-ready="1"]', { timeout: 60_000 });
}

/** Browser print: print media + the document's own @page rule. */
async function browserPrintPdf(page: Page, id: string): Promise<Buffer> {
  await openPrint(page, id);
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: "screen" });
  return Buffer.from(pdf);
}

async function serverPdf(page: Page, id: string): Promise<Buffer> {
  const res = await page.request.post("/api/pdf", { data: { paperId: id } });
  expect(res.status(), await res.text()).toBe(200);
  return Buffer.from(await res.body());
}

type PageReport = {
  page: number;
  widthPt: number;
  heightPt: number;
  minX: number;
  maxX: number;
  footer: string | null;
  /** Text printed in the top margin (the running header lives there). */
  header: string;
  /** Every text run of the page, in extraction order. */
  text: string;
  leftColumnItems: number;
  rightColumnItems: number;
  violations: string[];
};

async function analysePdf(pdf: Buffer, margins: Margins): Promise<PageReport[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf) }).promise;
  const leftPt = margins.left * MM_PT;
  const rightPt = margins.right * MM_PT;
  const topPt = margins.top * MM_PT;
  const bottomPt = margins.bottom * MM_PT;
  const tol = 2; // pt — glyph advance rounding
  const reports: PageReport[] = [];

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const dims = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const violations: string[] = [];
    let minX = Number.POSITIVE_INFINITY;
    let maxX = 0;
    const footerParts: { x: number; str: string }[] = [];
    const headerParts: { x: number; str: string }[] = [];
    const pageParts: string[] = [];
    let leftColumnItems = 0;
    let rightColumnItems = 0;

    for (const raw of content.items) {
      if (!("str" in raw)) continue;
      const item = raw as { str: string; transform: number[]; width?: number };
      if (!item.str.trim()) continue;
      const x = item.transform[4] ?? 0;
      const y = item.transform[5] ?? 0;
      const right = x + (item.width ?? 0);
      pageParts.push(item.str);

      // Footer page number lives inside the bottom margin by design. Chromium
      // may emit it as one text run or as several (digit, space, slash, …), so
      // collect the whole bottom band in reading order before matching.
      if (y < bottomPt - tol) {
        footerParts.push({ x, str: item.str });
        if (right > dims.width - rightPt + tol) {
          violations.push(`footer overflows: "${item.str}" right=${right.toFixed(1)}`);
        }
        continue;
      }

      // Text above the content box is margin-box content — the running header
      // (pages 2+). Collect it; it can never be body text, which stops at the
      // top margin.
      if (y > dims.height - topPt + tol) {
        headerParts.push({ x, str: item.str });
        continue;
      }

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, right);
      if (x < leftPt - tol) {
        violations.push(`left overflow: "${item.str.slice(0, 30)}" x=${x.toFixed(1)}`);
      }
      if (right > dims.width - rightPt + tol) {
        violations.push(
          `right overflow: "${item.str.slice(0, 30)}" right=${right.toFixed(1)} > ${(dims.width - rightPt).toFixed(1)}`,
        );
      }
      // The top/bottom margins were split off above (footer band and the
      // running-header band), so only sideways overflow can be a violation.

      const centre = dims.width / 2;
      if (x + (item.width ?? 0) < centre - 6) leftColumnItems += 1;
      else if (x > centre + 6) rightColumnItems += 1;
    }

    const footerText = footerParts
      .sort((a, b) => a.x - b.x)
      .map((part) => part.str)
      .join("")
      .replace(/\s+/g, " ")
      .trim();

    const headerText = headerParts
      .sort((a, b) => a.x - b.x)
      .map((part) => part.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    reports.push({
      page: n,
      widthPt: dims.width,
      heightPt: dims.height,
      minX: Number.isFinite(minX) ? minX : 0,
      maxX,
      footer: footerText || null,
      header: headerText,
      text: pageParts.join(" ").replace(/\s+/g, " ").trim(),
      leftColumnItems,
      rightColumnItems,
      violations,
    });
  }
  return reports;
}

function expectInsidePage(reports: PageReport[], label: string): void {
  const problems = reports.flatMap((r) =>
    r.violations.map((v) => `page ${r.page}: ${v}`),
  );
  expect(problems, `${label} — content left the printable area:\n${problems.slice(0, 8).join("\n")}`).toEqual([]);
  expect(reports.some((r) => r.maxX > 0), `${label} produced no text`).toBe(true);
}

test("2 columns + custom margins: browser print stays inside the page and uses both columns", async ({ page }) => {
  await openPrint(page, ID_2COL);
  await expect(page.locator(".paper-sheet")).toHaveAttribute("data-paper-columns", "2");
  const framePadding = await page.locator(".paper-frame").evaluate((el) => {
    const cs = getComputedStyle(el);
    return [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map((v) =>
      Number.parseFloat(v),
    );
  });
  // 10mm / 14mm / 16mm / 9mm at 96dpi, computed by the browser.
  const px = (mm: number) => (mm * 96) / 25.4;
  expect(framePadding[0]).toBeCloseTo(px(CUSTOM_MARGINS.top), 1);
  expect(framePadding[1]).toBeCloseTo(px(CUSTOM_MARGINS.right), 1);
  expect(framePadding[2]).toBeCloseTo(px(CUSTOM_MARGINS.bottom), 1);
  expect(framePadding[3]).toBeCloseTo(px(CUSTOM_MARGINS.left), 1);

  const pdf = await browserPrintPdf(page, ID_2COL);
  const reports = await analysePdf(pdf, CUSTOM_MARGINS);
  expectInsidePage(reports, "browser print (2 columns)");
  expect(reports.length).toBeGreaterThan(1);
  // Both columns carry text on at least one page.
  expect(reports.some((r) => r.leftColumnItems > 20 && r.rightColumnItems > 20)).toBe(true);
  // Every page prints a Bangla page number in the bottom margin.
  for (const report of reports) {
    expect(report.footer, `page ${report.page} has no page number`).toMatch(/^[০-৯]+\s*\/\s*[০-৯]+$/);
  }
});

test("1 column: same page box, single flow", async ({ page }) => {
  await openPrint(page, ID_1COL);
  await expect(page.locator(".paper-sheet")).toHaveAttribute("data-paper-columns", "1");
  const pdf = await browserPrintPdf(page, ID_1COL);
  const reports = await analysePdf(pdf, NORMAL_MARGINS);
  expectInsidePage(reports, "browser print (1 column)");
  expect(reports.length).toBeGreaterThan(1);
  // A single-column paper is longer than the same content in two columns.
  const twoCol = await analysePdf(await browserPrintPdf(page, ID_2COL), CUSTOM_MARGINS);
  expect(reports.length).toBeGreaterThan(twoCol.length);
});

test("server PDF matches browser print and stays inside the page (1 and 2 columns)", async ({ page }) => {
  for (const [id, margins, label] of [
    [ID_2COL, CUSTOM_MARGINS, "2 columns"],
    [ID_1COL, NORMAL_MARGINS, "1 column"],
  ] as const) {
    const browserPdf = await browserPrintPdf(page, id);
    const server = await serverPdf(page, id);

    const browserReports = await analysePdf(browserPdf, margins);
    const serverReports = await analysePdf(server, margins);

    expect(serverReports.length, `${label}: server PDF page count must equal browser print`).toBe(
      browserReports.length,
    );
    expectInsidePage(serverReports, `server PDF (${label})`);
    // Page size comes from the shared @page rule in both paths.
    expect(serverReports[0]!.widthPt).toBeCloseTo(browserReports[0]!.widthPt, 1);
    expect(serverReports[0]!.heightPt).toBeCloseTo(browserReports[0]!.heightPt, 1);
    // Same Bangla page numbers on both.
    expect(serverReports.map((r) => r.footer)).toEqual(browserReports.map((r) => r.footer));
  }
});

test("suggestion sheet hides exam furniture by default and can bring it back", async ({ page }) => {
  await openPrint(page, ID_SUGGESTION);
  const hidden = await page.locator(".paper-sheet").innerText();
  expect(hidden).not.toContain("সময়—");
  expect(hidden).not.toContain("পূর্ণমান—");
  expect(hidden).not.toContain("সমস্ত প্রশ্নের");
  expect(hidden).not.toContain("যেকোনো");
  expect(hidden).not.toContain("মোট নম্বর");
  expect(hidden).toContain("— সমাপ্ত —");

  await openPrint(page, ID_SUGGESTION_ON);
  const shown = await page.locator(".paper-sheet").innerText();
  expect(shown).toContain("সময়—");
  expect(shown).toContain("পূর্ণমান—");
  expect(shown).toContain("সমস্ত প্রশ্নের");
  // Every section answers all of its questions → the section line spells that
  // out instead of re-stating a choice the heading does not show.
  expect(shown).toContain("সবগুলো প্রশ্নের উত্তর দাও");
  expect(shown).toContain("মোট নম্বর");

  // The exam (non-suggestion) paper is unchanged.
  await openPrint(page, ID_2COL);
  const exam = await page.locator(".paper-sheet").innerText();
  expect(exam).toContain("সময়—");
  expect(exam).toContain("পূর্ণমান—");
});

test("page setup switches (A5, narrow margins, split questions, compact header) print as set", async ({ page }) => {
  await openPrint(page, ID_A5);
  const setup = await page.evaluate(() => {
    const sheet = document.querySelector(".paper-sheet") as HTMLElement;
    const question = document.querySelector(".paper-question") as HTMLElement;
    const part = document.querySelector(".paper-part-row") as HTMLElement;
    const figure = document.querySelector(".paper-figure") as HTMLElement | null;
    const headerLine = Array.from(document.querySelectorAll(".paper-header-line"))
      .map((el) => el.textContent ?? "")
      .find((text) => text.includes("শ্রেণি:"));
    return {
      pageRule: document.querySelector("style[data-paper-page-rule]")?.textContent ?? "",
      questionBreak: getComputedStyle(question).breakInside,
      partBreak: part ? getComputedStyle(part).breakInside : "missing",
      figureMaxHeight: figure ? getComputedStyle(figure).getPropertyValue("--figure-max-height").trim() : "none",
      headerLine,
      sheetClass: sheet.className,
    };
  });

  expect(setup.pageRule).toContain("size: 148mm 210mm");
  expect(setup.pageRule).toContain("margin: 8mm 8mm 10mm 8mm");
  expect(setup.pageRule).not.toContain("@bottom-center");
  expect(setup.sheetClass).toContain("split-allowed");
  expect(setup.sheetClass).toContain("figure-large");
  expect(setup.questionBreak).toBe("auto");
  expect(setup.partBreak).toBe("avoid");
  expect(setup.figureMaxHeight).toBe("75mm");
  // Compact header: class, subject and chapters on one line.
  expect(setup.headerLine).toContain("শ্রেণি:");
  expect(setup.headerLine).toContain("বিষয়:");
  expect(setup.headerLine).toContain("অধ্যায়");

  const pdf = await browserPrintPdf(page, ID_A5);
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf) }).promise;
  const first = (await doc.getPage(1)).getViewport({ scale: 1 });
  expect(first.width).toBeCloseTo((148 * 72) / 25.4, 0);
  expect(first.height).toBeCloseTo((210 * 72) / 25.4, 0);
});

test("an over-wide formula is scaled down to its column instead of overflowing", async ({ page }) => {
  await openPrint(page, ID_2COL);
  const hostWidth = await page.evaluate(() => {
    const host = document.querySelector(".paper-columns .question-text, .paper-columns-single .question-text");
    if (!host) throw new Error("no question text found");
    const span = document.createElement("span");
    span.id = "wide-formula";
    span.className = "katex";
    span.textContent = "O".repeat(400);
    host.appendChild(span);
    return host.getBoundingClientRect().width;
  });
  expect(hostWidth).toBeGreaterThan(100);

  // The resize handler re-fits formulas after layout changes.
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.waitForTimeout(400);

  const fitted = await page.evaluate(() => {
    const el = document.getElementById("wide-formula");
    if (!el) throw new Error("formula missing");
    const host = el.parentElement as HTMLElement;
    return {
      elRight: el.getBoundingClientRect().right,
      hostRight: host.getBoundingClientRect().right,
      transform: getComputedStyle(el).transform,
    };
  });
  expect(fitted.transform).not.toBe("none");
  expect(fitted.elRight).toBeLessThanOrEqual(fitted.hostRight + 1);
});

/** Normalise Bangla text runs so extracted PDF strings can be compared. */
function squash(text: string): string {
  return text.replace(/[\s\u0000]+/g, "");
}

test("the running header starts on page 2; page 1 keeps only the full header", async ({ page }) => {
  const runningHead = "পরীক্ষা উচ্চ বিদ্যালয় — বার্ষিক পরীক্ষা ২০২৬ — রসায়ন (সেট ক)";

  for (const [pdf, label] of [
    [await serverPdf(page, ID_1COL), "server PDF"],
    [await browserPrintPdf(page, ID_1COL), "browser print"],
  ] as const) {
    const reports = await analysePdf(pdf, NORMAL_MARGINS);
    expect(reports.length, `${label}: the bank paper needs a second page`).toBeGreaterThan(1);

    // Page 1: no running header anywhere — neither in the top margin nor in
    // the body text (the full header is the only institution block).
    expect(reports[0]!.header, `${label}: page 1 top margin must be empty`).toBe("");
    expect(
      squash(reports[0]!.text),
      `${label}: page 1 text must not contain the running-header string`,
    ).not.toContain(squash(runningHead));
    expect(squash(reports[0]!.text), `${label}: full header still prints`).toContain(
      squash("পরীক্ষা উচ্চ বিদ্যালয়"),
    );

    // Page 2 onwards: the compact header sits in the top margin.
    for (const report of reports.slice(1)) {
      const header = squash(report.header);
      expect(header, `${label}: page ${report.page} top margin`).toContain(
        squash("পরীক্ষা উচ্চ বিদ্যালয়"),
      );
      expect(header, `${label}: page ${report.page} top margin`).toContain(
        squash("রসায়ন (সেট ক)"),
      );
    }
  }
});

test("the server PDF renders a real mhchem formula exactly like the browser", async ({ page }) => {
  await openPrint(page, ID_FORMULA);

  const dom = await page.evaluate(() => {
    const sheet = document.querySelector(".paper-sheet") as HTMLElement | null;
    const katex = document.querySelector(".question-text .katex") as HTMLElement | null;
    const spacer = document.querySelector(
      '.question-text .katex [style*="transparent"]',
    ) as HTMLElement | null;
    if (!sheet || !katex) throw new Error("formula not rendered");
    const s = sheet.getBoundingClientRect();
    const k = katex.getBoundingClientRect();
    const pad = 12;
    return {
      sheet: { left: s.left, top: s.top },
      region: {
        x: k.left - pad,
        y: k.top - pad,
        width: k.width + 2 * pad,
        height: k.height + 2 * pad,
      },
      mathml: document.querySelectorAll(".katex-mathml").length,
      katexFontLoaded: document.fonts.check("1em KaTeX_Main"),
      spacerColor: spacer ? getComputedStyle(spacer).color : null,
      stem: (document.querySelector(".question-text") as HTMLElement).innerText,
    };
  });

  // KaTeX is HTML-only, laid out with the locally bundled webfonts, and its
  // invisible spacing glyphs are still invisible…
  expect(dom.stem).toContain("(i)");
  expect(dom.mathml, "no MathML layer may be rendered for print/PDF").toBe(0);
  expect(dom.katexFontLoaded, "KaTeX webfonts must load before readiness").toBe(true);
  expect(dom.spacerColor, "screen: mhchem spacer stays transparent").toBe("rgba(0, 0, 0, 0)");

  // …including under the paper's black-on-white print rule, which used to
  // force them to rgb(0,0,0) and print stray italic X's over the subscripts.
  await page.emulateMedia({ media: "print" });
  const printSpacerColor = await page.evaluate(() => {
    const spacer = document.querySelector(
      '.question-text .katex [style*="transparent"]',
    ) as HTMLElement | null;
    return spacer ? getComputedStyle(spacer).color : null;
  });
  expect(printSpacerColor, "print: mhchem spacer must stay transparent").toBe(
    "rgba(0, 0, 0, 0)",
  );
  await page.emulateMedia({ media: "screen" });

  // Ground truth: the browser's own rendering of the formula line.
  const shot = await page.screenshot({ clip: dom.region });
  const reference = await loadImage(shot);
  const refCanvas = createCanvas(reference.width, reference.height);
  const refCtx = refCanvas.getContext("2d");
  refCtx.drawImage(reference, 0, 0);
  const screenScale = reference.width / dom.region.width;

  const server = await serverPdf(page, ID_FORMULA);
  const browser = await browserPrintPdf(page, ID_FORMULA);

  const spacerInServer = spacerBoxes(await pdfTextItems(server, 1));
  expect(
    spacerInServer.length,
    "the formula must contain mhchem's invisible spacer glyphs",
  ).toBeGreaterThanOrEqual(3);

  // 1) Both print paths must agree pixel for pixel across the formula line.
  const line = unionBox(spacerInServer, 5);
  expect(line).not.toBeNull();
  const serverRaster = await rasterizePdfPage(server, 1, 2);
  const browserRaster = await rasterizePdfPage(browser, 1, 2);
  const pathDiff = differingRatio(serverRaster, browserRaster, line!);
  expect(
    pathDiff,
    `server PDF vs browser print differ on ${((pathDiff || 0) * 100).toFixed(2)}% of the formula line`,
  ).toBeLessThan(0.02);

  // 2) The server PDF must carry the same ink as the browser. Invisible
  //    spacers have no ink; visible ones double it inside these boxes.
  const marginTop = NORMAL_MARGINS.top * MM_PT;
  const marginLeft = NORMAL_MARGINS.left * MM_PT;
  const contentTopPt = serverRaster.heightPt - marginTop;
  const PT_TO_CSS = 96 / 72;
  const padPt = 0.75;
  const heightPt = 7.5;
  const ratios: number[] = [];
  for (const box of spacerInServer) {
    const pdfInk = inkFractionInBox(serverRaster, box, { padPt, heightPt });
    const cssLeft =
      dom.sheet.left + (box.x + padPt - marginLeft) * PT_TO_CSS;
    const cssTop =
      dom.sheet.top + (contentTopPt - (box.y + heightPt) + padPt) * PT_TO_CSS;
    const sx = Math.round((cssLeft - dom.region.x) * screenScale);
    const sy = Math.round((cssTop - dom.region.y) * screenScale);
    const sw = Math.max(1, Math.round((box.width - 2 * padPt) * PT_TO_CSS * screenScale));
    const sh = Math.max(1, Math.round((heightPt - 2 * padPt) * PT_TO_CSS * screenScale));
    const browserInk = inkFraction(refCtx, sx, sy, sw, sh);
    if (browserInk < 0.02) continue;
    ratios.push(pdfInk / browserInk);
  }
  expect(ratios.length, "spacers must be measurable in the browser screenshot").toBeGreaterThan(0);
  const meanRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  expect(
    meanRatio,
    `ink ratio server PDF / browser = ${meanRatio.toFixed(2)} (${ratios.map((r) => r.toFixed(2)).join(", ")})`,
  ).toBeLessThan(1.3);
});

test("section instructions share the heading's N, and the default steps aside for a choice", async ({ page }) => {
  // N = 3 of 6 questions: the heading carries the choice…
  await openPrint(page, ID_INSTR_CHOICE);
  const choice = await page.locator(".paper-sheet").innerText();
  expect(choice).toContain("যেকোনো ৩টি × ১০ = ৩০");
  // …so the duplicate instruction line goes away, and the stale saved N (৫)
  // never reaches the paper.
  expect(choice).not.toContain("প্রশ্নের উত্তর দাও");
  expect(choice).not.toContain("যেকোনো ৫টি");
  // The untouched default general instruction must not claim every question
  // has to be answered while a section offers a choice.
  expect(choice).toContain("ডান পাশের সংখ্যা পূর্ণমান নির্দেশক।");
  expect(choice).not.toContain("সমস্ত প্রশ্নের উত্তর দিতে হবে");

  // N equals the section length: say "answer all of them".
  await openPrint(page, ID_INSTR_ALL);
  const all = await page.locator(".paper-sheet").innerText();
  expect(all).toContain("সবগুলো প্রশ্নের উত্তর দাও");
  // The saved stock line ("যেকোনো ১টি…") is turned into "Answer all"
  // (N == count), so it never reaches the paper as a separate line.
  // No choice anywhere → the default general instruction stays as saved.
  // No choice anywhere → the default general instruction stays as saved.
  expect(all).toContain("সমস্ত প্রশ্নের উত্তর দিতে হবে");
  expect(all).not.toContain("ডান পাশের সংখ্যা পূর্ণমান নির্দেশক।");
});
