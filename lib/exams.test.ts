import { describe, expect, it } from "vitest";
import {
  EXAM_GRACE_MS,
  attemptsCsv,
  examQuestionProblems,
  gradeAnswers,
  groupOpenExams,
  hasProblems,
  isExpired,
  publicQuestions,
  remainingSeconds,
  submitDecision,
} from "./exams";
import { examRowFromRecord, mapAttempt, mapExam } from "./data/supabase-store";
import type { AttemptRecord, ExamQuestion, ExamRecord, QuestionRecord } from "./types";

const T0 = Date.parse("2026-05-01T09:00:00.000Z");

function exam(patch: Partial<ExamRecord> = {}): ExamRecord {
  return {
    id: "exam-1",
    title: "মোলের ধারণা",
    subject: "chemistry",
    chapter: 6,
    questionIds: ["q1", "q2", "q3"],
    durationMin: 30,
    isOpen: true,
    createdAt: "2026-05-01T08:00:00.000Z",
    ...patch,
  };
}

function attempt(patch: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    id: "attempt-1",
    examId: "exam-1",
    studentName: "শিক্ষার্থী",
    studentId: null,
    startedAt: new Date(T0).toISOString(),
    submittedAt: null,
    answers: {},
    score: 0,
    total: 0,
    ...patch,
  };
}

function question(id: string, correctOption: string | null): ExamQuestion {
  return {
    id,
    question: `প্রশ্ন ${id}`,
    stem: [],
    options: [
      { label: "ক", text: "এক" },
      { label: "খ", text: "দুই" },
      { label: "গ", text: "তিন" },
      { label: "ঘ", text: "চার" },
    ],
    correctOption,
  };
}

describe("grading", () => {
  const questions = [question("q1", "ক"), question("q2", "খ"), question("q3", "গ")];

  it("counts only answers that match the stored key", () => {
    expect(gradeAnswers(questions, { q1: "ক", q2: "গ", q3: "গ" })).toEqual({ score: 2, total: 3 });
  });

  it("treats missing, empty and unknown ids as wrong without inflating the total", () => {
    expect(gradeAnswers(questions, { q1: "", q3: "গ", extra: "ক" })).toEqual({ score: 1, total: 3 });
  });

  it("never awards a point when the key is missing", () => {
    expect(gradeAnswers([question("q1", null)], { q1: "ক" })).toEqual({ score: 0, total: 1 });
  });
});

describe("timer and grace", () => {
  const startedAt = new Date(T0).toISOString();

  it("is not expired up to deadline + grace, and expired one ms after", () => {
    const deadline = T0 + 30 * 60_000;
    expect(isExpired(startedAt, 30, deadline)).toBe(false);
    expect(isExpired(startedAt, 30, deadline + EXAM_GRACE_MS)).toBe(false);
    expect(isExpired(startedAt, 30, deadline + EXAM_GRACE_MS + 1)).toBe(true);
  });

  it("reports remaining seconds and never goes negative", () => {
    expect(remainingSeconds(startedAt, 30, T0)).toBe(1800);
    expect(remainingSeconds(startedAt, 30, T0 + 29 * 60_000)).toBe(60);
    expect(remainingSeconds(startedAt, 30, T0 + 60 * 60_000)).toBe(0);
  });
});

describe("submission decision", () => {
  it("grades a submit inside the window", () => {
    expect(submitDecision(attempt(), exam(), T0 + 60_000)).toEqual({ action: "grade" });
  });

  it("auto-submits what is stored once the grace window is over", () => {
    const late = T0 + 30 * 60_000 + EXAM_GRACE_MS + 1;
    expect(submitDecision(attempt(), exam(), late)).toEqual({ action: "auto-submit" });
  });

  it("allows only one submission per attempt", () => {
    const submitted = attempt({ submittedAt: new Date(T0 + 60_000).toISOString() });
    expect(submitDecision(submitted, exam(), T0 + 61_000)).toEqual({
      action: "already-submitted",
    });
  });
});

describe("student payload", () => {
  it("has no correct_option before submission", () => {
    const payload = publicQuestions([question("q1", "ক"), question("q2", "খ")]);
    const json = JSON.stringify(payload);
    expect(json).not.toContain("correctOption");
    expect(json).not.toContain("correct_option");
    expect(payload[0]).toEqual({
      id: "q1",
      question: "প্রশ্ন q1",
      stem: [],
      options: question("q1", "ক").options,
    });
  });
});

