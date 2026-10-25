import { describe, expect, it } from "vitest";
import {
  BROWSER_PRINT_FALLBACK_MESSAGE,
  isChromiumUnavailable,
} from "@/lib/pdf/fallback";

describe("isChromiumUnavailable", () => {
  it("recognises the 501 chromium_unavailable answer", () => {
    expect(
      isChromiumUnavailable(501, {
        error: "এই সার্ভারে Chromium চালু করা যায়নি, তাই PDF তৈরি হচ্ছে না।",
        code: "chromium_unavailable",
        fallback: "browser-print",
      }),
    ).toBe(true);
  });

  it("recognises it by the fallback marker alone", () => {
    expect(isChromiumUnavailable(501, { fallback: "browser-print" })).toBe(true);
  });

  it("recognises a 501 whose message names Chromium", () => {
    expect(isChromiumUnavailable(501, { error: "Chromium চালু করা যায়নি।" })).toBe(true);
  });

  it("ignores other failures", () => {
    expect(isChromiumUnavailable(500, { code: "chromium_unavailable" })).toBe(false);
    expect(isChromiumUnavailable(501, { error: "পেপার পাওয়া যায়নি।" })).toBe(false);
    expect(isChromiumUnavailable(501, null)).toBe(false);
    expect(isChromiumUnavailable(404, { error: "পেপার নেই।" })).toBe(false);
  });

  it("has the Bangla info text the builder shows", () => {
    expect(BROWSER_PRINT_FALLBACK_MESSAGE).toBe(
      "ব্রাউজার প্রিন্ট খুলছে — 'Save as PDF' বেছে নিন।",
    );
  });
});
