import { describe, expect, it } from "vitest";
import {
  MARGIN_PRESETS,
  PAPER_SIZE_KEYS,
  PAPER_SIZES,
  marginsCss,
  paperDims,
  paperPageCss,
  paperPageSizeCss,
  resolveMargins,
} from "./sizes";
import { buildPaperDoc } from "./model";
import { paperSettingsSchema } from "@/lib/schemas/paper";

describe("paper sizes", () => {
  it("exposes the supported sizes with mm dimensions", () => {
    expect(PAPER_SIZE_KEYS).toEqual(["A4", "A5", "B5", "Letter", "Legal"]);
    expect(PAPER_SIZES.A4).toEqual({ widthMm: 210, heightMm: 297 });
    expect(PAPER_SIZES.A5).toEqual({ widthMm: 148, heightMm: 210 });
    expect(PAPER_SIZES.B5).toEqual({ widthMm: 176, heightMm: 250 });
    // Letter = US Letter (8.5 × 11 in), Legal = 8.5 × 14 in.
    expect(PAPER_SIZES.Letter.widthMm).toBeCloseTo(215.9, 1);
    expect(PAPER_SIZES.Letter.heightMm).toBeCloseTo(279.4, 1);
    expect(PAPER_SIZES.Legal.widthMm).toBeCloseTo(215.9, 1);
    expect(PAPER_SIZES.Legal.heightMm).toBeCloseTo(355.6, 1);
  });

  it("builds CSS lengths, frame class and a 150 dpi viewport", () => {
    const a5 = paperDims("A5");
    expect(a5.width).toBe("148mm");
    expect(a5.height).toBe("210mm");
    expect(a5.cssClass).toBe("paper-size-a5");
    expect(a5.viewportWidth).toBe(Math.round((148 * 150) / 25.4));
    expect(a5.viewportHeight).toBe(Math.round((210 * 150) / 25.4));
  });

  it("falls back to A4 for unknown/legacy values", () => {
    expect(paperDims("quarto").width).toBe("210mm");
    expect(paperDims("quarto").cssClass).toBe("paper-size-a4");
  });

  it("emits the @page rule that print/PDF honour", () => {
    expect(paperPageSizeCss("A5")).toBe("@page { size: 148mm 210mm; }");
    expect(paperPageSizeCss("A4")).toBe("@page { size: 210mm 297mm; }");
  });

  it("defaults saved settings to A4 and validates the enum", () => {
    expect(paperSettingsSchema.parse({}).paperSize).toBe("A4");
    expect(paperSettingsSchema.parse({ paperSize: "B5" }).paperSize).toBe("B5");
    expect(paperSettingsSchema.parse({ paperSize: "Legal" }).paperSize).toBe("Legal");
    expect(paperSettingsSchema.safeParse({ paperSize: "A6" }).success).toBe(false);
  });

  it("flows the size into the printable document meta", () => {
    const settings = paperSettingsSchema.parse({ paperSize: "A5" });
    const model = buildPaperDoc([], settings, {
      institute: "",
      logoSrc: null,
      examName: "",
      className: "",
      subjectLabel: "রসায়ন",
      date: null,
      time: null,
      durationMinutes: null,
      totalMarks: 0,
      instructions: null,
    });
    expect(model.meta.paperSize).toBe("A5");
  });
});

