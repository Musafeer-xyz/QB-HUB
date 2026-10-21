"use client";

import { toBanglaDigits } from "@/lib/bangla";
import { paperDims, type PaperMargins } from "@/lib/paper/sizes";

/**
 * Top bar of the standalone print view. The button prints only after the fonts
 * and figures are ready, so a quick click can never print half-rendered Bangla
 * or a wrongly sized formula.
 */
export function PrintToolbar({
  title,
  paperSize,
  margins,
}: {
  title: string;
  paperSize: string;
  margins: PaperMargins;
}) {
  const dims = paperDims(paperSize);

  async function printNow() {
    try {
      await document.fonts.ready;
    } catch {
      // ignore: print anyway
    }
    window.print();
  }

  return (
    <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
      <div className="text-sm text-slate-700">
        প্রিন্ট প্রিভিউ — <strong>{title}</strong>
        <span className="ml-3 text-xs text-slate-500">
          {dims.width} × {dims.height} · মার্জিন {toBanglaDigits(margins.top)}/
          {toBanglaDigits(margins.right)}/{toBanglaDigits(margins.bottom)}/
          {toBanglaDigits(margins.left)} মিমি
        </span>
        <span className="mt-0.5 block text-[11px] text-slate-500">
          পরামর্শ: প্রিন্ট ডায়ালগে “Headers and footers” বন্ধ রাখুন — পাতার নম্বর ইতিমধ্যে
          ছাপা হচ্ছে, নইলে সংখ্যা দুবার দেখা যাবে।
        </span>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={() => window.close()}>
          বন্ধ করুন
        </button>
        <button type="button" className="btn-primary" onClick={() => void printNow()}>
          প্রিন্ট করুন
        </button>
      </div>
    </div>
  );
}
