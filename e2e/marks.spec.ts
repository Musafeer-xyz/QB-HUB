import { expect, test, type Page } from "@playwright/test";

/**
 * The printed paper carries no per-question marks label beside SQ or MCQ
 * questions (the section heading has "N × marks = total"), while CQ part marks
 * stay and the correct MCQ option never appears.
 */
test.describe.configure({ timeout: 240_000 });

const PICKED = ["chem-06-sq-001", "chem-06-mcq-001", "chem-06-cq-001"];

async function selectFromBank(page: Page, id: string) {
  await page.locator("#bank-search").fill(id);
  const card = page.locator(`[data-question-id="${id}"]`);
  await expect(card).toBeVisible();
  if ((await card.getAttribute("data-selected")) !== "true") await card.click();
  await expect(card).toHaveAttribute("data-selected", "true");
}

test("SQ and MCQ print without a marks label; CQ keeps its part marks", async ({ page }) => {
  await page.goto("/admin/bank");
  await page.evaluate(() => {
    window.localStorage.removeItem("qbhub.selection.v2");
    window.localStorage.removeItem("qbhub.selection.v1");
  });
  await page.reload();
  await expect(page.locator("[data-question-id]").first()).toBeVisible();

  // Each card is asserted individually (the list is virtualized, so the three
  // selected cards are not all mounted at once).
  for (const id of PICKED) await selectFromBank(page, id);
  await page.locator("#bank-search").fill("");
  await expect(page.getByText("৩ নির্বাচিত", { exact: false })).toBeVisible();

  // The live preview is the same component as /print and the server PDF.
  await page.goto("/admin/papers/new?step=3");
  const sheet = page.locator(".paper-sheet");
  await expect(sheet.locator(".paper-question-sq")).toHaveCount(1, { timeout: 60_000 });
  await expect(sheet.locator(".paper-question-mcq")).toHaveCount(1);
  await expect(sheet.locator(".paper-question-cq")).toHaveCount(1);

  // Section heading totals stay.
  await expect(sheet.getByText(/সংক্ষিপ্ত প্রশ্ন \(SQ\): যেকোনো ১টি × ২ = ২/)).toBeVisible();
  await expect(sheet.getByText(/বহুনির্বাচনী প্রশ্ন \(MCQ\): ১ × ১ = ১/)).toBeVisible();

  // No "[২]" / "[১]" marks label beside the SQ or the MCQ question.
  await expect(sheet.locator(".paper-question-sq .paper-marks")).toHaveCount(0);
  await expect(sheet.locator(".paper-question-mcq .paper-marks")).toHaveCount(0);
  await expect(sheet.locator(".paper-question-sq")).not.toContainText(/\[[০-৯]+\]/);
  await expect(sheet.locator(".paper-question-mcq")).not.toContainText(/\[[০-৯]+\]/);

  // SQ text takes the full line width (no marks gutter).
  const width = await sheet.locator(".paper-question-sq").evaluate((el) => {
    const article = el.getBoundingClientRect().width;
    const content = el.querySelector("div.min-w-0")?.getBoundingClientRect().width ?? 0;
    return { article, content };
  });
  expect(width.content / width.article).toBeGreaterThan(0.75);

  // CQ part marks remain, and the MCQ still prints its four options only.
  await expect(sheet.locator(".paper-question-cq .paper-marks")).toHaveCount(4);
  await expect(sheet.locator(".paper-question-cq .paper-marks").first()).toHaveText("[১]");
  await expect(sheet.locator(".paper-question-mcq .paper-mcq-option")).toHaveCount(4);
  await expect(sheet.locator('[data-testid="mcq-answer-marker"]')).toHaveCount(0);
  await expect(sheet.locator("[data-correct]")).toHaveCount(0);

  await page.evaluate(() => {
    window.localStorage.removeItem("qbhub.selection.v2");
  });
});
