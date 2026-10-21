/**
 * Supported print page sizes, in millimetres.
 * One table feeds the builder's select, the on-screen preview frame, the
 * `@page` rule used by window.print() and the PDF renderer's paper size.
 */
export const PAPER_SIZES = {
  A4: { widthMm: 210, heightMm: 297 },
  A5: { widthMm: 148, heightMm: 210 },
  B5: { widthMm: 176, heightMm: 250 },
  Letter: { widthMm: 215.9, heightMm: 279.4 },
  Legal: { widthMm: 215.9, heightMm: 355.6 },
} as const;

export type PaperSizeKey = keyof typeof PAPER_SIZES;
export const PAPER_SIZE_KEYS = Object.keys(PAPER_SIZES) as PaperSizeKey[];

export type PaperDims = {
  /** Numeric millimetres. */
  widthMm: number;
  heightMm: number;
  /** CSS lengths, e.g. `210mm`. */
  width: string;
  height: string;
  /** Screenshot-style viewport at 150 dpi (what the PDF renderer uses). */
  viewportWidth: number;
  viewportHeight: number;
  /** Class that sets `--paper-width` / `--paper-height` on the frame. */
  cssClass: string;
};

/** Unknown/legacy values fall back to A4. */
export function paperDims(size: string): PaperDims {
  const key = (size in PAPER_SIZES ? size : "A4") as PaperSizeKey;
  const { widthMm, heightMm } = PAPER_SIZES[key];
  return {
    widthMm,
    heightMm,
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
    viewportWidth: Math.round((widthMm * 150) / 25.4),
    viewportHeight: Math.round((heightMm * 150) / 25.4),
    cssClass: `paper-size-${key.toLowerCase()}`,
  };
}

/* ------------------------------------------------------------------ */
/* Margins                                                            */
/*                                                                     */
/* A preset is just a named set of four margins in millimetres.       */
/* `custom` keeps whatever the teacher typed; every other preset      */
/* overrides the four numbers so the two can never drift apart.       */
/* ------------------------------------------------------------------ */

export const MARGIN_PRESETS = {
  narrow: { top: 8, right: 8, bottom: 10, left: 8 },
  normal: { top: 12, right: 12, bottom: 14, left: 12 },
  wide: { top: 18, right: 18, bottom: 20, left: 18 },
} as const;

export type MarginPresetKey = keyof typeof MARGIN_PRESETS | "custom";

export type PaperMargins = { top: number; right: number; bottom: number; left: number };

/** The four margins the page box actually uses (preset wins over stored). */
export function resolveMargins(
  preset: string,
  stored: PaperMargins | null | undefined,
): PaperMargins {
  if (preset === "narrow" || preset === "normal" || preset === "wide") {
    return { ...MARGIN_PRESETS[preset] };
  }
  return {
    top: clampMm(stored?.top ?? MARGIN_PRESETS.normal.top),
    right: clampMm(stored?.right ?? MARGIN_PRESETS.normal.right),
    bottom: clampMm(stored?.bottom ?? MARGIN_PRESETS.normal.bottom),
    left: clampMm(stored?.left ?? MARGIN_PRESETS.normal.left),
  };
}

function clampMm(value: number): number {
  if (!Number.isFinite(value)) return 12;
  return Math.min(40, Math.max(0, Math.round(value * 10) / 10));
}

/** `12mm 12mm 14mm 12mm` — CSS shorthand order: top right bottom left. */
export function marginsCss(m: PaperMargins): string {
  return `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`;
}

export type PageRuleOptions = {
  paperSize: string;
  margins: PaperMargins;
  /** Print `১ / ৩` in the bottom margin box. */
  pageNumbers?: boolean;
  /**
   * One-line running header for the top margin of pages 2+. Empty/null means
   * no running header at all.
   */
  runningHead?: string | null;
};

/**
 * The single `@page` rule shared by the preview, window.print() and the
 * server-side PDF. The document injects it, so no page can drift from the
 * saved settings: size, all four margins and the page-number margin box come
 * from here.
 *
 * Chromium supports CSS page margin boxes (since 131), including the
 * predefined `bengali` counter style, so the footer is real Bangla numerals.
 *
 * The running header lives in the top margin box — not in a repeated table
 * header — because `@page :first` can then switch it off for page 1, where the
 * full header already is.
 */
export function paperPageCss(options: PageRuleOptions): string {
  const d = paperDims(options.paperSize);
  const rules = [
    `@page {`,
    `  size: ${d.width} ${d.height};`,
    `  margin: ${marginsCss(options.margins)};`,
  ];
  const runningHead = (options.runningHead ?? "").replace(/\s+/g, " ").trim();
  if (runningHead) {
    rules.push(
      `  @top-left {`,
      `    content: ${cssString(runningHead)};`,
      `    font-family: "Noto Sans Bengali", "Nirmala UI", "Vrinda", sans-serif;`,
      `    font-size: 10pt;`,
      `    color: #444;`,
      `    width: 100%;`,
      `    vertical-align: bottom;`,
      `    padding-bottom: 1.5mm;`,
      `    border-bottom: 1px solid #666;`,
      `  }`,
    );
  }
  if (options.pageNumbers !== false) {
    rules.push(
      `  @bottom-center {`,
      `    content: counter(page, bengali) " / " counter(pages, bengali);`,
      `    font-family: "Noto Sans Bengali", "Nirmala UI", "Vrinda", sans-serif;`,
      `    font-size: 10pt;`,
      `    color: #444;`,
      `    vertical-align: top;`,
      `    padding-top: 3mm;`,
      `  }`,
    );
  }
  rules.push(`}`);
  if (runningHead) {
    rules.push(`@page :first {`, `  @top-left { content: none; }`, `}`);
  }
  return rules.join("\n");
}

/** A CSS `content:` string literal, escaped for quotes and backslashes. */
function cssString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Legacy helper kept for callers that only need the page size. Prefer
 * `paperPageCss`, which also carries margins and page numbers.
 */
export function paperPageSizeCss(size: string): string {
  const d = paperDims(size);
  return `@page { size: ${d.width} ${d.height}; }`;
}
