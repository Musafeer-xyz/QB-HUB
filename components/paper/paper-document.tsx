"use client";

import { useEffect, useRef } from "react";
import { RichText } from "@/components/rich-text";
import { QuestionImage } from "@/components/paper/question-image";
import { toBanglaDigits } from "@/lib/bangla";
import { paperPageCss } from "@/lib/paper/sizes";
import { runningHeadText } from "@/lib/paper/model";
import { splitMcqStem } from "@/lib/mcq-layout";
import type {
  PaperDocMeta,
  PaperDocPart,
  PaperDocQuestion,
  PaperDocSection,
  PaperDocSet,
} from "@/lib/paper/model";

/**
 * The printable document. This single component powers the live preview,
 * window.print() and the server-rendered PDF, so all three match exactly.
 *
 * Layout notes:
 * - The full header is normal body content (page 1 only). The compact running
 *   header is a CSS page margin box (`@top-left`) emitted by `paperPageCss`,
 *   which `@page :first` switches off — so page 1 can never show both.
 * - `break-inside: avoid` keeps a CQ (stem + figure + parts) in one column/page
 *   unless the teacher turns "প্রশ্ন একসাথে রাখো" off.
 * - Everything stays inside its column: items get `min-width: 0`, source tags
 *   wrap normally, and a formula wider than its column is scaled down to fit
 *   (measured after the fonts are ready, so print/PDF get the scaled version).
 */
