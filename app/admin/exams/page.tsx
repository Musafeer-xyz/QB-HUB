import { redirect } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { isAdminUser, getAuthUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import { ExamList } from "./exam-list";

export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  if (!isLocalMode()) {
    const user = await getAuthUser();
    if (!user) redirect("/admin");
    if (!(await isAdminUser())) redirect("/admin");
  }

  const store = await getStore();
  const exams = await store.listExams();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">এক্সাম তালিকা</h1>
        <a href="/admin/bank" className="btn-secondary">
          ব্যাংকে যান
        </a>
      </div>
      <ExamList exams={exams} />
    </div>
  );
}
