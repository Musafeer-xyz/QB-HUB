import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { makeFlagId, parseQuestion } from "@/lib/schemas/question";
import { paperSettingsSchema } from "@/lib/schemas/paper";
import { collectMathErrors, questionTextFields } from "@/lib/render/rich-text";
import { filterQuestions } from "@/lib/data/facets";
import { getImageDimensions } from "@/lib/image-dimensions";import type { PaperFormValues, QuestionFormValues, Store } from "@/lib/data/store";
import type { DbQuestion } from "@/lib/import/plan";
import type { PaperRecord, PaperQuestionRecord, QuestionRecord } from "@/lib/types";

/**
 * Local/demo data source: questions come from ./data/*.json, admin edits and
 * saved papers live in ./local-data/*.json. No database required — this is what
 * makes `npm run dev` work out of the box and is what the e2e suite runs on.
 */

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const LOCAL_DIR = path.join(ROOT, "local-data");

type Overrides = { upserts: Record<string, QuestionRecord>; deleted: string[] };
type PapersFile = { papers: PaperRecord[] };

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const text = fs.readFileSync(file, "utf8").normalize("NFC");
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

const overridesFile = path.join(LOCAL_DIR, "questions.json");
const papersFile = path.join(LOCAL_DIR, "papers.json");

function toRecord(raw: unknown): QuestionRecord | null {
  const parsed = parseQuestion(raw);
  if (!parsed.success) return null;
  const d = parsed.data;
  const flags = d.flags.map((text) => ({ id: makeFlagId(text), text, createdAt: new Date(0).toISOString() }));
  const base = {
    id: d.id,
    subject: d.subject,
    chapter: d.chapter,
    type: d.type,
    stars: d.stars,
    boards: d.boards,
    answer: d.answer,
    options: d.options,
    correctOption: d.correct_option,
    flags,
  };
  if (d.type === "SQ") {
    return { ...base, type: "SQ", question: d.question, stem: [], imagePath: null, imageDesc: null, parts: [] };
  }
  if (d.type === "CQ") {
    const dims = getImageDimensions(d.image);
    return {
      ...base,
      type: "CQ",
      question: d.question,
      stem: d.stem,
      imagePath: d.image,
      imageDesc: d.image_desc,
      imageWidth: dims?.width ?? null,
      imageHeight: dims?.height ?? null,
      parts: d.parts.map((p, i) => ({
        questionId: d.id,
        position: i,
        label: p.label,
        marks: p.marks,
        text: p.text,
        answer: p.answer,
      })),
    };
  }
  const mcq = d as { image?: string | null; image_desc?: string | null };
  const dims = getImageDimensions(mcq.image ?? null);
  return {
    ...base,
    type: "MCQ",
    question: d.question,
    stem: [],
    imagePath: mcq.image ?? null,
    imageDesc: mcq.image_desc ?? null,
    imageWidth: dims?.width ?? null,
    imageHeight: dims?.height ?? null,
    parts: [],
  };
}

let cache: { mtime: number; questions: QuestionRecord[] } | null = null;

function sourceQuestions(): QuestionRecord[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  const jsonFiles = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .sort();
  const key = jsonFiles
    .map((f) => `${f}:${fs.statSync(path.join(DATA_DIR, f)).mtimeMs}`)
    .join("|");
  const keyHash = crypto.createHash("sha1").update(key).digest("hex");
  if (cache && cache.mtime === Number.parseInt(keyHash.slice(0, 8), 16)) return cache.questions;

  const questions: QuestionRecord[] = [];
  for (const file of jsonFiles) {
    const items: unknown[] = readJson(path.join(DATA_DIR, file), []);
    for (const item of items) {
      const record = toRecord(item);
      if (record) questions.push(record);
    }
  }
  cache = { mtime: Number.parseInt(keyHash.slice(0, 8), 16), questions };
  return questions;
}

function loadOverrides(): Overrides {
  return readJson<Overrides>(overridesFile, { upserts: {}, deleted: [] });
}

function allQuestions(): QuestionRecord[] {
  const overrides = loadOverrides();
  const merged = new Map<string, QuestionRecord>();
  for (const q of sourceQuestions()) merged.set(q.id, q);
  for (const [id, q] of Object.entries(overrides.upserts)) merged.set(id, q);
  for (const id of overrides.deleted) merged.delete(id);
  return [...merged.values()];
}

