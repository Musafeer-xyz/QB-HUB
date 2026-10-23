import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { deadlineAt, publicQuestions, remainingSeconds, seededQuestionOrder } from "@/lib/exams";

/**
 * Resume an attempt (public, no login required; the attempt id is the token).
 *
 * Submitted attempts return the full result, including the answer key, because
 * the result screen legitimately shows correct answers. In-progress attempts
 * return the questions without the key plus the server-computed deadline, so a
 * refresh continues the same attempt with the time already used.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = await getStore({ system: true });
    const attempt = await store.getAttempt(id);
    if (!attempt) {
      return NextResponse.json({ error: "অ্যাটেম্পট পাওয়া যায়নি।" }, { status: 404 });
    }

    if (attempt.submittedAt) {
      const result = await store.getAttemptResult(id);
      if (!result) return NextResponse.json({ error: "ফলাফল পাওয়া যায়নি।" }, { status: 404 });
      return NextResponse.json({ submitted: true, result });
    }

    const exam = await store.getExam(attempt.examId);
    if (!exam) {
      return NextResponse.json({ error: "এক্সাম পাওয়া যায়নি।" }, { status: 404 });
    }
    const questions = await store.getExamQuestions(exam.id);

    return NextResponse.json({
      submitted: false,
      attemptId: attempt.id,
      studentName: attempt.studentName,
      studentId: attempt.studentId,
      startedAt: attempt.startedAt,
      deadlineAt: deadlineAt(attempt.startedAt, exam.durationMin),
      remainingSeconds: remainingSeconds(attempt.startedAt, exam.durationMin),
      exam: { id: exam.id, title: exam.title, durationMin: exam.durationMin },
      answers: attempt.answers,
      questions: publicQuestions(seededQuestionOrder(questions, attempt.id)),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "অ্যাটেম্পট লোড করা যায়নি।" },
      { status: 500 },
    );
  }
}