describe("page margins", () => {
  it("resolves the three presets and keeps custom numbers", () => {
    expect(resolveMargins("narrow", null)).toEqual(MARGIN_PRESETS.narrow);
    expect(resolveMargins("normal", { top: 1, right: 2, bottom: 3, left: 4 })).toEqual(
      MARGIN_PRESETS.normal,
    );
    expect(resolveMargins("custom", { top: 5, right: 6, bottom: 7.5, left: 8 })).toEqual({
      top: 5,
      right: 6,
      bottom: 7.5,
      left: 8,
    });
  });

  it("clamps custom margins into the supported 0–40 mm range", () => {
    const resolved = resolveMargins("custom", { top: -5, right: 999, bottom: 12, left: 12 });
    expect(resolved.top).toBe(0);
    expect(resolved.right).toBe(40);
  });

  it("prints four margins in CSS shorthand order", () => {
    expect(marginsCss({ top: 8, right: 9, bottom: 10, left: 11 })).toBe("8mm 9mm 10mm 11mm");
  });

  it("builds one @page rule with size, margins and Bangla page numbers", () => {
    const css = paperPageCss({
      paperSize: "A4",
      margins: { top: 8, right: 8, bottom: 10, left: 8 },
    });
    expect(css).toContain("size: 210mm 297mm");
    expect(css).toContain("margin: 8mm 8mm 10mm 8mm");
    expect(css).toContain("content: counter(page, bengali) \" / \" counter(pages, bengali)");
    expect(css).toContain("@bottom-center");
  });

  it("prints the running header in the top margin, but never on page 1", () => {
    const css = paperPageCss({
      paperSize: "A4",
      margins: MARGIN_PRESETS.normal,
      runningHead: "পরীক্ষা উচ্চ বিদ্যালয় — বার্ষিক পরীক্ষা ২০২৬ — রসায়ন (সেট ক)",
    });
    expect(css).toContain("@top-left");
    expect(css).toContain(
      'content: "পরীক্ষা উচ্চ বিদ্যালয় — বার্ষিক পরীক্ষা ২০২৬ — রসায়ন (সেট ক)"',
    );
    // The whole point: page 1 (full header) gets no running header.
    expect(css).toContain("@page :first");
    expect(css).toContain("@top-left { content: none; }");
    // Quote/backslash safe, since the text lands inside a CSS string.
    const tricky = paperPageCss({
      paperSize: "A4",
      margins: MARGIN_PRESETS.normal,
      runningHead: 'The "Lab" \\ Wing',
    });
    expect(tricky).toContain('content: "The \\"Lab\\" \\\\ Wing"');
  });

  it("leaves the running header out entirely when there is nothing to say", () => {
    for (const runningHead of [undefined, null, "", "   "]) {
      const css = paperPageCss({
        paperSize: "A4",
        margins: MARGIN_PRESETS.normal,
        runningHead,
      });
      expect(css).not.toContain("@top-left");
      expect(css).not.toContain("@page :first");
    }
  });

  it("can leave the page numbers out", () => {
    const css = paperPageCss({
      paperSize: "Letter",
      margins: MARGIN_PRESETS.narrow,
      pageNumbers: false,
    });
    expect(css).not.toContain("@bottom-center");
    expect(css).toContain("size: 215.9mm 279.4mm");
  });

  it("stores preset, custom margins and the page-number flag on the document", () => {
    const settings = paperSettingsSchema.parse({
      marginPreset: "custom",
      margins: { top: 5, right: 6, bottom: 7, left: 8 },
      showPageNumbers: false,
    });
    const model = buildPaperDoc([], settings, {
      institute: "",
      logoSrc: null,
      examName: "",
      className: "",
      subjectLabel: "রসায়ন",
      date: null,
      time: null,
      durationMinutes: null,
      totalMarks: 0,
      instructions: null,
    });
    expect(model.meta.margins).toEqual({ top: 5, right: 6, bottom: 7, left: 8 });
    expect(model.meta.marginPreset).toBe("custom");
    expect(model.meta.showPageNumbers).toBe(false);
  });
});

describe("print layout settings", () => {
  it("defaults to medium figures, kept-together questions and exam mode flags", () => {
    const parsed = paperSettingsSchema.parse({});
    expect(parsed.figureSize).toBe("medium");
    expect(parsed.keepQuestionTogether).toBe(true);
    expect(parsed.compactHeader).toBe(false);
    expect(parsed.showPageNumbers).toBe(true);
    expect(parsed.suggestion).toEqual({
      showTime: false,
      showMarks: false,
      showInstructions: false,
      showChoice: false,
      showTotal: false,
    });
  });
});
