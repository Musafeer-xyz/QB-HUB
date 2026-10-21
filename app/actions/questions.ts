"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStore } from "@/lib/data/store";
import { questionTypeSchema } from "@/lib/schemas/question";
import { getAuthUser, isAdminUser } from "@/lib/supabase/server";
import { isLocalMode } from "@/lib/mode";

const partSchema = z.object({
  label: z.string().trim().min(1, "পার্টের লেবেল দরকার"),
  marks: z.number().int().min(0).max(100, "নম্বর ০–১০০"),
  text: z.string().trim().min(1, "পার্টের প্রশ্ন লিখুন"),
  answer: z.string().nullable(),
});

const formSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "id দিন")
    .regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/, "id শুধু অক্ষর/সংখ্যা ও হাইফেন হতে পারে"),
  subject: z.string().trim().min(1, "বিষয় দিন"),
  chapter: z.number().int().min(1, "অধ্যায় ১–৯৯").max(99),
  type: questionTypeSchema,
  stars: z.number().int().min(1).max(5).nullable(),
  boards: z.array(z.string().trim().min(1)),
  question: z.string().nullable(),
  stem: z.array(z.string()),
  image: z.string().nullable(),
  image_desc: z.string().nullable(),
  answer: z.string().nullable(),
  parts: z.array(partSchema),
});

export type QuestionActionResult =
  | { ok: true; id: string; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function saveQuestionAction(input: {
  id: string;
  subject: string;
  chapter: number;
  type: string;
  stars: number | null;
  boards: string[];
  question: string | null;
  stem: string[];
  image: string | null;
  image_desc: string | null;
  answer: string | null;
  parts: { label: string; marks: number; text: string; answer: string | null }[];
}): Promise<QuestionActionResult> {
  if (!isLocalMode()) {
    const user = await getAuthUser();
    if (!user) return { ok: false, message: "লগইন প্রয়োজন।" };
    if (!(await isAdminUser())) return { ok: false, message: "এই কাজের অনুমতি নেই।" };
  }

  const parsed = formSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "ফর্মের তথ্য সঠিক নয়।",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const values = parsed.data;
  if (values.type === "SQ" && !values.question?.trim()) {
    return { ok: false, message: "SQ প্রশ্নের টেক্সট দিন।" };
  }
  if (values.type === "CQ" && values.parts.length === 0) {
    return { ok: false, message: "CQ-তে অন্তত একটি পার্ট দিন।" };
  }

  const store = await getStore();
  const existing = await store.getQuestion(values.id);
  const form = { ...values, question: values.question?.trim() ? values.question : null };

  try {
    if (existing) {
      await store.updateQuestion(values.id, form);
    } else {
      await store.createQuestion(form);
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "সংরক্ষণ ব্যর্থ।" };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return {
    ok: true,
    id: values.id,
    message: existing ? `“${values.id}” হালনাগাদ হয়েছে।` : `“${values.id}” যোগ হয়েছে।`,
  };
}

export async function deleteQuestionAction(id: string): Promise<QuestionActionResult> {
  if (!isLocalMode()) {
    if (!(await isAdminUser())) return { ok: false, message: "এই কাজের অনুমতি নেই।" };
  }
  try {
    const store = await getStore();
    await store.deleteQuestion(id);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "মুছে ফেলা যায়নি।" };
  }
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, id, message: `“${id}” মুছে ফেলা হয়েছে।` };
}

export async function resolveFlagAction(
  id: string,
  flagId: string,
): Promise<QuestionActionResult> {
  if (!isLocalMode()) {
    if (!(await isAdminUser())) return { ok: false, message: "এই কাজের অনুমতি নেই।" };
  }
  try {
    const store = await getStore();
    await store.resolveFlag(id, flagId);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "ফ্ল্যাগ সরানো যায়নি।" };
  }
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, id, message: "যাচাই-ফ্ল্যাগ সরানো হয়েছে।" };
}
