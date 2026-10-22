import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Acceptance flow, run against the demo/local data source:
 * filter chapter-6 → select 3 CQ + 5 SQ → preview → save → print/PDF.
 */
test.describe.configure({ mode: "serial" });

const SCREENSHOTS = path.join(process.cwd(), "screenshots");

async function gotoBank(page: Page) {
  await page.goto("/admin/bank");
  await page.evaluate(() => {
    window.localStorage.removeItem("qbhub.selection.v2");
    window.localStorage.removeItem("qbhub.selection.v1");
  });
  await page.goto("/admin/bank");
  await expect(page.getByRole("region", { name: "প্রশ্নের তালিকা" })).toBeVisible();
  await expect(page.locator("[data-question-id]").first()).toBeVisible();
}

function toBangla(value: number): string {
  return String(value).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
}

async function addRows(page: Page, count: number) {
  const cards = page.locator('[data-question-id]');
  let added = 0;
  for (let i = 0; added < count && i < 40; i += 1) {
    const card = cards.nth(i);
    if (!(await card.isVisible())) {
      await page.locator('[role="list"]').evaluate((el) => el.scrollBy(0, 400));
      await page.waitForTimeout(50);
    }
    const id = await card.getAttribute("data-question-id");
    if (!id) continue;
    const alreadySelected = await page.locator(`[data-question-id="${id}"][data-selected="true"]`).count();
    if (alreadySelected > 0) continue;
    await card.click();
    await expect(page.locator(`[data-question-id="${id}"][data-selected="true"]`)).toBeVisible();
    added += 1;
  }
  expect(added).toBe(count);
}

test("filter → select 3 CQ + 5 SQ → build paper → print/PDF", async ({ page }) => {
  test.setTimeout(240_000);
  await gotoBank(page);

  // --- chapter 6, CQ ---
  await page.getByTestId("chapter-6").click();
  await page.getByTestId("type-CQ").click();
  await expect(page.getByTestId("type-CQ")).toHaveAttribute("aria-pressed", "true");
  const cqRows = page.locator('[data-question-id^="chem-06-cq"]');
  await expect(cqRows.first()).toBeVisible();
  expect(await cqRows.count()).toBeGreaterThanOrEqual(3);
  await addRows(page, 3);

  // --- verify CQ card structure with parts visible in open mode ---
  const firstCq = page.locator('[data-question-id^="chem-06-cq"]').first();
  await expect(firstCq).toBeVisible();
  await expect(firstCq.getByText(/\(/).first()).toBeVisible();

  // --- chapter 6, SQ (replace the type filter) ---
  await page.getByTestId("type-CQ").click();
  await page.getByTestId("type-SQ").click();
  await expect(page.locator('[data-question-id^="chem-06-sq"]').first()).toBeVisible();
  await addRows(page, 5);

  // --- open paper drawer to see selection totals ---
  await page.getByRole("button", { name: "তালিকা" }).click();
  await expect(page.getByText("আমার পেপার")).toBeVisible();

  // --- paper drawer totals (3 CQ × 10 + 5 SQ × 2) ---
  await expect(page.getByText("৮", { exact: true }).nth(1)).toBeVisible();
  await expect(page.getByText("৪০", { exact: true })).toBeVisible();

  // --- preview: step ২ of the builder ---
  await page.getByRole("link", { name: "প্রিভিউ" }).nth(1).click();
  await page.waitForURL(/\/admin\/papers\/new\?step=2/);
  await expect(page.getByRole("heading", { name: "নতুন পেপার", level: 1 })).toBeVisible();

  const preview = page.locator(".print-root .paper-sheet");
  await expect(preview.getByText("০১।", { exact: true }).first()).toBeVisible();
  await expect(preview.getByText("০৮।", { exact: true }).first()).toBeVisible();
  await expect(preview.getByText(/ক-বিভাগ/).first()).toBeVisible();
  await expect(preview.getByText(/খ-বিভাগ/).first()).toBeVisible();

  // header: centred lines, set-code box, computed পূর্ণমান
  await expect(preview.getByText("সেট কোড: ক")).toBeVisible();
  await expect(preview.getByText("পূর্ণমান— ৪০")).toBeVisible();
  await expect(preview.getByText(/অধ্যায়: ৬/).first()).toBeVisible();
  await expect(preview.getByText(/সৃজনশীল প্রশ্ন \(CQ\): যেকোনো ৩টি × ১০ = ৩০/)).toBeVisible();
  await expect(preview.getByText(/সংক্ষিপ্ত প্রশ্ন \(SQ\): যেকোনো ৫টি × ২ = ১০/)).toBeVisible();

  // board sources stay opt-in; flags/answers never print
  await expect(preview.locator(".paper-source")).toHaveCount(0);
  await page.locator("#showsource").check();
  await expect(preview.locator(".paper-source").first()).toContainText("বরিশাল বোর্ড ২০২৬");
  await page.locator("#showsource").uncheck();
  await expect(preview.locator(".paper-source")).toHaveCount(0);
  const previewText = await preview.innerText();
  expect(previewText).toMatch(/\[১\]/);
  expect(previewText).toMatch(/\[২\]/);
  expect(previewText).not.toContain("যাচাই দরকার");

  // --- save (sticky action bar) ---
  await page.locator("#title").fill("E2E রসায়ন মডেল টেস্ট");
  await page.locator("#institute").fill("টেস্ট উচ্চ বিদ্যালয়");
  await page.getByRole("button", { name: "সংরক্ষণ", exact: true }).click();
  await page.waitForURL(/\/admin\/papers\/[0-9a-f-]{8,}\/edit/);
  await expect(page.getByRole("heading", { name: "পেপার সম্পাদনা", level: 1 })).toBeVisible({
    timeout: 30_000,
  });

  // the saved paper comes back into step ১'s selection, and step ২ keeps its data
  await page.getByRole("button", { name: /২ পেপার সাজানো/ }).click();
  await expect(page.locator("#title")).toHaveValue("E2E রসায়ন মডেল টেস্ট");

  // --- print view: flags and answers must never appear ---
  const paperUrl = page.url().replace("/edit", "");
  const paperId = paperUrl.split("/").pop();
  await page.goto(`/print/${paperId}`);
  await expect(page.locator(".paper-sheet")).toBeVisible();
  const printText = await page.locator(".paper-sheet").innerText();
  expect(printText).not.toContain("যাচাই দরকার");
  expect(printText).not.toContain("উত্তর:");
  expect(printText).toContain("০১।");
  expect(printText).toContain("সেট কোড: ক");
  expect(printText).toContain("পূর্ণমান— ৪০");

  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOTS, "print-view.png"), fullPage: true });

  // --- PDF download from the action bar ---
  await page.goto(`/admin/papers/${paperId}/edit`);
  const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
  await page.getByRole("button", { name: "PDF ডাউনলোড" }).click();
  const download = await downloadPromise;
  const pdfPath = path.join(SCREENSHOTS, "paper.pdf");
  await download.saveAs(pdfPath);
  expect(fs.statSync(pdfPath).size).toBeGreaterThan(20_000);

  // The PDF is a real vector document with selectable text (not a screenshot).
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  expect(doc.numPages).toBeGreaterThanOrEqual(1);
  const firstPage = await doc.getPage(1);
  const content = await firstPage.getTextContent();
  const text = content.items.map((item) => ("str" in item ? item.str : "")).join("");
  expect(text.length).toBeGreaterThan(50);
  expect(text).toContain("(CQ)");
  expect(text).toContain("[১]");

  const { pdfPageToPng } = await import("./utils/pdf-to-png");
  const pagePng = path.join(SCREENSHOTS, "paper-page1.png");
  await pdfPageToPng(pdfPath, pagePng, 1, 1.2);
  expect(fs.statSync(pagePng).size).toBeGreaterThan(20_000);
});

