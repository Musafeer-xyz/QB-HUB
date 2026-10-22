import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { gradeAnswers, submitDecision } from "@/lib/exams";

/**
 * Submit an attempt (public, no login required).
 *
 * The server owns the timer and the grading: answers are graded here, an
 * attempt can be submitted once, and a submit that arrives after
 * duration + grace closes the attempt using the answers already stored on the
 * server instead of accepting the late payload.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const store = await getStore({ system: true });

    const attempt = await store.getAttempt(id);
    if (!attempt) {
      return NextResponse.json({ error: "অ্যাটেম্পট পাওয়া যায়নি।" }, { status: 404 });
    }
    const exam = await store.getExam(attempt.examId);
    if (!exam) {
      return NextResponse.json({ error: "এক্সাম পাওয়া যায়নি।" }, { status: 404 });
    }

    const decision = submitDecision(attempt, exam);
    if (decision.action === "already-submitted") {
      return NextResponse.json({ error: "এই অ্যাটেম্পট ইতিমধ্যে জমা দেওয়া হয়েছে।" }, { status: 409 });
    }

    const submitted = body.answers;
    if (decision.action === "grade" && (typeof submitted !== "object" || submitted === null)) {
      return NextResponse.json({ error: "উত্তর প্রয়োজন।" }, { status: 400 });
    }

    const answers: Record<string, string> =
      decision.action === "auto-submit"
        ? attempt.answers
        : Object.fromEntries(
            Object.entries(submitted as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string",
            ),
          );

    const questions = await store.getExamQuestions(exam.id);
    const { score, total } = gradeAnswers(questions, answers);

    await store.updateAttempt(id, {
      submittedAt: new Date().toISOString(),
      answers,
      score,
      total,
    });

    const result = await store.getAttemptResult(id);
    if (!result) return NextResponse.json({ error: "ফলাফল পাওয়া যায়নি।" }, { status: 500 });

    return NextResponse.json({
      result,
      expired: decision.action === "auto-submit",
      ...(decision.action === "auto-submit"
        ? { message: "সময়সীমা শেষ, তাই সংরক্ষিত উত্তর জমা দেওয়া হয়েছে।" }
        : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "জমা দেওয়া যায়নি।" },
      { status: 500 },
    );
  }
}
