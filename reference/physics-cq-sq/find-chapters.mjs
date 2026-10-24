// Scans the text layer for digits only (Bangla letters in the layer are
// corrupted) to locate chapter boundaries: item numbers restarting at ০১.
import { readFileSync } from "fs";
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync("D:/Downloads/CQ SQ.pdf")), isEvalSupported: false }).promise;
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const tc = await page.getTextContent();
  const text = tc.items.map((i) => i.str).join(" ");
  const hits = [...new Set(text.match(/(?:০১|০২|০৩|০৪|০৫|০৬|০৭|০৮|০৯|১০)\s*[।.]/g) || [])].join(",");
  const marks = (text.match(/SQ|CQ/g) || []).join(",");
  console.log(n, "|", hits.slice(0, 50), "|", marks);
  page.cleanup();
}
