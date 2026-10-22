import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { isAdminUser, getAuthUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";
import { examQuestionProblems, hasProblems, problemsMessage } from "@/lib/exams";

/**
 * List all exams (admin only).
 */
export async function GET() {
  if (!isLocalMode()) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "লগইন প্রয়োজন।" }, { status: 401 });
    if (!(await isAdminUser())) return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 403 });
  }

  try {
    const store = await getStore();
    const exams = await store.listExams();
    return NextResponse.json({ exams });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "এক্সাম লোড করা যায়নি।" },
      { status: 500 },
    );
  }
}

/**
 * Create a new exam (admin only).
 */
export async function POST(req: Request) {
  if (!isLocalMode()) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "লগইন প্রয়োজন।" }, { status: 401 });
    if (!(await isAdminUser())) return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, subject, chapter, questionIds, durationMin } = body;

    // Validate
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "শিরোনাম প্রয়োজন।" }, { status: 400 });
    }
    if (!subject || typeof subject !== "string") {
      return NextResponse.json({ error: "বিষয় প্রয়োজন।" }, { status: 400 });
    }
    if (!chapter || typeof chapter !== "number") {
      return NextResponse.json({ error: "অধ্যায় প্রয়োজন।" }, { status: 400 });
    }
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ error: "প্রশ্ন আইডি প্রয়োজন।" }, { status: 400 });
    }
    if (!durationMin || typeof durationMin !== "number" || durationMin <= 0) {
      return NextResponse.json({ error: "সময়সীমা প্রয়োজন।" }, { status: 400 });
    }

    // Reject non-MCQ picks and MCQs without an answer key, naming them.
    const store = await getStore();
    const ids = questionIds as string[];
    const questions = await Promise.all(ids.map((id) => store.getQuestion(id)));
    const problems = examQuestionProblems(ids, questions);
    if (hasProblems(problems)) {
      return NextResponse.json({ error: problemsMessage(problems) }, { status: 400 });
    }

    const exam = await store.createExam({
      title,
      subject,
      chapter,
      questionIds,
      durationMin,
      isOpen: false,
    });

    return NextResponse.json({ exam });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "এক্সাম তৈরি করা যায়নি।" },
      { status: 500 },
    );
  }
}
