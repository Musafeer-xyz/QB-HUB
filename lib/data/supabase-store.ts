import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { makeFlagId, parseFlags } from "@/lib/schemas/question";
import { paperSettingsSchema } from "@/lib/schemas/paper";
import { collectMathErrors, questionTextFields } from "@/lib/render/rich-text";
import { seededQuestionOrder } from "@/lib/exams";
import type { QuestionFormValues, Store } from "@/lib/data/store";
import type {
  AttemptRecord,
  ExamRecord,
  PaperQuestionRecord,
  PaperRecord,
  QuestionFacets,
  QuestionRecord,
  VideoInput,
  VideoRecord,
} from "@/lib/types";
import type { QuestionOption, QuestionType } from "@/lib/schemas/question";

/**
 * Production data source. Every query runs with the caller's session, so
 * Supabase Row Level Security (admins only) is always in effect.
 */

export type QuestionRow = {
  id: string;
  subject: string;
  chapter: number;
  type: string;
  stars: number | null;
  boards: string[] | null;
  question: string | null;
  stem: string[] | null;
  image_path: string | null;
  image_desc: string | null;
  flags: unknown;
  answer: string | null;
  options: QuestionOption[] | null;
  correct_option: string | null;
  /** Printed number/page in the source book (MCQ). */
  source_no?: number | null;
  page?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type PartRow = {
  question_id: string;
  label: string;
  marks: number;
  text: string;
  answer: string | null;
  position: number;
};

type ExamRow = {
  id: string;
  title: string;
  subject: string;
  chapter: number;
  question_ids: string[];
  duration_min: number;
  is_open: boolean;
  created_at: string;
};

type AttemptRow = {
  id: string;
  exam_id: string;
  student_name: string;
  student_id: string | null;
  started_at: string;
  submitted_at: string | null;
  answers: unknown;
  score: number;
  total: number;
};

type VideoRow = {
  id: string;
  subject: string;
  topic: string;
  title: string;
  youtube_id: string;
  position: number;
  published: boolean;
  created_at: string;
};

type PaperRow = {
  id: string;
  title: string;
  institute: string | null;
  exam_name: string | null;
  class_name: string | null;
  subject: string | null;
  duration_minutes: number | null;
  total_marks: number | string | null;
  settings: unknown;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function mapQuestion(row: QuestionRow, parts: PartRow[]): QuestionRecord {
  return {
    id: row.id,
    subject: row.subject,
    chapter: row.chapter,
    type: row.type as QuestionType,
    stars: row.stars,
    boards: row.boards ?? [],
    question: row.question,
    stem: row.stem ?? [],
    imagePath: row.image_path,
    imageDesc: row.image_desc,
    flags: parseFlags(row.flags),
    answer: row.answer,
    options: row.options ?? null,
    correctOption: row.correct_option,
    parts: (parts ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        questionId: p.question_id,
        position: p.position,
        label: p.label,
        marks: p.marks,
        text: p.text,
        answer: p.answer,
      })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPaper(row: PaperRow, questions: PaperQuestionRecord[]): PaperRecord {
  return {
    id: row.id,
    title: row.title,
    institute: row.institute ?? "",
    examName: row.exam_name ?? "",
    className: row.class_name ?? "",
    subject: row.subject ?? "chemistry",
    durationMinutes: row.duration_minutes,
    totalMarks: Number(row.total_marks ?? 0),
    settings: paperSettingsSchema.parse(row.settings ?? {}),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    questions,
  };
}

export function mapExam(row: ExamRow): ExamRecord {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    chapter: row.chapter,
    questionIds: row.question_ids,
    durationMin: row.duration_min,
    isOpen: row.is_open,
    createdAt: row.created_at,
  };
}

export function mapAttempt(row: AttemptRow): AttemptRecord {
  return {
    id: row.id,
    examId: row.exam_id,
    studentName: row.student_name,
    studentId: row.student_id,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    answers: row.answers as Record<string, string>,
    score: row.score,
    total: row.total,
  };
}

export function mapVideo(row: VideoRow): VideoRecord {
  return {
    id: row.id,
    subject: row.subject,
    topic: row.topic ?? "",
    title: row.title,
    youtubeId: row.youtube_id,
    position: Number(row.position ?? 0),
    published: row.published,
    createdAt: row.created_at,
  };
}

/** Video input -> insert row (the inverse of mapVideo). */
export function videoRowFromInput(video: VideoInput) {
  return {
    subject: video.subject,
    topic: video.topic,
    title: video.title,
    youtube_id: video.youtubeId,
    position: video.position,
    published: video.published,
  };
}

/** Exam record -> insert row (the inverse of mapExam). */
export function examRowFromRecord(exam: Omit<ExamRecord, "id" | "createdAt">) {
  return {
    title: exam.title,
    subject: exam.subject,
    chapter: exam.chapter,
    question_ids: exam.questionIds,
    duration_min: exam.durationMin,
    is_open: exam.isOpen,
  };
}

export function questionRowFromForm(values: QuestionFormValues) {
  return {
    id: values.id,
    subject: values.subject,
    chapter: values.chapter,
    type: values.type,
    stars: values.stars,
    boards: values.boards,
    question: values.question,
    stem: values.type === "CQ" || values.type === "MCQ" ? values.stem : [],
    image_path: values.type === "SQ" ? null : values.image,
    image_desc: values.type === "SQ" ? null : values.image_desc,
    answer: values.answer,
    options: values.type === "MCQ" ? values.options : null,
    correct_option: values.type === "MCQ" ? values.correctOption : null,
  };
}

function partRowsFromForm(values: QuestionFormValues) {
  return values.parts.map((p, i) => ({
    question_id: values.id,
    label: p.label,
    marks: p.marks,
    text: p.text,
    answer: p.answer,
    position: i,
  }));
}

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (m) => `\\${m}`);
}

