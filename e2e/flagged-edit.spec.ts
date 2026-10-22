import { expect, test, type Page } from "@playwright/test";

/**
 * The dashboard's "যাচাই দরকার" card opens the bank with the flagged filter on,
 * the filter is mirrored in the URL, and an MCQ can be created, edited
 * (correct option changed) and deleted from the workspace.
 *
 * Everything this spec creates is deleted again. The app records a delete as
 * a tombstone id in `local-data/questions.json`; fixed ids keep that list from
 * growing on every run (no question record remains).
 */
test.describe.configure({ timeout: 240_000 });

const MCQ_ID = "chem-06-mcq-901";
const SQ_ID = "chem-06-sq-901";

async function searchFor(page: Page, id: string) {
  await page.locator("#bank-search").fill(id);
  return page.locator(`[data-question-id="${id}"]`);
}

test("flagged dashboard card filters the bank; an MCQ edits and saves", async ({ page }) => {
  await page.goto("/admin/bank");
  await page.evaluate(() => {
    window.localStorage.removeItem("qbhub.selection.v2");
    window.localStorage.removeItem("qbhub.selection.v1");
  });

  // --- 1. Dashboard card → bank with only the flagged questions -----------
  await page.goto("/admin");
  await page.getByRole("link", { name: /যাচাই দরকার/ }).first().click();
  await expect(page).toHaveURL(/\/admin\/bank\?.*flagged=1/);

  const flagged = page.getByRole("checkbox", { name: /যাচাই দরকার/ });
  await expect(flagged).toBeChecked();
  await expect(page.locator("footer")).toContainText("২২টি প্রশ্ন দেখানো হচ্ছে");
  await expect(page.locator("[data-question-id] .tag-flag").first()).toBeVisible();

  // --- 2. Turning the filter off shows the whole bank ---------------------
  await flagged.uncheck();
  await expect(page).not.toHaveURL(/flagged=1/);
  await expect(flagged).not.toBeChecked();
  await expect(page.locator("footer")).not.toContainText("২২টি প্রশ্ন দেখানো হচ্ছে");
  await expect(page.locator("footer")).toContainText("প্রশ্ন দেখানো হচ্ছে");

  // --- 3. Create an MCQ (four options + correct option) -------------------
  const id = MCQ_ID;
  await page.goto("/admin/questions/new");
  await expect(page.getByRole("heading", { name: "নতুন প্রশ্ন" })).toBeVisible();
  await page.locator("#qid").fill(id);
  await page.locator("#chapter").fill("6");
  await page.locator("#type").selectOption("MCQ");

  await page.getByRole("button", { name: "＋ লাইন যোগ করুন" }).click();
  await page.getByLabel("স্টেম লাইন 1").fill("নিচের কোনটি সঠিক?");
  await page.locator("#question").fill("কোনটি তীব্র এসিড?");
  await page.getByLabel("অপশন ক").fill("HCl");
  await page.getByLabel("অপশন খ").fill("CH3COOH");
  await page.getByLabel("অপশন গ").fill("H2CO3");
  await page.getByLabel("অপশন ঘ").fill("NaHCO3");
  await page.locator("#correct_option").selectOption("খ");

  await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await page.waitForURL(/\/admin\/bank$/);

  let card = await searchFor(page, id);
  await expect(card).toBeVisible();
  await expect(card.locator("[data-option-label]")).toHaveCount(4);
  await expect(card.locator('[data-correct="true"]')).toContainText("CH3COOH");
  await expect(card.getByTestId("mcq-answer-marker")).toHaveText("উত্তর");

  // --- 4. Edit the MCQ from the card (pencil link) and change the answer --
  await card.getByRole("link", { name: `${id} সম্পাদনা` }).click();
  await expect(page.getByRole("heading", { name: "প্রশ্ন সম্পাদনা" })).toBeVisible();
  await expect(page.locator("#correct_option")).toHaveValue("খ");
  await page.locator("#correct_option").selectOption("গ");
  await page.getByLabel("অপশন গ").fill("H2CO3 দ্রবণ");
  await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await page.waitForURL(/\/admin\/bank$/);

  card = await searchFor(page, id);
  await expect(card.locator('[data-correct="true"]')).toContainText("H2CO3 দ্রবণ");
  await expect(card.locator("[data-option-label]")).toHaveCount(4);

  // --- 5. Clean up: delete the question we created ------------------------
  await card.locator('button[aria-haspopup="menu"]').click();
  await page.getByRole("menuitem", { name: "মুছুন" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "নিশ্চিত" }).click();
  await expect(page.locator(`[data-question-id="${id}"]`)).toHaveCount(0, { timeout: 20_000 });

  // --- 6. The edit form shows a flagged question's flags with a × button --
  await page.goto("/admin/questions/chem-06-cq-002/edit");
  await expect(page.getByText("যাচাই দরকার (শুধু অ্যাডমিন — প্রিন্টে যাবে না)")).toBeVisible();
  await expect(page.getByRole("button", { name: /^ফ্ল্যাগ সরান/ })).toHaveCount(1);

  await page.evaluate(() => {
    window.localStorage.removeItem("qbhub.selection.v2");
  });
});

test("an SQ edits, saves and the card refreshes", async ({ page }) => {
  const id = SQ_ID;
  await page.goto("/admin/bank");
  await page.goto("/admin/questions/new");
  await expect(page.getByRole("heading", { name: "নতুন প্রশ্ন" })).toBeVisible();
  await page.locator("#qid").fill(id);
  await page.locator("#chapter").fill("6");
  await page.locator("#type").selectOption("SQ");
  await page.locator("#question").fill("মূল SQ প্রশ্ন");
  await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await page.waitForURL(/\/admin\/bank$/);

  let card = await searchFor(page, id);
  await expect(card).toContainText("মূল SQ প্রশ্ন");

  await card.getByRole("link", { name: `${id} সম্পাদনা` }).click();
  await page.locator("#question").fill("সম্পাদিত SQ প্রশ্ন");
  await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await page.waitForURL(/\/admin\/bank$/);

  card = await searchFor(page, id);
  await expect(card).toContainText("সম্পাদিত SQ প্রশ্ন");

  await card.locator('button[aria-haspopup="menu"]').click();
  await page.getByRole("menuitem", { name: "মুছুন" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "নিশ্চিত" }).click();
  await expect(page.locator(`[data-question-id="${id}"]`)).toHaveCount(0, { timeout: 20_000 });
});
