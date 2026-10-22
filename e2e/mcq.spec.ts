import { expect, test, type Page } from "@playwright/test";

/**
 * MCQ support, end to end on the real fixtures (`Chemistry/mcq/*.json`, 192
 * items): the bank shows a 2×2 option grid with an admin-only answer marker,
 * three MCQs can be selected into a paper, the preview prints four options per
 * question, and the saved paper's print DOM contains no answer marker at all.
 */
test.describe.configure({ timeout: 240_000 });

const PICKED = ["chem-06-mcq-001", "chem-06-mcq-002", "chem-06-mcq-003"];

async function selectFromBank(page: Page, id: string): Promise<void> {
  await page.locator("#bank-search").fill(id);
  const card = page.locator(`[data-question-id="${id}"]`);
  await expect(card).toBeVisible();
  await card.click();
  await expect(card).toHaveAttribute("data-selected", "true");
}

test("bank shows MCQ options and a paper prints them without the answer", async ({ page }) => {
  await page.goto("/admin/bank");

  // The MCQ segment exists only because the fixtures are loaded from
  // Chemistry/mcq, and the rail counts them per chapter.
  const mcqSegment = page.getByRole("button", { name: /^বহুনির্বাচনী/ });
  await expect(mcqSegment).toBeVisible();
  await mcqSegment.click();

  // Admin-only answer marker: chem-06-mcq-001's printed answer is (গ) 1.25 M.
  await page.locator("#bank-search").fill(PICKED[0] as string);
  const first = page.locator(`[data-question-id="${PICKED[0]}"]`);
  await expect(first).toBeVisible();
  await expect(first.locator("[data-option-label]")).toHaveCount(4);
  const marker = first.getByTestId("mcq-answer-marker");
  await expect(marker).toHaveCount(1);
  await expect(first.locator('[data-correct="true"]')).toContainText("1.25 M");
  await expect(marker).toHaveText("উত্তর");

  // Select three MCQs.
  for (const id of PICKED) await selectFromBank(page, id);
  await page.locator("#bank-search").fill("");
  await expect(page.locator('[data-selected="true"]')).toHaveCount(3);

  // Build: the live preview is the identical print component.
  await page.goto("/admin/papers/new?step=3");
  const sheet = page.locator(".paper-sheet");
  await expect(sheet.locator(".paper-question-mcq")).toHaveCount(3, { timeout: 60_000 });
  await expect(sheet.locator(".paper-mcq-option")).toHaveCount(12);
  for (const question of await sheet.locator(".paper-question-mcq").all()) {
    await expect(question.locator(".paper-mcq-option")).toHaveCount(4);
  }

  // MCQ section: heading with the "N × ১ = N" total.
  await expect(sheet.getByText(/বহুনির্বাচনী প্রশ্ন/).first()).toBeVisible();
  await expect(sheet.getByText(/৩ × ১ = ৩/)).toBeVisible();

  // No answer key in the printed document.
  await expect(sheet.locator('[data-testid="mcq-answer-marker"]')).toHaveCount(0);
  await expect(sheet.locator("[data-correct]")).toHaveCount(0);
  await expect(sheet).not.toContainText("উত্তর:");

  // Save, then check the real print route renders the same MCQs.
  await page.getByRole("button", { name: "সংরক্ষণ", exact: true }).click();
  await page.waitForURL(/\/admin\/papers\/[0-9a-f-]{36}\/edit/, { timeout: 60_000 });
  const id = new URL(page.url()).pathname.split("/")[3] as string;

  await page.goto(`/print/${id}`);
  const printed = page.locator(".paper-sheet");
  await expect(printed.locator(".paper-question-mcq")).toHaveCount(3, { timeout: 60_000 });
  await expect(printed.locator(".paper-mcq-option")).toHaveCount(12);
  await expect(printed.locator('[data-testid="mcq-answer-marker"]')).toHaveCount(0);
  await expect(printed.locator("[data-correct]")).toHaveCount(0);
  await expect(printed).not.toContainText("উত্তর:");
});
