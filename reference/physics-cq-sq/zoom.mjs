// Renders an arbitrary fractional rectangle of a page at high zoom.
// Usage: node reference/physics-cq-sq/zoom.mjs <page> <x0> <y0> <x1> <y1> <scale> <outname>
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "@napi-rs/canvas";

const here = dirname(fileURLToPath(import.meta.url));
const [pageNo, x0f, y0f, x1f, y1f, scaleArg, outName] = process.argv.slice(2);

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({
  data: new Uint8Array(readFileSync("D:/Downloads/CQ SQ.pdf")),
  isEvalSupported: false,
}).promise;
const page = await doc.getPage(Number(pageNo));
const viewport = page.getViewport({ scale: Number(scaleArg) });
const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;

const x0 = Math.round(Number(x0f) * canvas.width);
const y0 = Math.round(Number(y0f) * canvas.height);
const w = Math.round((Number(x1f) - Number(x0f)) * canvas.width);
const h = Math.round((Number(y1f) - Number(y0f)) * canvas.height);
const part = createCanvas(w, h);
part.getContext("2d").drawImage(canvas, x0, y0, w, h, 0, 0, w, h);
writeFileSync(join(here, "crops", `${outName}.png`), part.toBuffer("image/png"));
console.log(`${outName}.png ${w}x${h}`);
