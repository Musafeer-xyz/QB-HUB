import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaperDocument } from "@/components/paper/paper-document";
import type {
  PaperDocMeta,
  PaperDocQuestion,
  PaperDocSection,
  PaperDocSet,
} from "@/lib/paper/model";
import { summarizeSection } from "@/lib/paper/sections";

const meta: PaperDocMeta = {
  institute: "টেস্ট স্কুল",
  logoSrc: null,
  examName: "বার্ষিক পরীক্ষা",
  className: "দশম",
  subjectLabel: "রসায়ন",
  date: null,
  time: null,
  durationMinutes: 180,
  totalMarks: 13,
  instructions: null,
  mode: "exam",
  columns: "1",
  columnDivider: false,
  restartNumbering: false,
  fontSize: "normal",
  spacing: "normal",
  paperSize: "A4",
  margins: { top: 12, right: 12, bottom: 14, left: 12 },
  marginPreset: "normal",
  figureSize: "medium",
  keepQuestionTogether: true,
  compactHeader: false,
  showPageNumbers: false,
  suggestion: {
    showTime: false,
    showMarks: false,
    showInstructions: false,
    showChoice: false,
    showTotal: false,
  },
  showAnswers: false,
  sqMarks: 2,
  chapterLabel: null,
  setCode: "ক",
  showSource: false,
  watermark: false,
};

function question(overrides: Partial<PaperDocQuestion>): PaperDocQuestion {
  return {
    id: "q",
    number: 1,
    label: "০১।",
    type: "SQ",
    section: "SQ",
    stem: [],
    question: "",
    options: [],
    imageSrc: null,
    imageDesc: null,
    imageAvailable: false,
    parts: [],
    marks: 2,
    breakBefore: false,
    answer: null,
    source: [],
    ...overrides,
  };
}

function section(
  type: "SQ" | "MCQ" | "CQ",
  heading: string,
  questions: PaperDocQuestion[],
): PaperDocSection {
  return {
    type,
    title: heading,
    heading,
    instruction: null,
    questions,
    summary: summarizeSection(
      type,
      questions.map((q) => q.marks),
      null,
    ),
    chapter: null,
    chapterHeading: null,
    newPage: false,
  };
}

const sq = question({ id: "sq-1", question: "SQ প্রশ্নের টেক্সট", marks: 2 });
const mcq = question({
  id: "mcq-1",
  label: "০২।",
  type: "MCQ",
  section: "MCQ",
  question: "MCQ প্রশ্নের টেক্সট",
  options: [
    { label: "ক", text: "এক" },
    { label: "খ", text: "দুই" },
    { label: "গ", text: "তিন" },
    { label: "ঘ", text: "চার" },
  ],
  marks: 1,
});
const cq = question({
  id: "cq-1",
  label: "০৩।",
  type: "CQ",
  section: "CQ",
  question: null,
  stem: ["উদ্দীপক"],
  parts: [
    { label: "ক", marks: 1, text: "ক অংশ", answer: null },
    { label: "খ", marks: 2, text: "খ অংশ", answer: null },
    { label: "গ", marks: 3, text: "গ অংশ", answer: null },
    { label: "ঘ", marks: 4, text: "ঘ অংশ", answer: null },
  ],
  marks: 10,
});

const sets: PaperDocSet[] = [
  {
    name: "ক",
    totalMarks: 13,
    sections: [
      section("SQ", "খ-বিভাগ — সংক্ষিপ্ত প্রশ্ন (SQ): ১ × ২ = ২", [sq]),
      section("MCQ", "বহুনির্বাচনী প্রশ্ন (MCQ): ১ × ১ = ১", [mcq]),
      section("CQ", "ক-বিভাগ — সৃজনশীল প্রশ্ন (CQ): ১ × ১০ = ১০", [cq]),
    ],
  },
];

function articleFor(html: string, kind: "sq" | "mcq" | "cq"): string {
  const match = html.match(
    new RegExp(`<article[^>]*paper-question-${kind}[^>]*>[\\s\\S]*?</article>`),
  );
  return match?.[0] ?? "";
}

describe("printed paper marks", () => {
  const html = renderToStaticMarkup(<PaperDocument meta={meta} sets={sets} />);

  it("prints no per-question marks label for SQ or MCQ", () => {
    const sqHtml = articleFor(html, "sq");
    const mcqHtml = articleFor(html, "mcq");
    expect(sqHtml).toContain("SQ প্রশ্নের টেক্সট");
    expect(sqHtml).not.toContain("paper-marks");
    expect(sqHtml).not.toMatch(/\[[০-৯]+\]/);
    expect(mcqHtml).toContain("MCQ প্রশ্নের টেক্সট");
    expect(mcqHtml).not.toContain("paper-marks");
    expect(mcqHtml).not.toMatch(/\[[০-৯]+\]/);
  });

  it("keeps the CQ part marks and the four printed options", () => {
    const cqHtml = articleFor(html, "cq");
    expect(cqHtml.match(/paper-marks/g)).toHaveLength(4);
    expect(cqHtml).toContain("[১]");
    expect(articleFor(html, "mcq").match(/class="paper-mcq-option"/g)).toHaveLength(4);
    // The correct option never reaches the print document.
    expect(html).not.toContain("উত্তর");
  });
});
