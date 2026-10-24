// Renders column crops of the chapter pages (left column, then right column,
// top and bottom halves) at higher zoom so Bangla text and year digits can be
// read accurately from the page images.
// Usage: node reference/physics-cq-sq/render-crops.mjs 15 16 17 18 19
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "@napi-rs/canvas";

const here = dirname(fileURLToPath(import.meta.url));
const scale = 3.4;
const outDir = join(here, "crops");
mkdirSync(outDir, { recursive: true });

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({
  data: new Uint8Array(readFileSync("D:/Downloads/CQ SQ.pdf")),
  isEvalSupported: false,
}).promise;

const pages = process.argv.slice(2).map(Number);
for (const n of pages) {
  const page = await doc.getPage(n);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;
  const W = canvas.width;
  const H = canvas.height;
  const cols = [
    ["L", Math.round(0.035 * W), Math.round(0.5 * W)],
    ["R", Math.round(0.49 * W), Math.round(0.985 * W)],
  ];
  const rows = [
    ["A", 0, Math.round(0.51 * H)],
    ["B", Math.round(0.49 * H), H],
  ];
  for (const [col, x0, x1] of cols) {
    for (const [row, y0, y1] of rows) {
      const w = x1 - x0;
      const h = y1 - y0;
      const part = createCanvas(w, h);
      part.getContext("2d").drawImage(canvas, x0, y0, w, h, 0, 0, w, h);
      const name = `p${String(n).padStart(2, "0")}${col}${row}.png`;
      writeFileSync(join(outDir, name), part.toBuffer("image/png"));
    }
  }
  console.log(`page ${n} done`);
  page.cleanup();
}
