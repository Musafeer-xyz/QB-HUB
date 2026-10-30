import { describe, expect, it } from "vitest";
import {
  EXAM_GRACE_MS,
  OLD_ATTEMPTS_DAYS,
  attemptQuestionRows,
  attemptTime,
  attemptsCsv,
  attemptsOlderThanCutoff,
  oldAttemptIds,
  examQuestionProblems,
  gradeAnswers,
  examCount,
  examTabs,
  groupOpenExams,
  groupOpenExamsBySection,
  hasProblems,
  pickExamBankSubject,
  selectedExamTab,
  isExpired,
  publicQuestions,
  remainingSeconds,
  seededQuestionOrder,
  submitDecision,
} from "./exams";
import { examRowFromRecord, mapAttempt, mapExam } from "./data/supabase-store";
import type { AttemptRecord, ExamQuestion, ExamRecord, QuestionRecord } from "./types";

const T0 = Date.parse("2026-05-01T09:00:00.000Z");

const REGISTERED = ["chemistry", "physics", "math", "biology"];

describe("new-exam bank target", () => {
  it("keeps the active subject when it has MCQs", () => {
    expect(pickExamBankSubject("math", REGISTERED, { chemistry: 40, math: 3 })).toBe("math");
  });

  it("falls back to the first subject that has MCQs", () => {
    expect(pickExamBankSubject("biology", REGISTERED, { chemistry: 40, physics: 0 })).toBe("chemistry");
  });

  it("keeps the active subject when no subject has an MCQ", () => {
    expect(pickExamBankSubject("physics", REGISTERED, { chemistry: 0, physics: 0 })).toBe("physics");
  });
});

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

