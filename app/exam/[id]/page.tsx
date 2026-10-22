import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { ExamClient } from "./exam-client";

export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Public page: service-role read of one exam, no other data exposed.
  const store = await getStore({ system: true });
  const exam = await store.getExam(id);
  if (!exam) notFound();

  return <ExamClient examId={id} exam={exam} />;
}
