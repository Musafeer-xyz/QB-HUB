import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { PaperBuilder } from "@/components/builder/paper-builder";

export const dynamic = "force-dynamic";

export default async function EditPaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const paper = await store.getPaper(id);
  if (!paper) notFound();
  return <PaperBuilder initial={paper} canRenderPdf={!process.env.VERCEL} />;
}
