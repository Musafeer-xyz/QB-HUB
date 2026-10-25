import { PaperBuilder } from "@/components/builder/paper-builder";

export const dynamic = "force-dynamic";

/** A host without Chromium (`VERCEL`) has no server PDF: the builder prints instead. */
export default function NewPaperPage() {
  return <PaperBuilder canRenderPdf={!process.env.VERCEL} />;
}
