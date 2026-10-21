import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { QuestionForm } from "@/components/bank/question-form";

export const dynamic = "force-dynamic";

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const question = await store.getQuestion(decodeURIComponent(id));
  if (!question) notFound();
  return <QuestionForm initial={question} />;
}
