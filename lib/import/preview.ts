import { checkData, type CheckIssue, type CheckSourceFile } from "@/lib/import/check";
import {
  planImport,
  type DbQuestion,
  type ExistingQuestion,
  type ImportAction,
} from "@/lib/import/plan";

/**
 * Preview of an import: the per-item diff (new / updated / unchanged / invalid)
 * plus the data-quality errors that block saving. Nothing is written here, so
 * the import page can show it before the confirm button.
 */

export type ImportPreviewEntry = {
  file: string;
  id: string;
  action: ImportAction;
  /** Bangla explanation shown next to the status. */
  reason: string | null;
  warnings: string[];
};

export type ImportPreviewTotals = {
  items: number;
  insert: number;
  update: number;
  unchanged: number;
  skipped: number;
  warnings: number;
};

export type ImportPreview = {
  entries: ImportPreviewEntry[];
  totals: ImportPreviewTotals;
  /** Data-quality errors; any entry here means saving is blocked. */
  issues: CheckIssue[];
  /** Exactly the questions a confirmed save would write. */
  writable: DbQuestion[];
};

const ACTION_REASONS: Partial<Record<ImportAction, string>> = {
  insert: "নতুন প্রশ্ন",
  update: "বিদ্যমান প্রশ্ন হালনাগাদ হবে",
};

export function buildImportPreview(
  files: CheckSourceFile[],
  opts: { existing?: Map<string, ExistingQuestion>; imageFiles?: Set<string> } = {},
): ImportPreview {
  const plan = planImport(files, opts);
  const checked = checkData(files, { imageFiles: opts.imageFiles });

  return {
    entries: plan.entries.map((entry) => ({
      file: entry.file,
      id: entry.id,
      action: entry.action,
      reason:
        ACTION_REASONS[entry.action] ??
        (entry.reason
          ? entry.action === "skipped"
            ? `ফর্ম্যাট সঠিক নয় — ${entry.reason}`
            : entry.reason
          : null),
      warnings: entry.warnings,
    })),
    totals: plan.totals,
    issues: checked.errors,
    writable: plan.entries
      .filter((entry) => entry.action === "insert" || entry.action === "update")
      .map((entry) => entry.question)
      .filter((q): q is DbQuestion => Boolean(q)),
  };
}
