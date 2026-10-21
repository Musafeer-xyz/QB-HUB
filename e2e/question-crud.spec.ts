import path from "node:path";
import { expect, test } from "@playwright/test";

type ApiQuestion = {
  id: string;
  type: string;
  imagePath: string | null;
  stem: string[];
  parts: { label: string; text: string; marks: number }[];
  question: string | null;
};

async function fetchQuestionIds(page: import("@playwright/test").Page): Promise<Map<string, ApiQuestion>> {
  const res = await page.request.get("/api/questions");
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as { items: ApiQuestion[] };
  return new Map(data.items.map((q) => [q.id, q]));
}

test("admin can create a CQ with an uploaded image, edit it and delete it", async ({ page }) => {
  const id = "chem-06-cq-900";
  await page.goto("/admin/questions/new");
  await expect(page.getByRole("heading", { name: "নতুন প্রশ্ন" })).toBeVisible();

  await page.locator("#qid").fill(id);
  await page.locator("#chapter").fill("6");
  await page.locator("#type").selectOption("CQ");

  // stem line with mixed Bangla + chemistry
  await page.getByRole("button", { name: "＋ লাইন যোগ করুন" }).click();
  await page.getByLabel("স্টেম লাইন 1").fill("(i) $\\ce{C + O2 -> CO2}$ বিক্রিয়াটি লক্ষ কর।");

  // figure upload (local mode writes to ./local-data/images)
  await page.locator("#image").setInputFiles(path.join(process.cwd(), "data", "images", "chem-06-cq-001.png"));
  await expect(page.getByText(/ফাইল:/)).toBeVisible({ timeout: 20_000 });
  await page.locator("#imagedesc").fill("পরীক্ষার চিত্র");

  // four parts, as in the source format
  const partTexts = page.getByLabel("পার্টের প্রশ্ন");
  const texts = ["প্রতীক কাকে বলে?", "ব্যাখ্যা কর।", "নির্ণয় কর।", "বিশ্লেষণ কর।"];
  await expect(partTexts).toHaveCount(4);
  for (let i = 0; i < texts.length; i++) {
    await partTexts.nth(i).fill(texts[i] as string);
  }

  // live preview updates while typing (KaTeX output, not raw LaTeX)
  const preview = page.locator("section").filter({ hasText: "লাইভ প্রিভিউ" }).last();
  await expect(preview.locator(".katex").first()).toBeVisible();
  await expect(preview.getByText("পরীক্ষার চিত্র")).toBeVisible();

  await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await page.waitForURL(/\/admin\/bank$/);

  let questions = await fetchQuestionIds(page);
  const created = questions.get(id);
  expect(created?.type).toBe("CQ");
  expect(created?.parts).toHaveLength(4);
  expect(created?.stem).toHaveLength(1);
  expect(created?.imagePath).toMatch(/\.png$/);

  // edit: part marks + stem text
  await page.goto(`/admin/questions/${id}/edit`);
  await expect(page.getByRole("heading", { name: "প্রশ্ন সম্পাদনা" })).toBeVisible();
  await page.getByLabel("পার্টের প্রশ্ন").first().fill("সম্পাদিত প্রশ্ন ক?");
  await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await page.waitForURL(/\/admin\/bank$/);

  questions = await fetchQuestionIds(page);
  expect(questions.get(id)?.parts[0]?.text).toBe("সম্পাদিত প্রশ্ন ক?");

  // delete from the workspace row — a Bangla confirmation dialog comes first
  await page.locator("#bank-search").fill(id);
  const row = page.locator(`[data-question-id="${id}"]`);
  await expect(row).toBeVisible();
  await row.locator('button[aria-haspopup="menu"]').click();
  await page.getByRole("menuitem", { name: "মুছুন" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("আপনি কি নিশ্চিত? এই প্রশ্নটি মুছে যাবে।");

  // বাতিল aborts: nothing is deleted
  await dialog.getByRole("button", { name: "বাতিল" }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();
  expect((await fetchQuestionIds(page)).has(id)).toBe(true);

  // নিশ্চিত actually deletes
  await row.locator('button[aria-haspopup="menu"]').click();
  await page.getByRole("menuitem", { name: "মুছুন" }).click();
  await dialog.getByRole("button", { name: "নিশ্চিত" }).click();
  await expect(row).toHaveCount(0, { timeout: 20_000 });

  questions = await fetchQuestionIds(page);
  expect(questions.has(id)).toBe(false);
});