describe("exam creation checks", () => {
  function record(id: string, type: QuestionRecord["type"], correctOption: string | null) {
    return { id, type, correctOption } as Pick<QuestionRecord, "id" | "type" | "correctOption">;
  }

  it("rejects MCQs without a correct option and names them", () => {
    const problems = examQuestionProblems(["q1", "q2", "q3"], [
      record("q1", "MCQ", "ক"),
      record("q2", "MCQ", null),
      record("q3", "MCQ", null),
    ]);
    expect(problems.noAnswer).toEqual(["q2", "q3"]);
    expect(hasProblems(problems)).toBe(true);
  });

  it("rejects missing and non-MCQ questions", () => {
    const problems = examQuestionProblems(["q1", "q2", "q3"], [
      null,
      record("q2", "CQ", null),
      record("q3", "MCQ", "খ"),
    ]);
    expect(problems.missing).toEqual(["q1"]);
    expect(problems.notMcq).toEqual(["q2"]);
    expect(hasProblems(problems)).toBe(true);
  });

  it("accepts a selection of answered MCQs", () => {
    const problems = examQuestionProblems(["q1"], [record("q1", "MCQ", "ঘ")]);
    expect(hasProblems(problems)).toBe(false);
  });
});

describe("row <-> record mapping", () => {
  it("maps an exams row to a record and back", () => {
    const record = exam();
    const row = { ...examRowFromRecord(record), id: record.id, created_at: record.createdAt };
    expect(mapExam(row)).toEqual(record);
  });

  it("maps an attempts row to a record", () => {
    const row = {
      id: "attempt-1",
      exam_id: "exam-1",
      student_name: "শিক্ষার্থী",
      student_id: "৭",
      started_at: "2026-05-01T09:00:00.000Z",
      submitted_at: "2026-05-01T09:20:00.000Z",
      answers: { q1: "ক" },
      score: 1,
      total: 3,
    };
    expect(mapAttempt(row)).toEqual({
      id: "attempt-1",
      examId: "exam-1",
      studentName: "শিক্ষার্থী",
      studentId: "৭",
      startedAt: "2026-05-01T09:00:00.000Z",
      submittedAt: "2026-05-01T09:20:00.000Z",
      answers: { q1: "ক" },
      score: 1,
      total: 3,
    });
  });
});

describe("grouping open exams", () => {
  it("groups by subject then chapter, skipping closed exams", () => {
    const groups = groupOpenExams([
      exam({ id: "b", subject: "chemistry", chapter: 7, title: "ch7" }),
      exam({ id: "a", subject: "chemistry", chapter: 6, title: "ch6" }),
      exam({ id: "c", subject: "physics", chapter: 1, title: "phy" }),
      exam({ id: "d", subject: "chemistry", chapter: 8, isOpen: false }),
    ]);
    expect(groups.map((g) => g.subject)).toEqual(["chemistry", "physics"]);
    expect(groups[0]!.chapters.map((c) => c.chapter)).toEqual([6, 7]);
    expect(groups[0]!.chapters[0]!.exams.map((e) => e.id)).toEqual(["a"]);
    expect(groups[1]!.chapters[0]!.exams.map((e) => e.id)).toEqual(["c"]);
  });

  it("returns nothing when every exam is closed", () => {
    expect(groupOpenExams([exam({ isOpen: false })])).toEqual([]);
  });
});

describe("results CSV", () => {
  it("sorts by score and quotes names containing commas", () => {
    const csv = attemptsCsv([
      attempt({ id: "low", studentName: "ক", score: 1, total: 3, submittedAt: "2026-05-01T09:10:00.000Z" }),
      attempt({
        id: "high",
        studentName: "খ, ঢাকা",
        studentId: "৭",
        score: 3,
        total: 3,
        submittedAt: "2026-05-01T09:20:00.000Z",
      }),
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,ID,Score,Total,Submitted At");
    expect(lines[1]).toBe('"খ, ঢাকা",৭,3,3,2026-05-01T09:20:00.000Z');
    expect(lines[2]).toBe("ক,,1,3,2026-05-01T09:10:00.000Z");
  });
});
