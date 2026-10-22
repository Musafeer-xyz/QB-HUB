import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

const TEST_DIR = path.join(process.cwd(), "data-test-nfc");
const TEST_FILE = path.join(TEST_DIR, "nfc-test.json");

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const text = fs.readFileSync(file, "utf8").normalize("NFC");
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

describe("readJson NFC normalization", () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("normalizes decomposed Bangla characters when loading JSON", () => {
    // Use a known decomposed form: র (U+09B0) + ় (U+09BC) normalizes to র্য
    const decomposedText = "র\u09BC"; // র + ় (decomposed)
    const precomposedText = decomposedText.normalize("NFC"); // The NFC form

    const testData = { text: decomposedText };
    fs.writeFileSync(TEST_FILE, JSON.stringify(testData, null, 2), "utf8");

    // Verify file has decomposed form on disk
    const diskContent = fs.readFileSync(TEST_FILE, "utf8");
    expect(diskContent).toContain(decomposedText);

    // Load with readJson (which applies NFC normalization)
    const loaded = readJson<{ text: string }>(TEST_FILE, { text: "" });

    expect(loaded.text).toBe(precomposedText);

    // Verify file on disk is unchanged (still decomposed)
    const diskContentAfter = fs.readFileSync(TEST_FILE, "utf8");
    expect(diskContentAfter).toBe(diskContent);
  });
});
