import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Online exam flow on the local/demo data source:
 * admin builds an exam from 3 MCQs -> opens it -> student takes it with a name
 * -> result -> admin results page -> delete, leaving no exam/attempt behind.
 */
test.describe.configure({ mode: "serial" });

const MCQ_IDS = ["chem-06-mcq-001", "chem-06-mcq-002", "chem-06-mcq-003"];
const TITLE = `টেস্ট এক্সাম ${Date.now()}`;
const STUDENT = "টেস্ট শিক্ষার্থী";

function localFile(name: string): string {
  return path.join(process.cwd(), "local-data", name);
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function gotoBank(page: Page) {
  await page.goto("/admin/bank");
  await page.evaluate(() => window.localStorage.removeItem("qbhub.selection.v2"));
  await page.goto("/admin/bank");
  await page.locator("#bank-search").fill("");
}

async function selectMcqs(page: Page, ids: string[]) {
  await page.getByRole("button", { name: /^বহুনির্বাচনী/ }).click();
  for (const id of ids) {
    await page.locator("#bank-search").fill(id);
    const card = page.locator(`[data-question-id="${id}"]`);
    await expect(card).toBeVisible();
    if ((await card.getAttribute("data-selected")) !== "true") await card.click();
    await expect(card).toHaveAttribute("data-selected", "true");
  }
  await page.locator("#bank-search").fill("");
}

test("admin creates, student takes, results, cleanup", async ({ page }) => {
  await gotoBank(page);
  await selectMcqs(page, MCQ_IDS);

  await page.getByRole("button", { name: "এক্সাম বানাও" }).click();
  await expect(page).toHaveURL(/\/admin\/exams\/new/);
  await page.locator("#title").fill(TITLE);
  await page.locator("#duration").fill("30");
  await page.getByRole("button", { name: "এক্সাম তৈরি করুন" }).click();

  // First hit compiles the route on a dev server; allow for that.
  await expect(page).toHaveURL("/admin/exams", { timeout: 120_000 });
  const card = page.locator("[data-exam-id]", { hasText: TITLE });
  await expect(card).toBeVisible();
  const examId = await card.getAttribute("data-exam-id");
  expect(examId).toBeTruthy();

  // Publish it, then the public list and the student flow see it.
  await card.getByRole("button", { name: "খুলুন" }).click();
  await expect(card.getByRole("button", { name: "বন্ধ করুন" })).toBeVisible();

  await page.goto("/exams");
  await expect(page.getByRole("heading", { name: "ONLINE EXAM" })).toBeVisible();
  await expect(page.getByText("chemistry").first()).toBeVisible();
  await expect(page.getByText("মোলের ধারণা ও রাসায়নিক গণনা").first()).toBeVisible();
  await page.locator(`a[href="/exam/${examId}"]`).click();

  await expect(page).toHaveURL(new RegExp(`/exam/${examId}$`));
  // Wait for hydration so the controlled inputs keep what the test types.
  await page.waitForLoadState("networkidle");
  await page.locator("#name").fill(STUDENT);
  await expect(page.locator("#name")).toHaveValue(STUDENT);
  await page.getByRole("button", { name: "শুরু করুন" }).click();

  const questions = page.locator("[data-exam-question]");
  await expect(questions).toHaveCount(3);
  // No answer key in the DOM before submission.
  expect(await page.content()).not.toContain("correct_option");

  for (let i = 0; i < 3; i += 1) {
    await questions.nth(i).locator('input[type="radio"]').first().check();
  }

  await page.getByRole("button", { name: "জমা দিন" }).click();
  await expect(page.getByRole("heading", { name: "ফলাফল" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-score]")).toContainText("৩");
  await expect(page.locator("[data-result-question]")).toHaveCount(3);
  await expect(page.locator('[data-is-correct="true"], [data-is-correct="false"]')).toHaveCount(3);

  // Refresh keeps the result for the same attempt (no retake).
  await page.reload();
  await expect(page.getByRole("heading", { name: "ফলাফল" })).toBeVisible();
  await expect(page.locator("#name")).toHaveCount(0);

  // Admin results page lists the attempt, best score first, and offers CSV.
  await page.goto("/admin/exams");
  await page.locator("[data-exam-id]", { hasText: TITLE }).getByRole("button", { name: "ফলাফল" }).click();
  await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
  await expect(page.getByRole("cell", { name: STUDENT })).toBeVisible();
  await expect(page.getByRole("button", { name: /CSV/ })).toBeVisible();

  // Cleanup: deleting the exam also removes its attempts.
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("/admin/exams");
  await page.locator("[data-exam-id]", { hasText: TITLE }).getByRole("button", { name: "মুছুন" }).click();
  await expect(page.locator("[data-exam-id]", { hasText: TITLE })).toHaveCount(0);

  const exams = readJson<{ exams: Array<{ id: string }> }>(localFile("exams.json"), { exams: [] });
  const attempts = readJson<{ attempts: Array<{ examId: string }> }>(localFile("attempts.json"), {
    attempts: [],
  });
  expect(exams.exams.some((e) => e.id === examId)).toBe(false);
  expect(attempts.attempts.some((a) => a.examId === examId)).toBe(false);
});
