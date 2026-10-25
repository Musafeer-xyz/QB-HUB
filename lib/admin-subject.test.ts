import { describe, expect, it } from "vitest";
import { isSubjectId, resolveAdminSubject, withSubject } from "@/lib/admin-subject";
import { DEFAULT_SUBJECT } from "@/lib/subjects";

describe("resolveAdminSubject", () => {
  it("prefers the URL subject", () => {
    expect(resolveAdminSubject({ url: "physics", paper: "chemistry", selection: "math" })).toBe(
      "physics",
    );
  });

  it("falls back to the paper's own subject", () => {
    expect(resolveAdminSubject({ url: null, paper: "physics", selection: "math" })).toBe("physics");
  });

  it("falls back to the selected questions' subject", () => {
    expect(resolveAdminSubject({ url: null, paper: null, selection: "physics" })).toBe("physics");
  });

  it("uses the default when nothing is known", () => {
    expect(resolveAdminSubject({})).toBe(DEFAULT_SUBJECT);
  });

  it("ignores unknown or empty values instead of defaulting early", () => {
    expect(resolveAdminSubject({ url: "nope", paper: "", selection: "physics" })).toBe("physics");
    expect(resolveAdminSubject({ url: null, paper: undefined, selection: null })).toBe(DEFAULT_SUBJECT);
  });
});

describe("isSubjectId", () => {
  it("accepts registered ids and rejects slugs, labels and nullish values", () => {
    expect(isSubjectId("physics")).toBe(true);
    expect(isSubjectId("পদার্থবিজ্ঞান")).toBe(false);
    expect(isSubjectId("")).toBe(false);
    expect(isSubjectId(null)).toBe(false);
  });
});

describe("withSubject", () => {
  it("sets the subject on a bare path", () => {
    expect(withSubject("/admin/papers", "physics")).toBe("/admin/papers?subject=physics");
  });

  it("keeps other query parameters", () => {
    expect(withSubject("/admin/papers/new?step=2", "physics")).toBe(
      "/admin/papers/new?step=2&subject=physics",
    );
  });

  it("replaces an existing subject without duplicating it", () => {
    expect(withSubject("/admin/bank?subject=chemistry&chapter=3", "physics")).toBe(
      "/admin/bank?subject=physics&chapter=3",
    );
  });
});
