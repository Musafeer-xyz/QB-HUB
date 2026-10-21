import fs from "node:fs";
import { createCanvas } from "@napi-rs/canvas";

/**
 * Renders a PDF page to PNG using pdf.js (the same engine browsers use), so
 * the generated paper can be inspected visually — including Bangla conjuncts
 * and mhchem reaction arrows.
 */
export async function pdfPageToPng(
  pdfPath: string,
  outPath: string,
  pageNumber = 1,
  scale = 2,
): Promise<void> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const params = {
    canvasContext: context,
    viewport,
    canvas,
  } as unknown as Parameters<typeof page.render>[0];
  await page.render(params).promise;
  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  await loadingTask.destroy();
}
