import { describe, expect, it } from "vitest";
import { toBanglaDigits, fromBanglaDigits, formatMarks, formatNumberList } from "@/lib/bangla";

describe("Bangla digit conversion", () => {
  it("converts numbers", () => {
    expect(toBanglaDigits(1234)).toBe("১২৩৪");
  });

  it("converts strings and keeps non-digits", () => {
    expect(toBanglaDigits("প্রশ্ন 12, নম্বর 3")).toBe("প্রশ্ন ১২, নম্বর ৩");
    expect(toBanglaDigits("H2O")).toBe("H২O");
  });

  it("round-trips back to ASCII digits", () => {
    expect(fromBanglaDigits("১২৩৪")).toBe("1234");
    expect(fromBanglaDigits(toBanglaDigits("২০২৬ সাল"))).toBe("2026 সাল");
  });

  it("formats marks and lists", () => {
    expect(formatMarks(10)).toBe("১০");
    expect(formatNumberList([1, 2, 3])).toBe("১، ২، ৩");
  });
});
