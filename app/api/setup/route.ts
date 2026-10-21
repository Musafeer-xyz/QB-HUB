import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email("সঠিক ইমেইল দিন"),
  password: z.string().min(8, "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে"),
  secret: z.string().min(1, "সেটআপ সিক্রেট দিন"),
});

/**
 * First-run "become admin": creates the auth user and inserts it into
 * `admins`. Requires the SETUP_SECRET env var to match.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.SETUP_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "SETUP_SECRET এনভায়রনমেন্ট ভ্যারিয়েবল সেট করা নেই।" },
      { status: 500 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "তথ্য সঠিক নয়।" },
      { status: 400 },
    );
  }

  // Constant-time-ish comparison is unnecessary for this local operator gate,
  // but the secret must be supplied on every call.
  if (parsed.data.secret !== expected) {
    return NextResponse.json({ ok: false, message: "সেটআপ সিক্রেট ভুল।" }, { status: 403 });
  }

  const client = createSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY সেট করা নেই।" },
      { status: 500 },
    );
  }

  const { data: created, error } = await client.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (error) {
    return NextResponse.json({ ok: false, message: `ব্যবহারকারী তৈরি ব্যর্থ: ${error.message}` }, { status: 400 });
  }

  const userId = created.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, message: "ব্যবহারকারী তৈরি হয়নি।" }, { status: 500 });
  }

  const { error: adminError } = await client
    .from("admins")
    .upsert({ user_id: userId }, { onConflict: "user_id" });
  if (adminError) {
    return NextResponse.json({ ok: false, message: `admins টেবিলে যোগ ব্যর্থ: ${adminError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "অ্যাডমিন তৈরি হয়েছে।" });
}