function loadPapers(): PaperRecord[] {
  const file = readJson<PapersFile>(papersFile, { papers: [] });
  return file.papers.map((p) => ({
    ...p,
    settings: paperSettingsSchema.parse(p.settings ?? {}),
  }));
}

function savePapers(papers: PaperRecord[]): void {
  writeJson(papersFile, { papers });
}

function paperFromValues(values: PaperFormValues, id: string, createdBy: string | null): PaperRecord {
  const settings = paperSettingsSchema.parse(values.settings ?? {});
  const questions: PaperQuestionRecord[] = values.questions.map((q, i) => ({
    questionId: q.questionId,
    position: i,
    section: q.section,
    selectedParts: q.selectedParts,
  }));
  const now = new Date().toISOString();
  return {
    id,
    title: values.title,
    institute: values.institute,
    examName: values.examName,
    className: values.className,
    subject: values.subject,
    durationMinutes: values.durationMinutes,
    totalMarks: values.totalMarks,
    settings,
    createdBy,
    createdAt: now,
    updatedAt: now,
    questions,
  };
}

function recordFromForm(values: QuestionFormValues): QuestionRecord {
  const base = {
    id: values.id,
    subject: values.subject,
    chapter: values.chapter,
    type: values.type,
    stars: values.stars,
    boards: values.boards,
    answer: values.answer,
    options: null,
    correctOption: null,
    flags: [] as QuestionRecord["flags"],
  };
  if (values.type === "CQ") {
    const dims = getImageDimensions(values.image);
    return {
      ...base,
      type: "CQ",
      question: values.question,
      stem: values.stem,
      imagePath: values.image,
      imageDesc: values.image_desc,
      imageWidth: dims?.width ?? null,
      imageHeight: dims?.height ?? null,
      parts: values.parts.map((p, i) => ({ questionId: values.id, position: i, ...p })),
    };
  }
  if (values.type === "MCQ") {
    const dims = getImageDimensions(values.image);
    return { ...base, type: "MCQ", question: values.question ?? "", stem: [], imagePath: values.image, imageDesc: values.image_desc, imageWidth: dims?.width ?? null, imageHeight: dims?.height ?? null, parts: [] };
  }
  return { ...base, type: "SQ", question: values.question ?? "", stem: [], imagePath: null, imageDesc: null, imageWidth: null, imageHeight: null, parts: [] };
}

/** Merge source flags with the editor's text; auto-flag malformed LaTeX. */
function withFlags(record: QuestionRecord, existing: QuestionRecord | null): QuestionRecord {
  const texts = questionTextFields({
    question: record.question,
    stem: record.stem,
    parts: record.parts,
    image_desc: record.imageDesc,
  });
  const auto = collectMathErrors(texts).map((text) => ({
    id: makeFlagId(text),
    text,
    createdAt: new Date().toISOString(),
  }));
  const kept = (existing?.flags ?? []).filter(
    (f) => !f.text.startsWith("LaTeX পার্স করা যায়নি") && !auto.some((a) => a.text === f.text),
  );
  return { ...record, flags: [...auto, ...kept] };
}

/** Import shape (already validated + flagged) → stored record. */
function recordFromDbQuestion(q: DbQuestion): QuestionRecord {
  const dims = getImageDimensions(q.image_path);
  return {
    id: q.id,
    subject: q.subject,
    chapter: q.chapter,
    type: q.type,
    stars: q.stars,
    boards: q.boards,
    question: q.question,
    stem: q.stem,
    imagePath: q.image_path,
    imageDesc: q.image_desc,
    imageWidth: dims?.width ?? null,
    imageHeight: dims?.height ?? null,
    flags: q.flags,
    answer: q.answer,
    options: q.options,
    correctOption: q.correct_option,
    parts: q.parts.map((p, i) => ({
      questionId: q.id,
      position: i,
      label: p.label,
      marks: p.marks,
      text: p.text,
      answer: p.answer ?? null,
    })),
  };
}

