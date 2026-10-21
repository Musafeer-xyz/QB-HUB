import fs from "node:fs";
import { chromium, type Browser } from "playwright-core";

/**
 * Launch Chromium for server-side PDF rendering.
 *
 * Resolution order:
 *  1. CHROMIUM_EXECUTABLE_PATH env var
 *  2. system Chrome / Edge (developer machines)
 *  3. @sparticuz/chromium (Vercel / AWS Lambda builds)
 *  4. Playwright's own downloaded browser (if installed)
 */
async function launchBrowser(): Promise<Browser> {
  const candidates = [
    process.env.CHROMIUM_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((p): p is string => Boolean(p));

  for (const executablePath of candidates) {
    if (!fs.existsSync(executablePath)) continue;
    try {
      return await chromium.launch({
        executablePath,
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
      });
    } catch {
      // try the next candidate
    }
  }

  try {
    const sparticuz = (await import("@sparticuz/chromium")).default;
    const executablePath = await sparticuz.executablePath();
    return await chromium.launch({
      executablePath,
      args: [...sparticuz.args, "--font-render-hinting=none"],
      headless: true,
    });
  } catch {
    // fall back to a locally installed Playwright browser
  }

  return chromium.launch({ args: ["--no-sandbox", "--font-render-hinting=none"] });
}

/* ------------------------------------------------------------------ */
/* Shared warm instance                                               */
/*                                                                     */
/* A fresh Chromium launch costs several seconds. The browser is       */
/* therefore started lazily on the first PDF request, reused for every */
/* later one (a new page per request) and closed after 5 minutes idle. */
/* ------------------------------------------------------------------ */

const IDLE_CLOSE_MS = 5 * 60_000;

let shared: Promise<Browser> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

/** Close the shared browser once it has been idle for a while. */
function scheduleIdleClose() {
  clearIdleTimer();
  idleTimer = setTimeout(
    () => {
      idleTimer = null;
      const pending = shared;
      shared = null;
      void pending?.then((browser) => browser.close()).catch(() => undefined);
    },
    IDLE_CLOSE_MS,
  );
  // Never keep the Node process alive just for the idle timer.
  idleTimer.unref?.();
}

async function connect(attempt: number): Promise<Browser> {
  if (!shared) {
    shared = launchBrowser().catch((err: unknown) => {
      shared = null;
      throw err;
    });
  }
  const browser = await shared;
  if (browser.isConnected()) return browser;
  // Crashed/quit instance: drop it and relaunch once.
  shared = null;
  if (attempt > 0) throw new Error("Chromium চালু করা যায়নি।");
  return connect(attempt + 1);
}

export type AcquiredBrowser = {
  browser: Browser;
  /** Time spent launching a cold browser (0 when a warm one was reused). */
  launchMs: number;
  reused: boolean;
};

/**
 * The shared browser for a PDF render. Launches lazily on the first request,
 * then reuses the warm instance and relaunches automatically if it died.
 */
export async function acquireBrowser(): Promise<AcquiredBrowser> {
  clearIdleTimer();
  const reused = shared !== null;
  const startedAt = Date.now();
  const browser = await connect(0);
  return {
    browser,
    launchMs: reused ? 0 : Date.now() - startedAt,
    reused,
  };
}

/** Call when a render finishes: keeps the browser warm, then lets it idle out. */
export function releaseBrowser(): void {
  scheduleIdleClose();
}
