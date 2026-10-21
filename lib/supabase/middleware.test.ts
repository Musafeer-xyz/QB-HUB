import { describe, expect, it } from "vitest";
import { isProtectedPath } from "./middleware";

describe("isProtectedPath", () => {
  it("guards every admin route", () => {
    expect(isProtectedPath("/admin")).toBe(true);
    expect(isProtectedPath("/admin/papers/new")).toBe(true);
    expect(isProtectedPath("/admin/questions/abc/edit")).toBe(true);
  });

  it("guards first-run setup", () => {
    expect(isProtectedPath("/setup")).toBe(true);
  });

  it("does not guard the print view, which authorises by session OR print token", () => {
    // The PDF renderer opens /print/[id]?t=... with no session cookie. If the
    // edge middleware redirected it, the generated PDF would be a login page.
    expect(isProtectedPath("/print/abc-123")).toBe(false);
    expect(isProtectedPath("/print")).toBe(false);
  });

  it("does not guard public paths", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
  });

  it("matches on path segments, not string prefixes", () => {
    expect(isProtectedPath("/administrator")).toBe(false);
    expect(isProtectedPath("/setups")).toBe(false);
    expect(isProtectedPath("/printers")).toBe(false);
  });
});
