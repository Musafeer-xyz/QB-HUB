import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The screen has a theme (warm canvas, blue primary, tags, shadows). The
 * printed sheet does not: it is black on white by contract. These assertions
 * guard the stylesheet, because a single themed class on a paper element would
 * otherwise only show up in a PDF.
 */
const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");

// The final @media print block is the print stylesheet (an earlier, local one
// only neutralises the preview frame).
const printBlock = css.slice(css.lastIndexOf("@media print"));

describe("print theme purity", () => {
  it("forces black text and no background for everything inside the sheet", () => {
    expect(printBlock).toMatch(
      /\.paper-sheet,\s*\.paper-sheet \*,\s*\.print-root,\s*\.print-root \* \{[^}]*color:\s*#000 !important;[^}]*background:\s*transparent !important;[^}]*box-shadow:\s*none !important;/s,
    );
  });

  it("keeps the page white behind the sheet", () => {
    expect(printBlock).toMatch(/html,\s*body \{\s*background:\s*#fff !important;/);
    expect(printBlock).toContain(".print-scaffold {\n    background: #fff !important;");
  });

  it("hides the app chrome and the margin guide", () => {
    expect(printBlock).toContain(".no-print {\n    display: none !important;");
    expect(printBlock).toContain(".paper-margin-guide {\n    display: none !important;");
  });

  it("never references a theme token inside the print block or paper rules", () => {
    const paperRules = css
      .split("\n")
      .filter((line) => /\.paper-|\.print-root|\.print-scaffold/.test(line))
      .join("\n");
    const colourTokens = [
      "var(--primary",
      "var(--bg",
      "var(--surface",
      "var(--text",
      "var(--border",
      "var(--muted",
      "var(--subject",
      "var(--tag",
      "var(--flag",
    ];
    for (const source of [printBlock, paperRules]) {
      for (const token of colourTokens) expect(source).not.toContain(token);
    }
  });

  it("declares black-on-white for the sheet on screen too", () => {
    expect(css).toMatch(/\.paper-sheet \{[^}]*background:\s*#fff;[^}]*color:\s*#000;/s);
  });
});
