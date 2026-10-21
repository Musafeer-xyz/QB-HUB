"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { renderRichText } from "@/lib/render/rich-text";

/**
 * KaTeX output cache. A question is often expanded, collapsed and expanded
 * again (and repeated in the preview); rendering is pure, so the HTML is reused
 * instead of re-parsing the same LaTeX. Bounded so a long session cannot grow
 * without limit.
 */
const HTML_CACHE = new Map<string, string>();
const CACHE_LIMIT = 1500;

function cachedHtml(text: string | null | undefined): string {
  const key = text ?? "";
  const hit = HTML_CACHE.get(key);
  if (hit !== undefined) return hit;
  const { html } = renderRichText(text);
  if (HTML_CACHE.size >= CACHE_LIMIT) HTML_CACHE.clear();
  HTML_CACHE.set(key, html);
  return html;
}

/** Inline renderer: mixed Bangla text + `$...$` math, rendered with KaTeX (mhchem). */
export function RichText({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const html = useMemo(() => cachedHtml(text), [text]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Block renderer (paragraph) for stems, questions and parts. */
export function RichBlock({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const html = useMemo(() => cachedHtml(text), [text]);
  return <p className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * Lazy KaTeX renderer: only renders when the element is near the viewport.
 * Uses IntersectionObserver for efficient viewport detection.
 */
export function LazyRichText({
  text,
  className,
  rootMargin = "200px",
}: {
  text: string | null | undefined;
  className?: string;
  /** How far outside the viewport to start rendering (default: 200px). */
  rootMargin?: string;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const html = useMemo(() => (visible ? cachedHtml(text) : text ?? ""), [text, visible]);

  return (
    <span ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/**
 * Lazy block renderer: only renders when the element is near the viewport.
 */
export function LazyRichBlock({
  text,
  className,
  rootMargin = "200px",
}: {
  text: string | null | undefined;
  className?: string;
  rootMargin?: string;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const html = useMemo(() => (visible ? cachedHtml(text) : text ?? ""), [text, visible]);

  return (
    <p ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/**
 * Admin-only live preview: renders the text and reports malformed `$...$`
 * expressions with a Bangla warning badge.
 */
export function RichTextLivePreview({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const { html, errors } = renderRichText(text);
  return (
    <div className={className}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {errors.length > 0 ? (
        <div className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
          যাচাই দরকার — LaTeX পার্স করা যায়নি:{" "}
          {errors.map((e) => (
            <code key={e.expr} className="mx-1 rounded bg-amber-100 px-1">
              ${e.expr}$
            </code>
          ))}
        </div>
      ) : null}
    </div>
  );
}
