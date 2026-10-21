"use client";

import { useState } from "react";

/**
 * A question figure: renders the image with `image_desc` as alt text, and a
 * visible caption. If the file is missing (or fails to load) a placeholder is
 * shown instead — never a broken image icon.
 */
export function QuestionImage({
  src,
  desc,
  available = true,
}: {
  src: string | null;
  desc: string | null;
  available?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const showPlaceholder = !src || !available || broken;

  return (
    <figure className="paper-figure my-3 flex flex-col items-center gap-1">
      {src && !showPlaceholder ? (
        // eslint-disable-next-line @next/next/no-img-element -- print/PDF need plain <img>
        // Height and centring come from the "ছবির আকার" setting in the print
        // stylesheet (`.paper-figure img`), so preview and PDF match.
        <img src={src} alt={desc ?? "প্রশ্নের চিত্র"} onError={() => setBroken(true)} />
      ) : (
        <div
          className="flex h-40 w-full max-w-full items-center justify-center rounded-md border border-dashed border-slate-400 bg-slate-50 px-2 text-center text-sm text-slate-500"
          role="img"
          aria-label={desc ?? "ছবি পাওয়া যায়নি"}
        >
          চিত্র পাওয়া যায়নি{desc ? ` — ${desc}` : ""}
        </div>
      )}
      {desc ? (
        <figcaption className="text-center text-xs text-slate-600">{desc}</figcaption>
      ) : null}
    </figure>
  );
}
