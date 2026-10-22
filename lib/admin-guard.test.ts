import { describe, expect, it } from "vitest";
import { adminDecision } from "./admin-guard";
import { isProtectedPath } from "./supabase/middleware";

describe("admin guard decision", () => {
  it("allows an admin", () => {
    expect(adminDecision({ local: false, signedIn: true, admin: true })).toBe("allow");
  });

  it("rejects an anonymous caller with 401 (login)", () => {
    expect(adminDecision({ local: false, signedIn: false, admin: false })).toBe("login");
  });

  it("rejects a signed-in non-admin with 403 (forbidden)", () => {
    expect(adminDecision({ local: false, signedIn: true, admin: false })).toBe("forbidden");
  });

  it("keeps local mode unchanged (no Supabase Auth)", () => {
    expect(adminDecision({ local: true, signedIn: false, admin: false })).toBe("allow");
  });
});

describe("student exam endpoints stay public", () => {
  it("never gates start, attempt resume or attempt submit", () => {
    expect(isProtectedPath("/api/exams/abc/start")).toBe(false);
    expect(isProtectedPath("/api/attempts/abc")).toBe(false);
    expect(isProtectedPath("/api/attempts/abc/submit")).toBe(false);
  });

  it("still gates the admin pages that host the exam screens", () => {
    expect(isProtectedPath("/admin/exams")).toBe(true);
    expect(isProtectedPath("/admin/exams/abc/results")).toBe(true);
  });
});
