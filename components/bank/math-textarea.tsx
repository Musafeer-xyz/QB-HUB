"use client";

import { useRef } from "react";

type Snippet = {
  /** Button label. */
  label: string;
  /** Text inserted before the selection. */
  before: string;
  /** Text inserted after the selection. */
  after: string;
  /** Math snippets get `$…$` around them unless the caret is already in math. */
  math?: boolean;
  title: string;
};

/** Small, deliberate set of symbols the source data actually uses. */
const SNIPPETS: Snippet[] = [
  { label: "\\ce{}", before: "\\ce{", after: "}", math: true, title: "mhchem রাসায়নিক সূত্র" },
  { label: "$…$", before: "$", after: "$", title: "গণিত/রসায়ন LaTeX" },
  { label: "→", before: "→", after: "", title: "তীর" },
  { label: "⇌", before: "⇌", after: "", title: "সমতাবিধান" },
  { label: "Δ", before: "Δ", after: "", title: "ডেল্টা" },
  { label: "↑", before: "↑", after: "", title: "উপরের তীর (গ্যাস)" },
  { label: "↓", before: "↓", after: "", title: "নিচের তীর (অধঃক্ষেপ)" },
  { label: "₂", before: "_{", after: "}", math: true, title: "সাবস্ক্রিপ্ট" },
  { label: "²", before: "^{", after: "}", math: true, title: "সুপারস্ক্রিপ্ট" },
];

/** Is the caret inside an unclosed `$…$` on this line? */
function insideMath(value: string, caret: number): boolean {
  let dollars = 0;
  for (let i = 0; i < caret; i++) {
    if (value[i] === "\\") {
      i += 1;
      continue;
    }
    if (value[i] === "\n") dollars = 0;
    if (value[i] === "$") dollars += 1;
  }
  return dollars % 2 === 1;
}

/**
 * Textarea with the editor's insert buttons. The snippet wraps the current
 * selection (or starts a new one) and keeps the caret inside the placeholder,
 * so the live preview updates as soon as something is typed.
 */
export function MathTextarea({
  id,
  value,
  onChange,
  className = "",
  placeholder,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  function insert(snippet: Snippet) {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    const wrap = Boolean(snippet.math) && !insideMath(value, start);
    const prefix = wrap ? "$" : "";
    const suffix = wrap ? "$" : "";
    const next =
      value.slice(0, start) +
      prefix +
      snippet.before +
      value.slice(start, end) +
      snippet.after +
      suffix +
      value.slice(end);
    onChange(next);
    const caret = start + prefix.length + snippet.before.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret + (end - start));
    });
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-1">
        {SNIPPETS.map((snippet) => (
          <button
            key={snippet.label}
            type="button"
            title={snippet.title}
            className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] leading-5 text-slate-700 hover:bg-slate-50"
            onClick={() => insert(snippet)}
          >
            {snippet.label}
          </button>
        ))}
      </div>
      <textarea
        id={id}
        ref={ref}
        className={`field-input font-mono text-[13px] ${className}`}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
