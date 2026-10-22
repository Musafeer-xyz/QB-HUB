import { notFound, redirect } from "next/navigation";
import { PaperDocument } from "@/components/paper/paper-document";
import { PrintToolbar } from "@/components/print/print-toolbar";
import { PrintAuto } from "@/components/print/print-auto";
import { getStore } from "@/lib/data/store";
import { isLocalMode } from "@/lib/mode";
import { questionImageUrl } from "@/lib/images";
import { availableImageFiles } from "@/lib/images-server";
import { buildPaperDoc, subjectLabel } from "@/lib/paper/model";
import { paperDims } from "@/lib/paper/sizes";
import { verifyPrintToken } from "@/lib/print-token";
import type { PaperRecord, QuestionRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

async function loadPaper(id: string, system: boolean): Promise<{ paper: PaperRecord; questions: Map<string, QuestionRecord> } | null> {
  const store = await getStore({ system });
  const paper = await store.getPaper(id);
  if (!paper) return null;
  const questions = new Map<string, QuestionRecord>();
  for (const pq of paper.questions) {
    const q = await store.getQuestion(pq.questionId);
    if (q) questions.set(q.id, q);
  }
  return { paper, questions };
}

/**
 * Clean print view (also what the PDF renderer opens). Accessible with an
 * admin session, or with the short-lived signed token used by /api/pdf.
 *
 * It is the only page that prints a paper: the builder's “দ্রুত প্রিন্ট”
 * button opens this URL, so window.print() and the server PDF share the exact
 * same DOM, the same @page rule and the same settings.
 *
 * Query flags: `?t=` print token, `?print=1` auto-open the print dialog,
 * `?guide=1` show the margin guide.
 */
export default async function PrintPaperPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const token = typeof sp["t"] === "string" ? sp["t"] : null;
  const autoPrint = sp["print"] === "1";
  const showGuide = sp["guide"] === "1";

  /** Anonymous store reads can fail on RLS; treat that as "not authorised". */
  const tryLoad = async (system: boolean) => {
    try {
      return await loadPaper(id, system);
    } catch {
      return null;
    }
  };

  let loaded = await tryLoad(false);

  if (!loaded && !isLocalMode()) {
    if (!verifyPrintToken(id, token)) redirect(`/login?next=${encodeURIComponent(`/print/${id}`)}`);
    loaded = await tryLoad(true);
  }
  if (!loaded && isLocalMode()) notFound();
  if (!loaded) notFound();

  const { paper, questions } = loaded;
  const imageFiles = await availableImageFiles(
    [...questions.values()].map((q) => q.imagePath).filter((p): p is string => Boolean(p)),
  );
  const items = paper.questions
    .map((pq) => {
      const question = questions.get(pq.questionId);
      if (!question) return null;
      const section =
        pq.section === "CQ" || pq.section === "SQ" || pq.section === "MCQ" ? pq.section : null;
      return { question, selectedParts: pq.selectedParts, section };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const model = buildPaperDoc(
    items,
    paper.settings,
    {
      institute: paper.institute,
      logoSrc: paper.settings.logoUrl ? questionImageUrl(paper.settings.logoUrl) : null,
      examName: paper.examName,
      className: paper.className,
      subjectLabel: subjectLabel(paper.subject),
      date: paper.settings.date,
      time: paper.settings.time,
      durationMinutes: paper.durationMinutes,
      totalMarks: paper.totalMarks,
      instructions: paper.settings.instructions,
    },
    {
      imageSrc: (p) => questionImageUrl(p) ?? "",
      imageAvailable: (_id, imagePath) => (imagePath ? imageFiles.has(imagePath) : false),
    },
  );

  const { margins, paperSize } = model.meta;
  const frameStyle = {
    "--paper-margin-top": `${margins.top}mm`,
    "--paper-margin-right": `${margins.right}mm`,
    "--paper-margin-bottom": `${margins.bottom}mm`,
    "--paper-margin-left": `${margins.left}mm`,
  } as React.CSSProperties;

  return (
    <div className="print-scaffold min-h-screen bg-slate-200">
      <PrintToolbar title={paper.title} paperSize={paperSize} margins={margins} />
      <div
        className={`paper-frame ${paperDims(paperSize).cssClass}`}
        style={frameStyle}
        data-print-frame
      >
        {showGuide ? <div className="paper-margin-guide no-print" aria-hidden="true" /> : null}
        <PaperDocument meta={model.meta} sets={model.sets} />
      </div>
      {autoPrint ? <PrintAuto /> : null}
    </div>
  );
}
