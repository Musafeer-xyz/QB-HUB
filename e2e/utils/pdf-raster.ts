import { createCanvas } from "@napi-rs/canvas";

/**
 * Small raster/geometry helpers shared by the print regression tests: rasterise
 * a PDF page with pdf.js, read where text sits in page coordinates and compare
 * two images pixel by pixel.
 *
 * All page coordinates are points (1/72 inch) with y measured from the bottom —
 * the same space `getTextContent()` reports.
 */

type RasterCanvas = ReturnType<typeof createCanvas>;
type RasterCtx = ReturnType<RasterCanvas["getContext"]>;

export type PdfPageRaster = {
  ctx: RasterCtx;
  /** Device pixels per point. */
  scale: number;
  width: number;
  height: number;
  widthPt: number;
  heightPt: number;
};

/** Render one page of a PDF onto a canvas (white background). */
export async function rasterizePdfPage(
  pdf: Buffer,
  pageNumber = 1,
  scale = 2,
): Promise<PdfPageRaster> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(pdf) });
  const doc = await task.promise;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;
  await task.destroy();
  return {
    ctx,
    scale,
    width: canvas.width,
    height: canvas.height,
    widthPt: viewport.width / scale,
    heightPt: viewport.height / scale,
  };
}

export type PdfTextBox = {
  str: string;
  /** Left edge and baseline, in points from the bottom-left page corner. */
  x: number;
  y: number;
  width: number;
};

/** Every text run of a page, in page (point) coordinates. */
export async function pdfTextItems(pdf: Buffer, pageNumber = 1): Promise<PdfTextBox[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: new Uint8Array(pdf) });
  const doc = await task.promise;
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  const items: PdfTextBox[] = [];
  for (const raw of content.items) {
    if (!("str" in raw)) continue;
    const item = raw as { str: string; transform: number[]; width?: number };
    if (!item.str.trim()) continue;
    items.push({
      str: item.str,
      x: item.transform[4] ?? 0,
      y: item.transform[5] ?? 0,
      width: item.width ?? 0,
    });
  }
  await task.destroy();
  return items;
}

/**
 * mhchem pads its atoms with *invisible* italic `X` glyphs (`color: transparent`).
 * They are still exported as text runs, which is exactly what makes them
 * locatable — a printed page where they became visible has ink in these boxes.
 */
export function spacerBoxes(items: PdfTextBox[]): PdfTextBox[] {
  return items.filter((item) => item.str === "X");
}

/** Fraction of pixels darker than `threshold` inside a page-coordinate box. */
export function inkFractionInBox(
  raster: PdfPageRaster,
  box: { x: number; y: number; width: number },
  opts: { padPt?: number; heightPt?: number; fromBaselinePt?: number; threshold?: number } = {},
): number {
  const pad = opts.padPt ?? 0.75;
  const height = opts.heightPt ?? 7.5;
  // Glyphs sit above their baseline; page rasters grow downwards.
  const topPt = raster.heightPt - (box.y + height);
  const x = Math.round((box.x + pad) * raster.scale);
  const y = Math.round((topPt + pad) * raster.scale);
  const w = Math.max(1, Math.round((box.width - 2 * pad) * raster.scale));
  const h = Math.max(1, Math.round((height - 2 * pad) * raster.scale));
  return inkFraction(raster.ctx, x, y, w, h, opts.threshold ?? 170);
}

/** Fraction of pixels darker than `threshold` inside a raster-space box. */
export function inkFraction(
  ctx: RasterCtx,
  x: number,
  y: number,
  w: number,
  h: number,
  threshold = 170,
): number {
  const width = Math.max(0, Math.min(w, ctx.canvas.width - Math.max(0, x)));
  const height = Math.max(0, Math.min(h, ctx.canvas.height - Math.max(0, y)));
  if (width <= 0 || height <= 0) return 0;
  const data = ctx.getImageData(Math.max(0, x), Math.max(0, y), width, height).data;
  let dark = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (gray < threshold) dark += 1;
  }
  return dark / (data.length / 4);
}

/** Read a page-coordinate box out of a raster as greyscale samples. */
function sampleBox(
  raster: PdfPageRaster,
  x: number,
  y: number,
  w: number,
  h: number,
): Float32Array | null {
  const width = Math.max(0, Math.min(w, raster.width - Math.max(0, x)));
  const height = Math.max(0, Math.min(h, raster.height - Math.max(0, y)));
  if (width <= 0 || height <= 0) return null;
  const data = raster.ctx.getImageData(Math.max(0, x), Math.max(0, y), width, height).data;
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) {
    out[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
  }
  return out;
}

/**
 * Fraction of pixels of `a` that differ from the same box in `b` by more than
 * `tolerance` grey levels. Both rasters must be page-aligned (same page size).
 */
export function differingRatio(
  a: PdfPageRaster,
  b: PdfPageRaster,
  box: { x: number; y: number; width: number; height: number },
  tolerance = 60,
): number {
  const ax = Math.round(box.x * a.scale);
  const ay = Math.round((a.heightPt - box.y - box.height) * a.scale);
  const bx = Math.round(box.x * b.scale);
  const by = Math.round((b.heightPt - box.y - box.height) * b.scale);
  const w = Math.round(box.width * a.scale);
  const h = Math.round(box.height * a.scale);
  const sa = sampleBox(a, ax, ay, w, h);
  const sb = sampleBox(b, bx, by, w, h);
  if (!sa || !sb) return 1;
  const n = Math.min(sa.length, sb.length);
  if (n === 0) return 1;
  let diff = 0;
  for (let i = 0; i < n; i++) {
    if (Math.abs((sa[i] ?? 0) - (sb[i] ?? 0)) > tolerance) diff += 1;
  }
  return diff / n;
}

/** Bounding box (points) around several text boxes, grown by `padPt`. */
export function unionBox(
  boxes: PdfTextBox[],
  padPt = 6,
  pageWidthPt?: number,
  pageHeightPt?: number,
): { x: number; y: number; width: number; height: number } | null {
  if (boxes.length === 0) return null;
  const top = Math.max(...boxes.map((b) => b.y));
  const bottom = Math.min(...boxes.map((b) => b.y));
  const left = Math.min(...boxes.map((b) => b.x));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  // Text boxes carry no height: assume an em above the baseline.
  const x = left - padPt;
  const y = top + padPt;
  const width = right - left + padPt * 2;
  const height = top - bottom + 11 + padPt * 2;
  return {
    x: Math.max(0, x),
    y: pageHeightPt ? Math.min(y, pageHeightPt) : y,
    width: Math.min(width, (pageWidthPt ?? Number.MAX) - Math.max(0, x)),
    height,
  };
}
