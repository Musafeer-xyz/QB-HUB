import katex from "katex";
import "katex/contrib/mhchem";

/**
 * Display-time renderer for question text.
 *
 * Source strings may mix plain Bangla/Unicode chemistry (H₂O, Mg(OH)₂) with
 * `$...$` LaTeX/math/chemistry (mhchem `\ce{...}`, `\Delta H`, `\rightarrow`…).
 * Stored text is never altered; this runs on every render.
 *
 * A malformed `$...$` expression never throws: the raw text is shown instead
 * and the error is reported so the admin UI can flag it.
 */

export type RichSegment =
  | { kind: "text"; raw: string; html: string }
  | { kind: "math"; raw: string; display: boolean; html: string; error: string | null };

export type RichTextResult = {
  html: string;
  segments: RichSegment[];
  errors: { expr: string; message: string }[];
};

/** Escape text for safe HTML embedding (KaTeX escapes its own output). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type RawSegment = { kind: "text"; raw: string } | { kind: "math"; raw: string; display: boolean };

/**
 * Split a string into plain-text and math segments.
 * Supports `$...$` (inline) and `$$...$$` (display). `\$` stays literal and
 * math never spans a line break, so an unpaired `$` renders as plain text.
 */
export function splitMath(input: string): RawSegment[] {
  const out: RawSegment[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) {
      out.push({ kind: "text", raw: buffer });
      buffer = "";
    }
  };

  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "\\" && i + 1 < input.length) {
      const next = input[i + 1];
      // `\$` is a literal dollar sign; any other escape is kept verbatim.
      buffer += next === "$" ? "$" : ch + next;
      i += 2;
      continue;
    }
    if (ch === "$") {
      const display = input[i + 1] === "$";
      const openLen = display ? 2 : 1;
      const closer = display ? "$$" : "$";
      // Find the closing delimiter on the same line, honouring escapes.
      let j = i + openLen;
      let closed = -1;
      while (j < input.length) {
        const c = input[j];
        if (c === "\n") break;
        if (c === "\\") {
          j += 2;
          continue;
        }
        if (input.startsWith(closer, j)) {
          closed = j;
          break;
        }
        j++;
      }
      if (closed > i + openLen) {
        const content = input.slice(i + openLen, closed);
        flush();
        out.push({ kind: "math", raw: content, display });
        i = closed + openLen;
        continue;
      }
    }
    buffer += ch;
    i++;
  }
  flush();
  return out;
}

function renderMathHtml(tex: string, display: boolean): { html: string; error: null } | { html: string; error: string } {
  try {
    const html = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: true,
      // HTML only, everywhere — preview, print and the server PDF. The MathML
      // twin is normally clipped by KaTeX's CSS; the paper's print stylesheet
      // forces colours, so a hidden-by-CSS layer is one missing rule away from
      // printing over the HTML formula.
  // HTML only, everywhere — preview, print and the server PDF. The MathML
  // twin is normally clipped by KaTeX's CSS; the paper's print stylesheet
  // forces colours, so a hidden-by-CSS layer is one missing rule away from
  // printing over the HTML formula.
  output: "html",
      strict: false,
      trust: false,
      maxExpand: 1000,
      maxSize: 50,
    });
    return { html, error: null };
  } catch (err) {
    return { html: "", error: err instanceof Error ? err.message : String(err) };
  }
}

/** Parse + render one string into HTML. Never throws. */
export function renderRichText(input: string | null | undefined): RichTextResult {
  const text = input ?? "";
  const segments: RichSegment[] = splitMath(text).map((seg) => {
    if (seg.kind === "text") {
      return { kind: "text", raw: seg.raw, html: escapeHtml(seg.raw) };
    }
    const rendered = renderMathHtml(seg.raw, seg.display);
    const isArray = new RegExp(String.raw`\\begin\s*\{\s*array\s*\}`).test(seg.raw);
    let html: string;
    let error: string | null;
    if (rendered.error === null) {
      html = rendered.html;
      error = null;
    } else {
      // Malformed expression → show the raw source text, marked for admins.
      const literal = `${seg.display ? "$$" : "$"}${seg.raw}${seg.display ? "$$" : "$"}`;
      html = `<span class="math-error" title="${escapeHtml(rendered.error)}">${escapeHtml(literal)}</span>`;
      error = rendered.error;
    }
    if (isArray) html = `<span class="rt-table">${html}</span>`;
    return { kind: "math", raw: seg.raw, display: seg.display, html, error };
  });

  return {
    html: segments.map((s) => s.html).join(""),
    segments,
    errors: segments
      .filter((s): s is Extract<RichSegment, { kind: "math" }> => s.kind === "math" && s.error !== null)
      .map((s) => ({ expr: s.raw, message: s.error ?? "" })),
  };
}

/** Quick boolean check used by the import script and the admin editor. */
export function hasMathError(input: string | null | undefined): boolean {
  return renderRichText(input).errors.length > 0;
}

/**
 * Collect every `$...$` parse failure across a question's text fields.
 * Returns human-readable messages (Bangla) that get stored as admin-only flags.
 */
export function collectMathErrors(texts: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const text of texts) {
    if (!text) continue;
    for (const err of renderRichText(text).errors) {
      const msg = `LaTeX পার্স করা যায়নি: $${err.expr}$`;
      if (!seen.has(msg)) {
        seen.add(msg);
        out.push(msg);
      }
    }
  }
  return out;
}

/** Every text field of a question, in render order (used for search + flags). */
export function questionTextFields(q: {
  question?: string | null;
  stem?: string[];
  parts?: { text?: string | null }[];
  options?: { text?: string | null }[] | null;
  image_desc?: string | null;
}): string[] {
  const fields: string[] = [];
  if (q.question) fields.push(q.question);
  for (const line of q.stem ?? []) fields.push(line);
  for (const part of q.parts ?? []) if (part.text) fields.push(part.text);
  for (const option of q.options ?? []) if (option.text) fields.push(option.text);
  if (q.image_desc) fields.push(q.image_desc);
  return fields;
}