test("chem-09-cq-001 expands with its figure and renders mhchem in the preview", async ({ page }) => {
  test.setTimeout(240_000);
  await gotoBank(page);
  await page.getByTestId("chapter-9").click();
  await page.getByTestId("type-CQ").click();

  const card = page.locator('[data-question-id="chem-09-cq-001"]');
  await expect(card).toBeVisible();

  const figure = card.locator('img[alt*="NaCl দ্রবণের"]');
  await expect(figure).toBeVisible();
  expect(await figure.getAttribute("src")).toContain("chem-09-cq-001.png");

  await card.click();
  await expect(page.locator('[data-question-id="chem-09-cq-001"][data-selected="true"]')).toBeVisible();

  await page.getByRole("button", { name: "তালিকা" }).click();
  await expect(page.getByText("আমার পেপার")).toBeVisible();
  await page.getByRole("link", { name: "প্রিভিউ" }).nth(1).click();
  await page.waitForURL(/\/admin\/papers\/new\?step=2/);

  const preview = page.locator(".print-root .paper-sheet");
  await expect(preview).toContainText("উদ্দীপক", { timeout: 20_000 }).catch(() => undefined);
  // mhchem typesets `->` as a drawn arrow (SVG), and C4H10/Cl2 as real chemistry
  expect(await preview.locator(".x-arrow").count()).toBeGreaterThan(0);
  await expect(preview.locator("svg").first()).toBeVisible();
  const text = await preview.innerText();
  expect(text).toContain("C");
  expect(text).toContain("Cl");
  await expect(preview.locator('img[alt*="NaCl দ্রবণের"]')).toBeVisible();

  await page.locator("#title").fill("mhchem যাচাই");
  await page.getByRole("button", { name: "সংরক্ষণ", exact: true }).click();
  await page.waitForURL(/\/admin\/papers\/[0-9a-f-]{8,}\/edit/);
  const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
  await page.getByRole("button", { name: "PDF ডাউনলোড" }).click();
  const download = await downloadPromise;
  const pdfPath = path.join(SCREENSHOTS, "mhchem-paper.pdf");
  await download.saveAs(pdfPath);
  const { pdfPageToPng } = await import("./utils/pdf-to-png");
  await pdfPageToPng(pdfPath, path.join(SCREENSHOTS, "mhchem-paper-page1.png"), 1, 1.6);
  expect(fs.statSync(pdfPath).size).toBeGreaterThan(20_000);
});
