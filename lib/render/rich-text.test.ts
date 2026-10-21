import { describe, expect, it } from "vitest";
import { collectMathErrors, renderRichText, splitMath } from "@/lib/render/rich-text";

describe("rich text rendering (KaTeX + mhchem)", () => {
  it("renders $\\ce{...}$ chemistry with subscripts", () => {
    const { html, errors } = renderRichText("অম্লের সাথে $\\ce{HNO3}$ বিক্রিয়া করে।");
    expect(errors).toEqual([]);
    expect(html).toContain("katex");
    expect(html).toContain("অম্লের সাথে");
    expect(html).toContain("বিক্রিয়া করে");
    // mhchem typesets HNO₃ with a real subscripted digit
    expect(html).toContain("HNO");
    expect(html).toMatch(/class="mord mtight">3<\/span>/);
  });

  it("typesets the chem-09-cq-001 reaction with a reaction arrow", () => {
    const { html, errors } = renderRichText("(i) $\\ce{C4H10 + Cl2 -> C4H9Cl + HCl}$");
    expect(errors).toEqual([]);
    expect(html).toContain("katex");
    // mhchem draws `->` as a reaction arrow (SVG)
    expect(html).toContain("x-arrow");
    expect(html).toContain("svg");
    expect(html).toContain("Cl");
  });

  it("renders mixed Bangla + math in one string", () => {
    const { html, errors } = renderRichText(
      "উদ্দীপক: $\\ce{NaOH + HCl -> NaCl + H2O}$ বিক্রিয়াটির $\\Delta H$ এর মান নির্ণয় কর।",
    );
    expect(errors).toEqual([]);
    expect(html).toContain("উদ্দীপক");
    expect(html).toContain("x-arrow");
    expect(html).toContain("NaOH");
    expect(html).toContain("Δ");
  });

  it("renders plain Unicode chemistry untouched", () => {
    const { html } = renderRichText("Mg(OH)₂ এবং ১০⁻³ মোলার দ্রবণ");
    expect(html).toBe("Mg(OH)₂ এবং ১০⁻³ মোলার দ্রবণ");
  });

  it("keeps a malformed formula visible as raw text instead of crashing", () => {
    const { html, errors } = renderRichText("ভুল: $\\ce{bad ->[} x}$ এখানে");
    expect(errors).toHaveLength(1);
    expect(html).toContain("math-error");
    // the raw source is shown verbatim (HTML-escaped)
    expect(html).toContain("$\\ce{bad -&gt;[} x}$");
  });

  it("does not swallow an unpaired dollar sign", () => {
    const { errors } = renderRichText("দাম ১০০ টাকা $ এবং আরেকটি");
    expect(errors).toEqual([]);
    expect(splitMath("দাম ১০০ টাকা $ এবং আরেকটি")).toEqual([
      { kind: "text", raw: "দাম ১০০ টাকা $ এবং আরেকটি" },
    ]);
  });

  it("honours escaped dollar signs", () => {
    expect(splitMath("\\$5 and $x+y$")).toEqual([
      { kind: "text", raw: "$5 and " },
      { kind: "math", raw: "x+y", display: false },
    ]);
    expect(renderRichText("\\$5 and $x+y$").html).toBe("$5 and " + renderRichText("$x+y$").html);
  });

  it("supports display math with $$...$$", () => {
    const { html, errors } = renderRichText("$$\\ce{2H2 + O2 -> 2H2O}$$");
    expect(errors).toEqual([]);
    expect(html).toContain("katex-display");
  });

  it("escapes HTML in plain text", () => {
    expect(renderRichText('<script>alert("x")</script>').html).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  it("collects parse failures for admin flags", () => {
    const bad = "$\\frac{1}{2$ ভুল সমীকরণ";
    const msgs = collectMathErrors([bad, bad, "ঠিক আছে $\\ce{H2O}$"]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain("LaTeX পার্স করা যায়নি");
    expect(msgs[0]).toContain("frac{1}{2");
  });
});
