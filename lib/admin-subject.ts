import { DEFAULT_SUBJECT, SUBJECTS } from "@/lib/subjects";

/**
 * Subject sources for the admin area, strongest first. The header switcher and
 * every admin surface read one resolved value from these, so the subject shown
 * is always the one the page is actually working on.
 */
export type SubjectSources = {
  /** `?subject=` from the URL — wins whenever it names a real subject. */
  url?: string | null;
  /** The paper being edited (`/admin/papers/<id>/edit`). */
  paper?: string | null;
  /** The questions selected in the tray (a new paper's subject). */
  selection?: string | null;
};

/** True when `id` is a registered subject id (not a slug, label or junk). */
export function isSubjectId(id: string | null | undefined): id is string {
  return typeof id === "string" && SUBJECTS.some((s) => s.id === id);
}

/** URL → paper → selection → the default subject. Empty/unknown values are skipped. */
export function resolveAdminSubject({ url, paper, selection }: SubjectSources): string {
  for (const candidate of [url, paper, selection]) {
    if (isSubjectId(candidate)) return candidate;
  }
  return DEFAULT_SUBJECT;
}

/**
 * The paper builder's subject, strongest first: the paper being edited, then
 * `?subject=`, then the tray. Resolved before the first fetch, so a builder
 * never asks for the default subject first and then refetches.
 */
export function resolveBuilderSubject({ paper, url, selection }: SubjectSources): string {
  for (const candidate of [paper, url, selection]) {
    if (isSubjectId(candidate)) return candidate;
  }
  return DEFAULT_SUBJECT;
}

/**
 * Set `?subject=` on an internal href, keeping every other parameter (filters,
 * `step`, …). Used so the chosen subject survives internal navigation.
 */
export function withSubject(href: string, subjectId: string): string {
  const [path = "", query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("subject", subjectId);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
