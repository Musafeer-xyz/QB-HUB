import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against the local/demo data source (no Supabase needed):
 *   npm run e2e
 * It uses the machine's installed Google Chrome, so no browser download is
 * required. Point E2E_BASE_URL at an already-running server to skip the
 * built-in dev server.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    channel: "chrome",
    headless: true,
    viewport: { width: 1500, height: 1100 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next dev -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