function persistUpsert(record: QuestionRecord): QuestionRecord {
  const overrides = loadOverrides();
  overrides.upserts[record.id] = record;
  overrides.deleted = overrides.deleted.filter((id) => id !== record.id);
  writeJson(overridesFile, overrides);
  return record;
}

let storeInstance: Store | null = null;

export function localStore(): Store {
  if (storeInstance) return storeInstance;

  storeInstance = {
    mode: "local",

    async listQuestions(query) {
      return filterQuestions(allQuestions(), query);
    },

    async getQuestion(id) {
      return allQuestions().find((q) => q.id === id) ?? null;
    },

    async createQuestion(values) {
      const existing = allQuestions().find((q) => q.id === values.id);
      if (existing) throw new Error(`“${values.id}” ইতিমধ্যে বিদ্যমান।`);
      return persistUpsert(withFlags(recordFromForm(values), null));
    },

    async updateQuestion(id, values) {
      const existing = allQuestions().find((q) => q.id === id);
      if (!existing) throw new Error(`“${id}” পাওয়া যায়নি।`);
      return persistUpsert(withFlags(recordFromForm({ ...values, id }), existing));
    },

    async importQuestions(questions) {
      const existing = new Set(allQuestions().map((q) => q.id));
      const overrides = loadOverrides();
      for (const q of questions) {
        overrides.upserts[q.id] = recordFromDbQuestion(q);
        overrides.deleted = overrides.deleted.filter((id) => id !== q.id);
      }
      writeJson(overridesFile, overrides);
      return {
        inserted: questions.filter((q) => !existing.has(q.id)).length,
        updated: questions.filter((q) => existing.has(q.id)).length,
      };
    },

    async deleteQuestion(id) {
      const overrides = loadOverrides();
      if (!overrides.deleted.includes(id)) overrides.deleted.push(id);
      delete overrides.upserts[id];
      writeJson(overridesFile, overrides);
    },

    async resolveFlag(id, flagId) {
      const existing = allQuestions().find((q) => q.id === id);
      if (!existing) throw new Error(`“${id}” পাওয়া যায়নি।`);
      persistUpsert({ ...existing, flags: existing.flags.filter((f) => f.id !== flagId) });
    },

    async listBoards() {
      const boards = new Set<string>();
      for (const q of allQuestions()) for (const b of q.boards) boards.add(b);
      return [...boards].sort((a, b) => a.localeCompare(b, "bn"));
    },

    async usedQuestionIds() {
      const ids = new Set<string>();
      for (const paper of loadPapers()) for (const pq of paper.questions) ids.add(pq.questionId);
      return ids;
    },

    async listPapers() {
      return loadPapers()
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getPaper(id) {
      return loadPapers().find((p) => p.id === id) ?? null;
    },

    async createPaper(values, createdBy) {
      const paper = paperFromValues(values, crypto.randomUUID(), createdBy);
      const papers = loadPapers();
      papers.push(paper);
      savePapers(papers);
      return paper;
    },

    async updatePaper(id, values) {
      const papers = loadPapers();
      const idx = papers.findIndex((p) => p.id === id);
      if (idx < 0) throw new Error("পেপার পাওয়া যায়নি।");
      const prev = papers[idx];
      if (!prev) throw new Error("পেপার পাওয়া যায়নি।");
      const updated = { ...paperFromValues(values, id, prev.createdBy), createdAt: prev.createdAt };
      papers[idx] = updated;
      savePapers(papers);
      return updated;
    },

    async deletePaper(id) {
      savePapers(loadPapers().filter((p) => p.id !== id));
    },

    async duplicatePaper(id, createdBy) {
      const papers = loadPapers();
      const src = papers.find((p) => p.id === id);
      if (!src) throw new Error("পেপার পাওয়া যায়নি।");
      const copy: PaperRecord = {
        ...src,
        id: crypto.randomUUID(),
        title: `${src.title} (কপি)`,
        createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: src.questions.map((q) => ({ ...q })),
      };
      papers.push(copy);
      savePapers(papers);
      return copy;
    },
  };

  return storeInstance;
}

/** Source of uploaded images in local mode (created by the upload route). */
export const LOCAL_UPLOAD_DIR = path.join(LOCAL_DIR, "images");
