import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { deadlineAt, publicQuestions, seededQuestionOrder } from "@/lib/exams";

/**
 * Start an exam attempt (public, no login required).
 *
 * RLS gives students no access to `exams`/`attempts`/`questions`, so this runs
 * with the service-role store: the exam is open, the attempt is created with a
 * server timestamp, and the answer key is stripped from the payload.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const studentName = typeof body.studentName === "string" ? body.studentName.trim() : "";
    const studentId =
      typeof body.studentId === "string" && body.studentId.trim().length > 0
        ? body.studentId.trim()
        : null;

    if (!studentName) {
      return NextResponse.json({ error: "নাম প্রয়োজন।" }, { status: 400 });
    }

    const store = await getStore({ system: true });
    const exam = await store.getExam(id);
    if (!exam) return NextResponse.json({ error: "এক্সাম পাওয়া যায়নি।" }, { status: 404 });
    if (!exam.isOpen) {
      return NextResponse.json({ error: "এই এক্সামটি এখন বন্ধ।" }, { status: 403 });
    }

    const questions = await store.getExamQuestions(id);
    if (questions.length === 0) {
      return NextResponse.json({ error: "এই এক্সামে কোনো প্রশ্ন নেই।" }, { status: 400 });
    }

    const startedAt = new Date().toISOString();
    const attempt = await store.createAttempt({
      examId: id,
      studentName,
      studentId,
      startedAt,
      submittedAt: null,
      answers: {},
    });

    return NextResponse.json({
      attemptId: attempt.id,
      exam: { id: exam.id, title: exam.title, durationMin: exam.durationMin },
      startedAt,
      deadlineAt: deadlineAt(startedAt, exam.durationMin),
      questions: publicQuestions(seededQuestionOrder(questions, attempt.id)),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "এক্সাম শুরু করা যায়নি।" },
      { status: 500 },
    );
  }
}
