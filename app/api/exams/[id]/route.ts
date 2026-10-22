import { NextResponse } from "next/server";
import { getStore } from "@/lib/data/store";
import { requireAdmin } from "@/lib/admin-guard";

/**
 * Get a single exam (admin only).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const store = await getStore();
    const exam = await store.getExam(id);
    if (!exam) return NextResponse.json({ error: "এক্সাম পাওয়া যায়নি।" }, { status: 404 });
    return NextResponse.json({ exam });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "এক্সাম লোড করা যায়নি।" },
      { status: 500 },
    );
  }
}

/**
 * Update an exam (toggle open/close, rename) - admin only.
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await _req.json();
    const updates: { title?: string; isOpen?: boolean } = {};
    if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim();
    if (typeof body.isOpen === "boolean") updates.isOpen = body.isOpen;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "হালনাগাদ করার কিছু নেই।" }, { status: 400 });
    }

    const store = await getStore();
    const exam = await store.updateExam(id, updates);
    return NextResponse.json({ exam });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "এক্সাম হালনাগাদ করা যায়নি।" },
      { status: 500 },
    );
  }
}

/**
 * Delete an exam (admin only).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const store = await getStore();
    await store.deleteExam(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "এক্সাম মুছে ফেলা যায়নি।" },
      { status: 500 },
    );
  }
}