const storeInstances = new Map<boolean, Store>();

export function supabaseStore(opts: { system?: boolean } = {}): Store {
  const system = opts.system === true;
  const cached = storeInstances.get(system);
  if (cached) return cached;

  async function client() {
    const c = system ? createSupabaseAdminClient() : await createSupabaseServerClient();
    if (!c) throw new Error("Supabase কনফিগার করা নেই।");
    return c;
  }

  /** Auto LaTeX flags + preserved manual flags, mirroring the import script. */
  async function computeFlags(
    values: QuestionFormValues,
    existing: QuestionRecord | null,
  ) {
    const texts = questionTextFields({
      question: values.question,
      stem: values.type === "CQ" || values.type === "MCQ" ? values.stem : [],
      parts: values.type === "CQ" ? values.parts : [],
      image_desc: values.image_desc,
    });
    const auto = collectMathErrors(texts).map((text) => ({
      id: makeFlagId(text),
      text,
      createdAt: new Date().toISOString(),
    }));
    const kept = (existing?.flags ?? []).filter(
      (f) => !f.text.startsWith("LaTeX পার্স করা যায়নি") && !auto.some((a) => a.text === f.text),
    );
    return [...auto, ...kept];
  }

  async function loadQuestion(id: string): Promise<QuestionRecord | null> {
    const c = await client();
    const { data, error } = await c
      .from("questions")
      .select("*, question_parts(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as QuestionRow & { question_parts: PartRow[] };
    return mapQuestion(row, row.question_parts ?? []);
  }

  const store: Store = {
    mode: "supabase",

    async listQuestions(query) {
      const c = await client();
      const pageSize = query.pageSize ?? 20;
      const page = Math.max(1, query.page ?? 1);

      let q = c.from("questions").select("*, question_parts(*)", { count: "exact" });
      if (query.subject) q = q.eq("subject", query.subject);
      if (query.chapters && query.chapters.length > 0) q = q.in("chapter", query.chapters);
      if (query.types && query.types.length > 0) q = q.in("type", query.types);
      if (query.boards && query.boards.length > 0) q = q.overlaps("boards", query.boards);
      if (query.stars != null) q = q.eq("stars", query.stars);
      if (query.hasImage) q = q.not("image_path", "is", null);
      if (query.flagged) q = q.neq("flags", "[]");
      if (query.search && query.search.trim()) {
        q = q.ilike("search_text", `%${escapeLike(query.search.trim())}%`);
      }
      const { data, error, count } = await q
        .order("chapter", { ascending: true })
        .order("type", { ascending: true })
        .order("id", { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as (QuestionRow & { question_parts: PartRow[] })[];

      // Facets always reflect the whole bank (chapter/type/board/stars counts).
      const { data: allRows, error: facetError } = await c
        .from("questions")
        .select("id, chapter, type, stars, boards, image_path, flags");
      if (facetError) throw new Error(facetError.message);
      const facets = buildFacetsFromRows((allRows ?? []) as QuestionFacetRow[]);

      return {
        items: rows.map((r) => mapQuestion(r, r.question_parts ?? [])),
        total: count ?? rows.length,
        page,
        pageSize,
        facets,
      };
    },

    getQuestion: loadQuestion,

    async createQuestion(values) {
      const c = await client();
      const existing = await loadQuestion(values.id);
      if (existing) throw new Error(`“${values.id}” ইতিমধ্যে বিদ্যমান।`);
      const flags = await computeFlags(values, null);
      const { error } = await c.from("questions").insert({ ...questionRowFromForm(values), flags });
      if (error) throw new Error(error.message);
      if (values.type === "CQ" && values.parts.length > 0) {
        const { error: partError } = await c.from("question_parts").insert(partRowsFromForm(values));
        if (partError) throw new Error(partError.message);
      }
      const created = await loadQuestion(values.id);
      if (!created) throw new Error("সংরক্ষণের পর প্রশ্ন পাওয়া যায়নি।");
      return created;
    },

    async updateQuestion(id, values) {
      const c = await client();
      const existing = await loadQuestion(id);
      if (!existing) throw new Error(`“${id}” পাওয়া যায়নি।`);
      const flags = await computeFlags(values, existing);
      const { error } = await c
        .from("questions")
        .update({ ...questionRowFromForm(values), flags })
        .eq("id", id);
      if (error) throw new Error(error.message);

      const { error: delError } = await c.from("question_parts").delete().eq("question_id", id);
      if (delError) throw new Error(delError.message);
      if (values.type === "CQ" && values.parts.length > 0) {
        const { error: partError } = await c.from("question_parts").insert(partRowsFromForm(values));
        if (partError) throw new Error(partError.message);
      }
      const updated = await loadQuestion(id);
      if (!updated) throw new Error("হালনাগাদের পর প্রশ্ন পাওয়া যায়নি।");
      return updated;
    },

    async importQuestions(questions) {
      const c = await client();
      if (questions.length === 0) return { inserted: 0, updated: 0 };
      const { data: found, error: findError } = await c
        .from("questions")
        .select("id")
        .in("id", questions.map((q) => q.id));
      if (findError) throw new Error(findError.message);
      const existingIds = new Set((found ?? []).map((row) => row.id as string));

      for (const q of questions) {
        const { error } = await c.from("questions").upsert(
          {
            id: q.id,
            subject: q.subject,
            chapter: q.chapter,
            type: q.type,
            stars: q.stars,
            boards: q.boards,
            question: q.question,
            stem: q.stem,
            image_path: q.image_path,
            image_desc: q.image_desc,
            flags: q.flags,
            answer: q.answer,
            options: q.options,
            correct_option: q.correct_option,
            source_no: q.source_no ?? null,
            page: q.page ?? null,
          },
          { onConflict: "id" },
        );
        if (error) throw new Error(`“${q.id}” সংরক্ষণ ব্যর্থ: ${error.message}`);

        if (q.type === "CQ") {
          const { error: delError } = await c.from("question_parts").delete().eq("question_id", q.id);
          if (delError) throw new Error(`“${q.id}” পার্ট মুছে ফেলা যায়নি: ${delError.message}`);
          if (q.parts.length > 0) {
            const { error: partError } = await c.from("question_parts").insert(
              q.parts.map((p) => ({
                question_id: q.id,
                label: p.label,
                marks: p.marks,
                text: p.text,
                answer: p.answer,
                position: p.position,
              })),
            );
            if (partError) throw new Error(`“${q.id}” পার্ট সংরক্ষণ ব্যর্থ: ${partError.message}`);
          }
        }
      }

      return {
        inserted: questions.filter((q) => !existingIds.has(q.id)).length,
        updated: questions.filter((q) => existingIds.has(q.id)).length,
      };
    },

    async deleteQuestion(id) {
      const c = await client();
      const { error } = await c.from("questions").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async resolveFlag(id, flagId) {
      const existing = await loadQuestion(id);
      if (!existing) throw new Error(`“${id}” পাওয়া যায়নি।`);
      const c = await client();
      const flags = existing.flags.filter((f) => f.id !== flagId);
      const { error } = await c.from("questions").update({ flags }).eq("id", id);
      if (error) throw new Error(error.message);
    },

    async listBoards() {
      const c = await client();
      const { data, error } = await c.from("questions").select("boards");
      if (error) throw new Error(error.message);
      const boards = new Set<string>();
      for (const row of (data ?? []) as { boards: string[] | null }[]) {
        for (const b of row.boards ?? []) boards.add(b);
      }
      return [...boards].sort((a, b) => a.localeCompare(b, "bn"));
    },

    async usedQuestionIds() {
      const c = await client();
      const { data, error } = await c.from("paper_questions").select("question_id");
      if (error) throw new Error(error.message);
      return new Set((data ?? []).map((r) => r.question_id as string));
    },

    async listPapers() {
      const c = await client();
      const { data, error } = await c
        .from("papers")
        .select("*, paper_questions(question_id, position, section, selected_parts)")
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as (PaperRow & { paper_questions: PaperQRow[] })[]).map((row) =>
        mapPaper(
          row,
          (row.paper_questions ?? [])
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((pq) => ({
              questionId: pq.question_id,
              position: pq.position,
              section: (pq.section as QuestionType | null) ?? null,
              selectedParts: pq.selected_parts ?? [],
            })),
        ),
      );
    },

    async getPaper(id) {
      const c = await client();
      const { data, error } = await c
        .from("papers")
        .select(
          "*, paper_questions(question_id, position, section, selected_parts, questions(*, question_parts(label, marks, text, answer, position)))",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const row = data as PaperRow & { paper_questions: PaperQNested[] };
      const questions: PaperQuestionRecord[] = (row.paper_questions ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((pq) => ({
          questionId: pq.question_id,
          position: pq.position,
          section: (pq.section as QuestionType | null) ?? null,
          selectedParts: pq.selected_parts ?? [],
        }));
      return mapPaper(row, questions);
    },

    async createPaper(values, createdBy) {
      const c = await client();
      const { data, error } = await c
        .from("papers")
        .insert({
          title: values.title,
          institute: values.institute,
          exam_name: values.examName,
          class_name: values.className,
          subject: values.subject,
          duration_minutes: values.durationMinutes,
          total_marks: values.totalMarks,
          settings: paperSettingsSchema.parse(values.settings ?? {}),
          created_by: createdBy,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const row = data as PaperRow;
      if (values.questions.length > 0) {
        const { error: pqError } = await c.from("paper_questions").insert(
          values.questions.map((q, i) => ({
            paper_id: row.id,
            question_id: q.questionId,
            position: i,
            section: q.section,
            selected_parts: q.selectedParts,
          })),
        );
        if (pqError) throw new Error(pqError.message);
      }
      const paper = await store.getPaper(row.id);
      if (!paper) throw new Error("সংরক্ষণের পর পেপার পাওয়া যায়নি।");
      return paper;
    },

    async updatePaper(id, values) {
      const c = await client();
      const { error } = await c
        .from("papers")
        .update({
          title: values.title,
          institute: values.institute,
          exam_name: values.examName,
          class_name: values.className,
          subject: values.subject,
          duration_minutes: values.durationMinutes,
          total_marks: values.totalMarks,
          settings: paperSettingsSchema.parse(values.settings ?? {}),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      const { error: delError } = await c.from("paper_questions").delete().eq("paper_id", id);
      if (delError) throw new Error(delError.message);
      if (values.questions.length > 0) {
        const { error: pqError } = await c.from("paper_questions").insert(
          values.questions.map((q, i) => ({
            paper_id: id,
            question_id: q.questionId,
            position: i,
            section: q.section,
            selected_parts: q.selectedParts,
          })),
        );
        if (pqError) throw new Error(pqError.message);
      }
      const paper = await store.getPaper(id);
      if (!paper) throw new Error("হালনাগাদের পর পেপার পাওয়া যায়নি।");
      return paper;
    },

    async deletePaper(id) {
      const c = await client();
      const { error } = await c.from("papers").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async duplicatePaper(id, createdBy) {
      const src = await store.getPaper(id);
      if (!src) throw new Error("পেপার পাওয়া যায়নি।");
      return store.createPaper(
        {
          title: `${src.title} (কপি)`,
          institute: src.institute,
          examName: src.examName,
          className: src.className,
          subject: src.subject,
          durationMinutes: src.durationMinutes,
          totalMarks: src.totalMarks,
          settings: src.settings,
          questions: src.questions.map((q) => ({
            questionId: q.questionId,
            section: q.section,
            selectedParts: q.selectedParts,
          })),
        },
        createdBy,
      );
    },

    // ---------------------------------------------------------------------------
    // Exam methods
    // ---------------------------------------------------------------------------
    async listExams() {
      const c = await client();
      const { data, error } = await c.from("exams").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as ExamRow[]).map(mapExam);
    },

    async getExam(id) {
      const c = await client();
      const { data, error } = await c.from("exams").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return mapExam(data as ExamRow);
    },

    async createExam(exam) {
      const c = await client();
      const { data, error } = await c
        .from("exams")
        .insert(examRowFromRecord(exam))
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapExam(data as ExamRow);
    },

    async updateExam(id, updates) {
      const c = await client();
      const { error } = await c
        .from("exams")
        .update({
          ...(updates.title && { title: updates.title }),
          ...(updates.isOpen !== undefined && { is_open: updates.isOpen }),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      const updated = await store.getExam(id);
      if (!updated) throw new Error("হালনাগাদের পর এক্সাম পাওয়া যায়নি।");
      return updated;
    },

    async deleteExam(id) {
      const c = await client();
      const { error } = await c.from("exams").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },

    async getExamQuestions(examId) {
      const exam = await store.getExam(examId);
      if (!exam) return [];
      const c = await client();
      const { data, error } = await c
        .from("questions")
        .select("id, question, stem, options, correct_option")
        .in("id", exam.questionIds);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{
        id: string;
        question: string | null;
        stem: string[] | null;
        options: QuestionOption[] | null;
        correct_option: string | null;
      }>;
      // `.in()` returns rows in no guaranteed order; an exam's question order is
      // fixed by the snapshot in exams.question_ids.
      const byId = new Map(rows.map((r) => [r.id, r]));
      return exam.questionIds
        .map((qid) => byId.get(qid))
        .filter((r): r is (typeof rows)[number] => Boolean(r?.options && r.options.length > 0))
        .map((r) => ({
          id: r.id,
          question: r.question,
          stem: r.stem ?? [],
          options: r.options,
          correctOption: r.correct_option,
        }));
    },

    async listAttempts(examId) {
      const c = await client();
      const { data, error } = await c
        .from("attempts")
        .select("*")
        .eq("exam_id", examId)
        .order("submitted_at", { ascending: false, nullsFirst: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as AttemptRow[]).map(mapAttempt);
    },

    async getAttempt(id) {
      const c = await client();
      const { data, error } = await c.from("attempts").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return mapAttempt(data as AttemptRow);
    },

    async createAttempt(attempt) {
      const c = await client();
      const { data, error } = await c
        .from("attempts")
        .insert({
          exam_id: attempt.examId,
          student_name: attempt.studentName,
          student_id: attempt.studentId,
          started_at: attempt.startedAt,
          answers: attempt.answers,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapAttempt(data as AttemptRow);
    },

    async updateAttempt(id, updates) {
      const c = await client();
      const { error } = await c
        .from("attempts")
        .update({
          ...(updates.submittedAt && { submitted_at: updates.submittedAt }),
          ...(updates.answers && { answers: updates.answers }),
          ...(updates.score !== undefined && { score: updates.score }),
          ...(updates.total !== undefined && { total: updates.total }),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      const updated = await store.getAttempt(id);
      if (!updated) throw new Error("হালনাগাদের পর অ্যাটেম্পট পাওয়া যায়নি।");
      return updated;
    },

    async getAttemptResult(attemptId) {
      const attempt = await store.getAttempt(attemptId);
      if (!attempt) return null;
      const exam = await store.getExam(attempt.examId);
      if (!exam) return null;
      const questions = seededQuestionOrder(await store.getExamQuestions(exam.id), attempt.id);
      const resultQuestions = questions.map((q) => {
        const studentAnswer = attempt.answers[q.id] ?? null;
        const isCorrect = studentAnswer === q.correctOption;
        return {
          ...q,
          studentAnswer,
          isCorrect,
        };
      });      return {
        attempt,
        exam,
        questions: resultQuestions,
      };
    },

    // ---------------------------------------------------------------------------
    // Video methods
    // ---------------------------------------------------------------------------
    async listVideos(opts) {
      const c = await client();
      const base = c
        .from("videos")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      const { data, error } = opts?.publishedOnly ? await base.eq("published", true) : await base;
      if (error) throw new Error(error.message);
      return ((data ?? []) as VideoRow[]).map(mapVideo);
    },

    async getVideo(id) {
      const c = await client();
      const { data, error } = await c.from("videos").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return mapVideo(data as VideoRow);
    },

    async createVideo(video) {
      const c = await client();
      const { data, error } = await c
        .from("videos")
        .insert(videoRowFromInput(video))
        .select()
        .single();
      if (error) throw new Error(error.message);
      return mapVideo(data as VideoRow);
    },

    async updateVideo(id, updates) {
      const c = await client();
      const { error } = await c
        .from("videos")
        .update({
          ...(updates.subject !== undefined && { subject: updates.subject }),
          ...(updates.topic !== undefined && { topic: updates.topic }),
          ...(updates.title !== undefined && { title: updates.title }),
          ...(updates.youtubeId !== undefined && { youtube_id: updates.youtubeId }),
          ...(updates.position !== undefined && { position: updates.position }),
          ...(updates.published !== undefined && { published: updates.published }),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      const updated = await store.getVideo(id);
      if (!updated) throw new Error("হালনাগাদের পর ভিডিও পাওয়া যায়নি।");
      return updated;
    },

    async deleteVideo(id) {
      const c = await client();
      const { error } = await c.from("videos").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  };


  storeInstances.set(system, store);
  return store;
}

type PaperQRow = { question_id: string; position: number; section: string | null; selected_parts: string[] | null };
type PaperQNested = PaperQRow & { questions: QuestionRow & { question_parts: PartRow[] } | null };

export type QuestionFacetRow = {
  chapter: number;
  type: string;
  stars: number | null;
  boards: string[] | null;
  image_path: string | null;
  flags: unknown;
};

export function buildFacetsFromRows(rows: QuestionFacetRow[]): QuestionFacets {
  const chapterMap = new Map<number, QuestionFacets["chapters"][number]>();
  const typeMap = new Map<string, number>();
  const boardMap = new Map<string, number>();
  const starMap = new Map<number, number>();
  let flagged = 0;
  let withImage = 0;
  for (const q of rows) {
    const entry = chapterMap.get(q.chapter) ?? { chapter: q.chapter, total: 0, cq: 0, sq: 0, mcq: 0 };
    entry.total += 1;
    if (q.type === "CQ") entry.cq += 1;
    else if (q.type === "SQ") entry.sq += 1;
    else entry.mcq += 1;
    chapterMap.set(q.chapter, entry);
    typeMap.set(q.type, (typeMap.get(q.type) ?? 0) + 1);
    for (const board of q.boards ?? []) boardMap.set(board, (boardMap.get(board) ?? 0) + 1);
    if (q.stars !== null) starMap.set(q.stars, (starMap.get(q.stars) ?? 0) + 1);
    if (parseFlags(q.flags).length > 0) flagged += 1;
    if (q.image_path) withImage += 1;
  }
  return {
    chapters: [...chapterMap.values()].sort((a, b) => a.chapter - b.chapter),
    types: [...typeMap.entries()]
      .map(([type, total]) => ({ type: type as QuestionType, total }))
      .sort((a, b) => a.type.localeCompare(b.type)),
    boards: [...boardMap.entries()]
      .map(([board, total]) => ({ board, total }))
      .sort((a, b) => b.total - a.total || a.board.localeCompare(b.board)),
    stars: [...starMap.entries()]
      .map(([stars, total]) => ({ stars, total }))
      .sort((a, b) => a.stars - b.stars),
    topics: [],
    total: rows.length,
    flagged,
    withImage,
    used: 0,
    unused: rows.length,
  };
}
