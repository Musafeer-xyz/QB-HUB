import { expect, test, type Page } from "@playwright/test";

/**
 * Regression tests for three workflow bugs:
 *  1. “নতুন পেপার” must start a blank paper instead of inheriting the draft.
 *  2. “সব নির্বাচন” and “নির্বাচন মুছুন (N)” are independent controls.
 *  3. The papers list supports ticking rows and bulk deleting them.
 */

async function freshBank(page: Page) {
  await page.goto("/admin/bank");
  await page.evaluate(() => {
    window.localStorage.removeItem("qbhub.selection.v2");
    window.localStorage.removeItem("qbhub.selection.v1");
  });
  await page.reload();
  await expect(page.locator("[data-question-id]").first()).toBeVisible();
}

test("নতুন পেপার starts with an empty paper, not the previous draft", async ({ page }) => {
  test.setTimeout(240_000);
  await freshBank(page);

  // Put one question in the sticky tray so there is a draft to inherit.
  const card = page.locator("[data-question-id]").first();
  const id = await card.getAttribute("data-question-id");
  await card.click();
  await expect(page.locator(`[data-question-id="${id}"][data-selected="true"]`)).toBeVisible();

  // “নতুন পেপার” from the papers page must wipe that draft.
  await page.goto("/admin/papers");
  await page.getByRole("link", { name: "নতুন পেপার" }).first().click();
  await page.waitForURL(/\/admin\/papers\/new/);

  await expect(page.locator("[data-question-id]").first()).toBeVisible();
  await expect(page.locator('[data-question-id][data-selected="true"]')).toHaveCount(0);
  const stored = await page.evaluate(() => window.localStorage.getItem("qbhub.selection.v2"));
  expect(stored ? (JSON.parse(stored) as { entries: unknown[] }).entries.length : 0).toBe(0);

  // Title/settings are the defaults again, and the preview is blank.
  await page.getByRole("button", { name: /২ পেপার সাজানো/ }).click();
  await expect(page.locator("#title")).toHaveValue("রসায়ন প্রথম পত্র — মডেল টেস্ট");
  await expect(page.locator("#institute")).toHaveValue("আদর্শ উচ্চ বিদ্যালয়");
  await expect(page.locator(".paper-sheet")).toBeVisible();
  await expect(page.locator(".paper-sheet .paper-question")).toHaveCount(0);
});

test("সব নির্বাচন selects all filtered results and নির্বাচন মুছুন clears them", async ({ page }) => {
  test.setTimeout(240_000);
  await freshBank(page);
  await page.getByTestId("chapter-6").click();
  await expect(page.locator("[data-question-id]").first()).toBeVisible();

  const selectAll = page.getByRole("button", { name: "সব নির্বাচন" });
  await expect(selectAll).toBeVisible();
  await expect(page.getByRole("button", { name: /নির্বাচন মুছুন/ })).toHaveCount(0);

  // Selecting all keeps the existing confirmation and really adds questions.
  await selectAll.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("সব প্রশ্ন নির্বাচন করবেন?");
  await dialog.getByRole("button", { name: "নির্বাচন করুন" }).click();
  await expect(page.locator('[data-question-id][data-selected="true"]').first()).toBeVisible();
  await expect(page.getByRole("button", { name: "সব নির্বাচন" })).toBeVisible();

  // The clear control appears only with a selection, and it empties it.
  const clear = page.getByRole("button", { name: /নির্বাচন মুছুন/ });
  await expect(clear).toBeVisible();
  await clear.click();
  await expect(page.locator('[data-question-id][data-selected="true"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /নির্বাচন মুছুন/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "সব নির্বাচন" })).toBeVisible();
});

test("papers list bulk delete removes only the ticked papers", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/admin/papers");
  const rows = page.locator("tbody tr[data-paper-id]");
  await expect(rows.first()).toBeVisible();

  const before = await rows.evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-paper-id")!),
  );

  // Duplicate the first paper twice: two rows we are allowed to delete.
  await page.getByRole("button", { name: "কপি" }).first().click();
  await expect(rows).toHaveCount(before.length + 1);
  await page.getByRole("button", { name: "কপি" }).first().click();
  await expect(rows).toHaveCount(before.length + 2);

  const after = await rows.evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-paper-id")!),
  );
  const created = after.filter((id) => !before.includes(id));
  expect(created).toHaveLength(2);

  for (const id of created) {
    await page.locator(`tbody tr[data-paper-id="${id}"] input[type="checkbox"]`).check();
  }
  await expect(page.getByText("২ টি নির্বাচিত")).toBeVisible();

  await page.getByRole("status").getByRole("button", { name: "মুছুন" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("২ টি পেপার মুছবেন?");
  await expect(dialog).toContainText("শুধু পেপার মুছবে, প্রশ্ন নয়।");
  await dialog.getByRole("button", { name: "মুছুন" }).click();

  for (const id of created) {
    await expect(page.locator(`tbody tr[data-paper-id="${id}"]`)).toHaveCount(0);
  }
  await expect(rows).toHaveCount(before.length);
});
