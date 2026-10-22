import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/** Visual checkpoints for the redesign, captured at the requested 1440×900. */
test.use({ viewport: { width: 1440, height: 900 } });
test.describe.configure({ mode: "serial" });

const OUT = path.join(process.cwd(), "screenshots");

async function shot(page: Page, name: string) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, name) });
}

test("save the five workspace screenshots", async ({ page }) => {
  await page.goto("/admin/bank");
  await page.evaluate(() => {
    window.localStorage.removeItem("qbhub.selection.v2");
    window.localStorage.removeItem("qbhub.selection.v1");
  });
  await page.goto("/admin/bank");
  await expect(page.locator("[data-question-id]").first()).toBeVisible();

  // 1. the workspace: filters, full cards, sticky bar
  await shot(page, "workspace.png");

  // 2. a CQ with a figure (full card view)
  await page.getByTestId("chapter-9").click();
  await page.getByTestId("type-CQ").click();
  const figureCard = page.locator('[data-question-id="chem-09-cq-001"]');
  await expect(figureCard).toBeVisible();
  // Scroll into view and ensure open mode for figure visibility
  await figureCard.scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "খোলা", exact: true }).click();
  const figure = figureCard.locator("img");
  await expect(figure).toBeVisible();
  await expect
    .poll(async () => figure.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  await shot(page, "workspace-cq-figure.png");

  // 3. selected cards with drawer open
  await figureCard.click();
  await page.getByTestId("chapter-9").click();
  await page.getByTestId("chapter-6").click();

  const cqCards = page.locator('[data-question-id^="chem-06-cq"]');
  await cqCards.nth(0).click();
  await cqCards.nth(1).click();

  await page.getByTestId("type-CQ").click();
  await page.getByTestId("type-SQ").click();
  await expect(page.locator('[data-question-id^="chem-06-sq"]').first()).toBeVisible();
  const sqCards = page.locator('[data-question-id^="chem-06-sq"]');
  for (let i = 0; i < 5; i += 1) await sqCards.nth(i).click();

  // Open the drawer
  await page.getByRole("button", { name: "তালিকা" }).click();
  await expect(page.getByText("আমার পেপার")).toBeVisible();
  await shot(page, "paper-drawer.png");

  // Close drawer before changing view mode
  await page.keyboard.press("Escape");

  // 4. compact mode
  await page.getByRole("button", { name: "সংক্ষিপ্ত", exact: true }).click();
  await shot(page, "workspace-compact.png");

  // 5. the builder: stepper + settings + live preview
  await page.getByRole("button", { name: "তালিকা" }).click();
  await expect(page.getByText("আমার পেপার")).toBeVisible();
  await page.getByRole("link", { name: "প্রিভিউ" }).nth(1).click();
  await page.waitForURL(/\/admin\/papers\/new\?step=2/);
  await page.locator("#title").fill("নমুনা রসায়ন পেপার");
  await expect(page.locator(".print-root .paper-sheet")).toBeVisible();
  // Wait for the builder's question index so the preview is populated.
  await expect(page.locator(".print-root .paper-sheet").getByText("০১।", { exact: true }).first()).toBeVisible();
  await shot(page, "builder.png");
});