describe("admin per-question review", () => {
  const questions = [question("q1", "ক"), question("q2", "খ"), question("q3", "গ")];

  it("keeps exam order and marks each choice right or wrong", () => {
    const rows = attemptQuestionRows(questions, { q1: "ক", q2: "গ", q3: "গ" });
    expect(rows.map((r) => [r.id, r.studentAnswer, r.isCorrect])).toEqual([
      ["q1", "ক", true],
      ["q2", "গ", false],
      ["q3", "গ", true],
    ]);
  });

  it("reports unanswered questions as null, never as a wrong option", () => {
    const rows = attemptQuestionRows(questions, { q1: "", q3: "গ" });
    expect(rows[0]!.studentAnswer).toBeNull();
    expect(rows[0]!.isCorrect).toBe(false);
    expect(rows[1]!.studentAnswer).toBeNull();
    expect(rows[2]!.isCorrect).toBe(true);
  });

  it("agrees with gradeAnswers on the number of correct answers", () => {
    const answers = { q1: "ক", q2: "খ", q3: "ঘ" };
    const correct = attemptQuestionRows(questions, answers).filter((r) => r.isCorrect).length;
    expect(correct).toBe(gradeAnswers(questions, answers).score);
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

describe("old attempt cleanup", () => {
  const now = Date.parse("2026-05-20T00:00:00.000Z");

  it("cuts off exactly N days before now", () => {
    expect(attemptsOlderThanCutoff(OLD_ATTEMPTS_DAYS, now)).toBe("2026-05-05T00:00:00.000Z");
    expect(attemptsOlderThanCutoff(1, now)).toBe("2026-05-19T00:00:00.000Z");
  });

  it("uses startedAt while an attempt is unsubmitted", () => {
    expect(attemptTime({ submittedAt: null, startedAt: "2026-05-01T00:00:00.000Z" })).toBe(
      "2026-05-01T00:00:00.000Z",
    );
    expect(attemptTime({ submittedAt: "2026-05-02T00:00:00.000Z", startedAt: "2026-05-01T00:00:00.000Z" })).toBe(
      "2026-05-02T00:00:00.000Z",
    );
  });

  it("picks only attempts strictly before the cutoff", () => {
    const attempts = [
      attempt({ id: "old-submitted", submittedAt: "2026-05-04T00:00:00.000Z" }),
      attempt({ id: "old-unsubmitted", submittedAt: null, startedAt: "2026-05-04T00:00:00.000Z" }),
      attempt({ id: "fresh", submittedAt: "2026-05-19T00:00:00.000Z" }),
      attempt({ id: "edge", submittedAt: "2026-05-05T00:00:00.000Z" }),
    ];
    expect(oldAttemptIds(attempts, "2026-05-05T00:00:00.000Z")).toEqual([
      "old-submitted",
      "old-unsubmitted",
    ]);
  });

  it("ignores unparseable timestamps and cutoffs", () => {
    expect(oldAttemptIds([attempt({ submittedAt: "not-a-date" })], "2026-05-05T00:00:00.000Z")).toEqual([]);
    expect(oldAttemptIds([attempt()], "nonsense")).toEqual([]);
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

/**
 * The student start payload is `{ attemptId, exam{id,title,durationMin},
 * startedAt, deadlineAt, questions }` (app/api/exams/[id]/start/route.ts),
 * where `questions` is exactly `publicQuestions(store.getExamQuestions())`.
 * These tests feed the hostile case — rows that still carry the key — through
 * that transformation and scan the whole serialized payload at any depth.
 */
describe("student start payload never leaks answers", () => {
  const forbidden = ["correct_option", "correctOption", "answer", "explanation", "explains"];

  function keyNamesDeep(value: unknown, acc: string[] = []): string[] {
    if (Array.isArray(value)) {
      for (const item of value) keyNamesDeep(item, acc);
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        acc.push(key);
        keyNamesDeep(child, acc);
      }
    }
    return acc;
  }

  const leaked = {
    ...question("q1", "ক"),
    answer: "ক",
    explanation: "কারণ ক সঠিক",
    correct_option: "ক",
  } as ExamQuestion;

  it("drops the key fields from every question, at any depth", () => {
    const payload = {
      attemptId: "attempt-1",
      exam: { id: "exam-1", title: "মোলের ধারণা", durationMin: 30 },
      startedAt: new Date(T0).toISOString(),
      deadlineAt: T0 + 30 * 60_000,
      questions: publicQuestions([leaked]),
    };

    const keys = keyNamesDeep(payload);
    for (const name of forbidden) expect(keys).not.toContain(name);

    const json = JSON.stringify(payload);
    for (const name of forbidden) expect(json).not.toContain(name);
  });

  it("keeps only id, question, stem and options on a student question", () => {
    const [only] = publicQuestions([leaked]);
    expect(Object.keys(only!).sort()).toEqual(["id", "options", "question", "stem"]);
    expect(only!.options?.every((o) => Object.keys(o).sort().join(",") === "label,text")).toBe(true);
  });
});

describe("groupOpenExamsBySection", () => {
  it("keeps the fixed subject order, empty sections, and an other bucket", () => {
    const sections = groupOpenExamsBySection([
      exam({ id: "e2", subject: "Higher Math", chapter: 1 }),
      exam({ id: "e1", subject: "chemistry", chapter: 6 }),
      exam({ id: "e3", subject: "biology", chapter: 2 }),
      exam({ id: "closed", subject: "chemistry", chapter: 6, isOpen: false }),
    ]);

    expect(sections.map((s) => s.section.id)).toEqual([
      "chemistry",
      "physics",
      "math",
      "higher-math",
      "other",
    ]);
    expect(sections[0]!.chapters.flatMap((c) => c.exams.map((e) => e.id))).toEqual(["e1"]);
    expect(sections[1]!.chapters).toEqual([]);
    expect(sections[3]!.chapters[0]!.exams.map((e) => e.id)).toEqual(["e2"]);
    expect(sections[4]!.chapters[0]!.exams.map((e) => e.id)).toEqual(["e3"]);
  });
});

describe("public exam list tabs", () => {
  const sections = groupOpenExamsBySection([
    exam({ id: "e1", subject: "chemistry", chapter: 6 }),
    exam({ id: "e2", subject: "chemistry", chapter: 7 }),
    exam({ id: "e3", subject: "math", chapter: 2 }),
  ]);

  it("hides the other bucket while it is empty and shows it when it has exams", () => {
    expect(examTabs(sections).map((t) => t.section.id)).toEqual([
      "chemistry",
      "physics",
      "math",
      "higher-math",
    ]);

    const withOther = groupOpenExamsBySection([
      exam({ id: "e1", subject: "chemistry", chapter: 6 }),
      exam({ id: "e9", subject: "ict", chapter: 1 }),
    ]);
    expect(examTabs(withOther).map((t) => t.section.id)).toContain("other");
  });

  it("counts every exam of a section across its chapters", () => {
    const byId = Object.fromEntries(sections.map((t) => [t.section.id, examCount(t)]));
    expect(byId["chemistry"]).toBe(2);
    expect(byId["math"]).toBe(1);
    expect(byId["physics"]).toBe(0);
  });

  it("selects the requested tab, even when that subject has no exams", () => {
    expect(selectedExamTab(sections, "math")?.section.id).toBe("math");
    const empty = selectedExamTab(sections, "physics");
    expect(empty?.section.id).toBe("physics");
    expect(empty?.chapters).toEqual([]);
  });

  it("defaults to the first subject that has exams", () => {
    expect(selectedExamTab(sections, null)?.section.id).toBe("chemistry");
    // A junk or stale parameter never blanks the page.
    expect(selectedExamTab(sections, "nope")?.section.id).toBe("chemistry");
    // With chemistry empty, the first populated subject wins.
    const mathOnly = groupOpenExamsBySection([exam({ id: "e3", subject: "math", chapter: 2 })]);
    expect(selectedExamTab(mathOnly, undefined)?.section.id).toBe("math");
  });
});

describe("seededQuestionOrder", () => {
  const withStem = (id: string, stem: string[] = []) => ({ ...question(id, "ক"), stem });
  const questions = [
    withStem("q1", ["উদ্দীপক ১"]),
    withStem("q2", ["উদ্দীপক ১"]),
    withStem("q3", ["উদ্দীপক ২"]),
    withStem("q4", ["উদ্দীপক ২"]),
    withStem("q5"),
    withStem("q6"),
    withStem("q7"),
    withStem("q8"),
    withStem("q9"),
    withStem("q10"),
    withStem("q11"),
    withStem("q12"),
  ];

  it("gives the same attempt the same order and different attempts different orders", () => {
    const a = seededQuestionOrder(questions, "attempt-a").map((q) => q.id);
    const again = seededQuestionOrder(questions, "attempt-a").map((q) => q.id);
    const b = seededQuestionOrder(questions, "attempt-b").map((q) => q.id);
    expect(again).toEqual(a);
    expect(b).not.toEqual(a);
  });

  it("keeps stem groups contiguous in their original order and loses nothing", () => {
    const order = seededQuestionOrder(questions, "attempt-a").map((q) => q.id);
    expect([...order].sort()).toEqual(questions.map((q) => q.id).sort());
    expect(new Set(order).size).toBe(order.length);
    expect(order.indexOf("q2") - order.indexOf("q1")).toBe(1);
    expect(order.indexOf("q4") - order.indexOf("q3")).toBe(1);
  });
});
