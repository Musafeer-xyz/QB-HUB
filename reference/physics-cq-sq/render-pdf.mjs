// Renders each page of the CQ/SQ source PDF to PNG for image-only reading.
// The PDF text layer for Bangla is corrupted, so page images are the only
// reliable source. Usage: node reference/physics-cq-sq/render-pdf.mjs [pdf] [scale]
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "@napi-rs/canvas";

const here = dirname(fileURLToPath(import.meta.url));
const pdfPath = process.argv[2] ?? "D:/Downloads/CQ SQ.pdf";
const scale = Number(process.argv[3] ?? 2);
const outDir = join(here, "pages");
mkdirSync(outDir, { recursive: true });

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({
  data: new Uint8Array(readFileSync(pdfPath)),
  useSystemFonts: false,
  isEvalSupported: false,
}).promise;

console.log(`pages: ${doc.numPages}`);
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  const name = `page-${String(n).padStart(2, "0")}.png`;
  writeFileSync(join(outDir, name), canvas.toBuffer("image/png"));
  console.log(`${name} ${canvas.width}x${canvas.height}`);
  page.cleanup();
}