export function PaperDocument({ meta, sets }: { meta: PaperDocMeta; sets: PaperDocSet[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    root.removeAttribute("data-paper-ready");

    const run = async () => {
      try {
        // KaTeX only requests its webfonts once a formula is laid out, so
        // `fonts.ready` alone can resolve before they start loading. Load the
        // families this document can use explicitly, then wait for everything.
        await Promise.all(
          KATEX_FONT_FAMILIES.map((family) =>
            document.fonts.load(`1em ${family}`).catch(() => [] as FontFace[]),
          ),
        );
        await document.fonts.ready;
      } catch {
        // No font loading API (older engines): continue anyway.
      }
      await Promise.all(
        Array.from(root.querySelectorAll("img")).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) return resolve();
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
      );
      if (cancelled) return;
      // Readiness means laid out: every formula box has a real width (a
      // zero-width box would be fitted against nothing and print wrong).
      for (let attempt = 0; attempt < 10; attempt++) {
        if (formulasLaidOut(root)) break;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled) return;
      }
      fitWideFormulas(root);
      root.setAttribute("data-paper-ready", "1");
    };
    void run();

    // Zoom changes / window resizes change the column width, so re-fit after
    // layout settles. Resizing never loops: transforms do not affect layout.
    let raf = 0;
    const refit = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => fitWideFormulas(root));
    };
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(refit);
    observer?.observe(root);
    window.addEventListener("resize", refit);

    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener("resize", refit);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [meta, sets]);

  return (
    <div
      ref={rootRef}
      className={
        `paper-sheet font-${meta.fontSize} spacing-${meta.spacing} ` +
        `figure-${meta.figureSize} ` +
        `columns-${meta.columns} ` +
        (meta.keepQuestionTogether ? "keep-together" : "split-allowed")
      }
      data-paper-columns={meta.columns}
    >
      {/* The one @page rule: paper size, all four margins, the running
          header (pages 2+) and the page numbers. */}
      <style
        data-paper-page-rule
        dangerouslySetInnerHTML={{
          __html: paperPageCss({
            paperSize: meta.paperSize,
            margins: meta.margins,
            pageNumbers: meta.showPageNumbers,
            runningHead: runningHeadText(meta),
          }),
        }}
      />
      {meta.watermark && meta.institute ? (
        <div className="paper-watermark" aria-hidden="true">
          {meta.institute}
        </div>
      ) : null}
      {sets.map((set, index) => {
        const blocks = blocksOf(set.sections);
        const rendered =
          blocks.length > 0 ? blocks : [{ heading: null, newPage: false, sections: [] }];
        return (
          <div key={set.name || `set-${index}`} className={index > 0 ? "break-before-page" : undefined}>
            {rendered.map((block, blockIndex) => (
              <div
                key={`${block.heading ?? "block"}-${blockIndex}`}
                className={blockIndex > 0 && block.newPage ? "break-before-page" : undefined}
              >
                <table className="paper-table">
                  <tbody>
                    <tr>
                      <td className="paper-content">
                        {blockIndex === 0 ? (
                          <div className="paper-first-header">
                            <Header meta={meta} totalMarks={set.totalMarks} />
                          </div>
                        ) : null}

                        {block.heading ? (
                          <h3 className="paper-chapter-heading">{block.heading}</h3>
                        ) : null}
                        {block.sections.length === 0 ? (
                          <p className="py-10 text-center text-slate-500">
                            কোনো প্রশ্ন নির্বাচন করা হয়নি।
                          </p>
                        ) : (
                          <div
                            className={
                              "paper-section-block " +
                              (meta.columns === "2" ? "paper-columns" : "paper-columns-single") +
                              (meta.columns === "2" && meta.columnDivider
                                ? " paper-columns-divided"
                                : "")
                            }
                          >
                            {block.sections.map((section, i) => (
                              <Section key={`${section.type}-${i}`} section={section} />
                            ))}
                          </div>
                        )}

                        {blockIndex === rendered.length - 1 ? (
                          <p className="paper-end">
                            — সমাপ্ত —
                            {showTotalMarks(meta) && set.totalMarks > 0
                              ? ` (মোট নম্বর: ${toBanglaDigits(set.totalMarks)})`
                              : ""}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Suggestion sheets hide the total marks line unless it is turned on. */
function showTotalMarks(meta: PaperDocMeta): boolean {
  return meta.mode !== "suggestion" || meta.suggestion.showTotal;
}

/** Every KaTeX family the document may use (declared by katex.min.css). */
const KATEX_FONT_FAMILIES = [
  "KaTeX_Main",
  "KaTeX_Math",
  "KaTeX_Size1",
  "KaTeX_Size2",
  "KaTeX_Size3",
  "KaTeX_Size4",
  "KaTeX_AMS",
];

/** True when every rendered formula has a real box to measure and scale. */
function formulasLaidOut(root: HTMLElement): boolean {
  const formulas = root.querySelectorAll<HTMLElement>(".katex");
  for (const el of formulas) {
    if (el.getBoundingClientRect().width <= 0) return false;
  }
  return true;
}

/**
 * Scale a formula down when it is wider than its column. KaTeX is rendered at
 * natural size and laid out before this runs, so `scrollWidth` is the real
 * width. Transforms do not affect layout, so re-running is idempotent.
 */
function fitWideFormulas(root: HTMLElement): void {
  const targets = root.querySelectorAll<HTMLElement>(".katex-display, .katex");
  for (const el of targets) {
    const parent = el.parentElement;
    if (!parent) continue;
    el.style.transform = "";
    el.style.transformOrigin = "";
    el.style.marginRight = "";
    // 1px of slack for border/rounding: the goal is "never clipped", not
    // "exactly the column width".
    const available = Math.max(0, parent.clientWidth - 1);
    const width = el.getBoundingClientRect().width;
    if (!available || width <= available + 0.5) continue;
    // No floor that could reintroduce an overflow: an extreme formula becomes
    // tiny, but it always stays inside its column instead of being clipped.
    const ratio = Math.max(0.02, available / width);
    el.style.transformOrigin = "left center";
    el.style.transform = `scale(${ratio})`;
    // Collapse the horizontal space the unscaled box still reserves.
    el.style.marginRight = `${-Math.round(width * (1 - ratio))}px`;
  }
}

/**
 * Group sections into chapter blocks. Each block is printed as its own table
 * with its own column container, so "each chapter on a new page" is a real page
 * break — Chromium ignores page breaks inside a table cell or a multi-column
 * flow.
 */
function blocksOf(sections: PaperDocSection[]): {
  heading: string | null;
  newPage: boolean;
  sections: PaperDocSection[];
}[] {
  const blocks: { heading: string | null; newPage: boolean; sections: PaperDocSection[] }[] = [];
  for (const section of sections) {
    if (blocks.length === 0 || section.chapterHeading) {
      blocks.push({
        heading: section.chapterHeading,
        newPage: blocks.length > 0 && section.newPage,
        sections: [],
      });
    }
    blocks[blocks.length - 1]?.sections.push(section);
  }
  return blocks;
}

function Header({ meta, totalMarks }: { meta: PaperDocMeta; totalMarks: number }) {
  const isSuggestion = meta.mode === "suggestion";
  const showTime = !isSuggestion || meta.suggestion.showTime;
  const showMarks = !isSuggestion || meta.suggestion.showMarks;
  const showInstructions = !isSuggestion || meta.suggestion.showInstructions;

  const timeText =
    meta.time ?? (meta.durationMinutes ? `${toBanglaDigits(meta.durationMinutes)} মিনিট` : null);
  const compactLine = [
    meta.className ? `শ্রেণি: ${meta.className}` : null,
    `বিষয়: ${meta.subjectLabel}`,
    meta.chapterLabel,
  ]
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(" · ");

  return (
    <header className="paper-page-header">
      <div className="paper-set-code">সেট কোড: {meta.setCode}</div>

      <div className="paper-header-center">
        {meta.institute ? <h1 className="paper-institute">{meta.institute}</h1> : null}
        {meta.examName ? <p className="paper-header-line font-semibold">{meta.examName}</p> : null}
        {meta.compactHeader ? (
          <p className="paper-header-line">{compactLine}</p>
        ) : (
          <>
            {meta.className ? (
              <p className="paper-header-line">শ্রেণি: {meta.className}</p>
            ) : null}
            <p className="paper-header-line">বিষয়: {meta.subjectLabel}</p>
            {meta.chapterLabel ? (
              <p className="paper-header-line">{meta.chapterLabel}</p>
            ) : null}
          </>
        )}
      </div>

      {showTime || showMarks ? (
        <div className="paper-header-meta">
          {showTime ? <span>সময়— {timeText ?? "—"}</span> : null}
          {showMarks ? <span>পূর্ণমান— {toBanglaDigits(totalMarks)}</span> : null}
        </div>
      ) : null}

      {showInstructions && meta.instructions ? (
        <p className="paper-instructions">{meta.instructions}</p>
      ) : null}

      <div className="paper-header-rule" />
    </header>
  );
}

function Section({ section }: { section: PaperDocSection }) {
  return (
    <section className="paper-section">
      <div className="paper-section-title">
        <h2 className="text-base font-bold">{section.heading}</h2>
        {section.instruction ? (
          <p className="paper-section-instruction">({section.instruction})</p>
        ) : null}
        {section.summary.note ? (
          <p className="paper-section-note">({section.summary.note})</p>
        ) : null}
      </div>

      {section.questions.map((question) =>
        section.type === "CQ" ? (
          <CQ key={question.id} question={question} />
        ) : section.type === "MCQ" ? (
          <MCQ key={question.id} question={question} />
        ) : (
          <SQ key={question.id} question={question} />
        ),
      )}
    </section>
  );
}

function SourceTag({ source }: { source: string[] }) {
  if (source.length === 0) return null;
  return <span className="paper-source">[{source.join(", ")}]</span>;
}

function CQ({ question }: { question: PaperDocQuestion }) {
  return (
    <article className="paper-question paper-question-cq">
      {question.breakBefore ? <div className="break-before-page" /> : null}
      <div className="flex items-start gap-2">
        <span className="paper-qno shrink-0">{question.label}</span>
        <div className="min-w-0 flex-1">
          {question.stem.length > 0 ? (
            <div className="mb-1">
              {question.stem.map((line, i) => (
                <p key={i} className="question-text">
                  <RichText text={line} />
                </p>
              ))}
            </div>
          ) : null}

          {question.imageSrc || question.imageDesc ? (
            <QuestionImage
              src={question.imageSrc}
              desc={question.imageDesc}
              available={question.imageAvailable}
            />
          ) : null}

          <table className="paper-parts w-full border-collapse">
            <tbody>
              {question.parts.map((part) => (
                <PartRow key={part.label} part={part} />
              ))}
            </tbody>
          </table>

          <SourceTag source={question.source} />
        </div>
      </div>
    </article>
  );
}

function PartRow({ part }: { part: PaperDocPart }) {
  return (
    <tr className="paper-part-row align-top">
      <td className="w-7 py-0.5 align-top font-semibold">({part.label})</td>
      <td className="question-text min-w-0 py-0.5">
        <RichText text={part.text} />
        {part.answer ? (
          <p className="mt-1 border-l-2 border-slate-300 pl-2 text-xs text-slate-600">
            <span className="font-semibold">উত্তর:</span> {part.answer}
          </p>
        ) : null}
      </td>
      <td className="paper-marks w-10 whitespace-nowrap py-0.5 text-right align-top">
        [{toBanglaDigits(part.marks)}]
      </td>
    </tr>
  );
}

/**
 * An MCQ: number, stem/statement lines, the question, then the four choices in
 * a 2×2 grid. The correct option never reaches this component.
 */
function MCQ({ question }: { question: PaperDocQuestion }) {
  // A long option needs the full width to read; the rest use the 2×2 grid.
  const singleColumn = question.options.some((option) => option.text.length > 30);
  const { stimulus, prompt, statements } = splitMcqStem(question.stem);
  return (
    <article className="paper-question paper-question-mcq">
      {question.breakBefore ? <div className="break-before-page" /> : null}
      <div className="flex items-start gap-2">
        <span className="paper-qno shrink-0">{question.label}</span>
        <div className="min-w-0 flex-1">
          {stimulus.length > 0 ? (
            <div className="mb-1">
              {stimulus.map((line, i) => (
                <p key={`stimulus-${i}`} className="question-text">
                  <RichText text={line} />
                </p>
              ))}
            </div>
          ) : null}

          {/* No per-question marks label on the paper: the section heading
              carries "N × ১ = N" and the header carries the total. */}
          <div className="question-text">
            <RichText text={question.question} />
          </div>

          {prompt.length > 0 ? (
            <div className="mb-1">
              {prompt.map((line, i) => (
                <p key={`prompt-${i}`} className="question-text">
                  <RichText text={line} />
                </p>
              ))}
            </div>
          ) : null}

          {statements.length > 0 ? (
            <div className="mb-1">
              {statements.map((line, i) => (
                <p key={`statement-${i}`} className="question-text">
                  <RichText text={line} />
                </p>
              ))}
            </div>
          ) : null}

          {question.imageSrc || question.imageDesc ? (
            <QuestionImage
              src={question.imageSrc}
              desc={question.imageDesc}
              available={question.imageAvailable}
            />
          ) : null}

          <ul className={"paper-mcq-options" + (singleColumn ? " single-column" : "")}>
            {question.options.map((option) => (
              <li key={option.label} className="paper-mcq-option" data-option-label={option.label}>
                <span className="paper-mcq-label">({option.label})</span>
                <RichText text={option.text} className="question-text min-w-0 flex-1" />
              </li>
            ))}
          </ul>

          <SourceTag source={question.source} />
        </div>
      </div>
    </article>
  );
}

function SQ({ question }: { question: PaperDocQuestion }) {
  return (
    <article className="paper-question paper-question-sq flex items-start gap-2">
      {question.breakBefore ? <div className="break-before-page" /> : null}
      <span className="paper-qno shrink-0">{question.label}</span>
      <div className="min-w-0 flex-1">
        {/* SQ prints no marks beside the question (the heading has "N × ২ = …").
            A block wrapper keeps the column width measurable, so an over-wide
            formula is still scaled down to fit. */}
        <div className="question-text">
          <RichText text={question.question} />
        </div>
        {question.answer ? (
          <p className="mt-1 border-l-2 border-slate-300 pl-2 text-xs text-slate-600">
            <span className="font-semibold">উত্তর:</span> {question.answer}
          </p>
        ) : null}
        <SourceTag source={question.source} />
      </div>
    </article>
  );
}
