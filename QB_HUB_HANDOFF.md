# QB Hub (প্রশ্নব্যাংক) — Project Handoff

Snapshot date: 2026-10-22, update #3 (replaces update #2 and all earlier versions; resolved history was removed on purpose to keep this file short). Written so that a new chat or a new coding agent can continue without asking the user to re-explain anything. **Section 13 is the current state; where it contradicts sections 1–12, section 13 wins.**

---

## 0. How to use this file

**বাংলায়:** নতুন চ্যাটে শুধু এই ফাইলটা আপলোড করো। প্রথম বার্তা: "Read QB_HUB_HANDOFF.md fully, then continue from section 13." ডেটার কাজ (MCQ, নতুন চ্যাপ্টার) না হলে JSON ফাইল বা `CQ & SQ.pdf` আপলোড করার দরকার নেই, ওগুলো বড় আর টোকেন খায়। ডেটার কাজ হলে শুধু তখনই `CQ & SQ.pdf` (আর দরকার হলে `chem-0X.json`) দাও।

**English (next assistant):** Read sections 1–3, then 13, then 9. Section 4 holds verified-data facts (do not re-derive, do not "fix" the data). Section 11 lists mistakes that already cost time.

---

## 1. The user and how to work with them

- Name: Tanjim (teacher/content creator; brand text in sample papers: "Tanjim Eduscript(s)"). Windows (`E:\QB Hub`). Uses **PowerShell** (sometimes Git Bash — commands differ, always say which one).
- Speaks Bangla. Reply in Bangla (casual "ভাই" tone is fine); write code, prompts for coding agents and technical identifiers in English.
- Very token/limit-conscious: coding agents run out of quota (Windsurf limit ran out on 2026-10-22; Freebuff is the fallback). Keep prompts tight, ask agents for short reports, avoid rework. Tiny fixes (a few lines) are better done by hand than by an agent.
- Accuracy of question data is the top priority. The user does not trust LLM-extracted text; every chapter was proof-checked against the PDF.
- Terminal commands: **one per code block.** His terminal has PSReadLine disabled (screen-reader warning), so pasting a second command often glues two commands into one line (`git status --shortgit status --short`). Tell him to press Esc to clear the line before pasting, or to type short commands by hand. Redirect form that works: `npm run e2e *> pwall.txt`, then `Get-Content pwall.txt | Select-Object -Last 15`.
- Think first, then give the prompt (the user asked for this order). Do not give an agent prompt until the cause of a failure is known; an agent given a vague failure just guesses.
- Shell check: in the 2026-10-22 evening session he was in **Git Bash** (prompt `msi9@Tanjim-Hassan MINGW64 /e/QB Hub`). There `tail`, `grep`, `ls` work and PowerShell cmdlets (`Select-Object`, `Get-Content`) do NOT; cmd batch files run via `cmd //c file.bat`. Always state which shell a command is for and prefer the form that fits the prompt he pastes.
- He asked for this handoff file to be refreshed **before** any chat pause. Coding-agent quotas (Windsurf, Freebuff) are tight, but an agent did finish the MCQ app work in update #3. MCQ explanations ("ব্যাখ্যা") are deliberately skipped; maybe add later as an optional `explanation` field.
- He pastes agent reports as attachments. Verify them (rule 11.2) and always end with a short numbered test checklist: commands for his shell (Git Bash), one per block, plus what to look at in the browser.
- Stars (★) in the book are not needed; the field stays in the data, hidden in the UI.

## 2. Project goal and scope

A Bangla question bank for teachers (admin/teacher only for now) from which they build **printable question papers** (A4 print / PDF) and **chapter-wise suggestion sheets**.

- Now: Chemistry (রসায়ন), chapters 6–10, types **CQ** (সৃজনশীল), **SQ** (সংক্ষিপ্ত) and **MCQ** (বহুনির্বাচনী). CQ/SQ answers are `null` everywhere; MCQ `correct_option` is filled from the book. Neither answers nor `correct_option` may ever print.
- Later (in this order): real Supabase deployment → online exams (MCQ only first) with a student-facing home page → more subjects (physics, math, biology). MCQ data and MCQ support in the app are done; testing is in progress (see 13).
- Out of scope for now: OMR, answer sheets, student submissions, grading.
- Schema stays extensible: `subject`, `type` enum (CQ/SQ/MCQ), nullable `options`/`correct_option`, nullable `topic`.

## 3. Tech and environment

- Next.js 15.5.28 (App Router), TypeScript strict, Tailwind, zod, KaTeX + mhchem (`\ce{}`), Playwright (server-side PDF via headless Chromium), vitest, Playwright e2e, Supabase planned, **not provisioned**.
- **Local demo mode:** project-root `.env.local` has `DATA_SOURCE=local`; no login; edits stored in `local-data/` (`questions.json`, `papers.json`). **Never deploy local mode publicly.**
- Run: `start-app.bat` (does NOT build; runs `npm start` on port **3100** and opens the browser). After code changes **or after any e2e run / failed build**: `npm run build` then `npx next start -p 3100` (**there is no `update-app.bat` in the project root; only `start-app.bat` exists** — it does not build). If the cmd window opens and closes at once, `.next` has no production build (symptom: `npm start` says "Could not find a production build"); fix with `npm run build`, then `start-app.bat`. Running `npm start` directly uses port 3000, not 3100. Dev mode is slow; use production mode.
- Scripts: `npx tsx scripts/import.ts ./data --dry-run` (149 CQ/SQ items), `npx tsx scripts/import.ts ./Chemistry/mcq --dry-run` (192 MCQ items), `npx tsx scripts/check-data.ts ./data`, `npx vitest run`, `npm run e2e`, `npm run build`, `npm run lint`, `npx tsc --noEmit`.
- Folders: `app/`, `components/` (shell, workspace, builder, paper, print, ui…), `lib/` (schemas, paper model/totals/sections/sizes, pdf/, import/, data stores), `scripts/`, `e2e/` (+ `e2e/utils/`), `supabase/migrations/0001_init.sql`, `screenshots/`, `docs/ui-inventory.md`.

## 4. Source book and data (VERIFIED — do not alter)

Source: `CQ & SQ.pdf` (126 pages, "রসায়ন - CQ ও SQ সাজেশন", SSC 2027). Page ranges (1-based):

| Chapter | Name | Pages |
|---|---|---|
| 6 | মোলের ধারণা ও রাসায়নিক গণনা | 54 (heading) – 68 |
| 7 | রাসায়নিক বিক্রিয়া | 69 – 82 (SQ 69–72, CQ 72–82) |
| 8 | রসায়ন ও শক্তি | 83 – 88/89 |
| 9 | এসিড-ক্ষারক সমতা | 89 – 95 (SQ 89–90, CQ 91–95) |
| 10 | খনিজ সম্পদ: ধাতু-অধাতু | 96 – 100 |
| 11 | আমাদের জীবনে রসায়ন | starts p.100 (not in scope) |

### 4.1 Final files and counts (149 items = 92 SQ + 57 CQ; the 192 MCQs are in 4.7, total 341)

| File | SQ | CQ | Total | SHA-256 (PowerShell `Get-FileHash`) |
|---|---|---|---|---|
| chem-06.json | 28 | 19 | 47 | 331D68DF0E1A9EED0CD6F5F377DD81C0AB5551FBE7741A1FA25F81493CED902F |
| chem-07.json | 28 | 17 | 45 | 3EB78428119B98B68068328774EB1ADBE51673DD0A92C35F93A10478226DB797 |
| chem-08.json | 11 | 7 | 18 | 3B12AF061BC446EB9ED973A2B7D16EC4DC836AEB9F77A2D6935ADDF5D8744D1F |
| chem-09.json | 19 | 8 | 27 | E2E8A669463BE28CEBF1D6F1C29A375A89F1FCF2A68085854898D2852E4C0BE8 |
| chem-10.json | 6 | 6 | 12 | 870AB69CAB42D50E66FDC9B508694099688C499ED474D800F7C59B3D3249862C |

chem-08's hash is the delivered file with exactly one edit (`chem-08-cq-006.jpg` → `.png`; the image is really a PNG). The originally delivered hash was `8BD07BFD…5319`.

### 4.2 Two folders, one source of truth

- `Chemistry/data/` (+ `Chemistry/data/images/`) = **source of truth**, hashes above.
- `data/` (+ `data/images/`) = the app's copy, byte-identical. Verified identical on 2026-10-21; `git diff --stat -- data Chemistry` has been empty since.
- Earlier, a coding agent silently modified `data/chem-09.json` and `chem-10.json` (bad versions are in commit `8cfdeea`). Resolved. Rule: never edit data files; after every agent session run `git diff --stat -- data Chemistry` (must be empty).

### 4.3 JSON schema (array of items)

SQ:
```json
{"id":"chem-06-sq-001","subject":"chemistry","chapter":6,"type":"SQ","stars":null,"boards":["বরিশাল বোর্ড ২০২৬"],"question":"…","answer":null,"flags":[]}
```
CQ:
```json
{"id":"chem-06-cq-001","subject":"chemistry","chapter":6,"type":"CQ","stars":null,"boards":["…"],"stem":["line 1","line 2"],"image":"chem-06-cq-001.png","image_desc":"…","parts":[{"label":"ক","marks":1,"text":"…","answer":null},{"label":"খ","marks":2,…},{"label":"গ","marks":3,…},{"label":"ঘ","marks":4,…}],"flags":[]}
```
- `id` is the stable key; import is idempotent (upsert by id). `stem` is an array of strings (may be empty; a label-only line like `"(ii)"` is intentionally followed by the image). `image` may be `null`/`"none"`.
- Text may contain plain Unicode chemistry (H₂O) AND LaTeX in `$...$` with mhchem (`$\ce{C4H10 + Cl2 -> C4H9Cl + HCl}$`, `$\Delta H$`, `\xrightarrow{\Delta}`, `\rightleftharpoons`, `\text{...}`). In the parsed string there is **one** backslash (`\ce`); the JSON file text has `\\ce`. Double-escaped data (`\\ce` in the parsed string) is a bug.
- `flags` = admin-only warnings (never print). `stars` is non-null in chapters 7–10 (copied from the book, may be off by one) — ignore.
- Part marks are always 1/2/3/4 (CQ = 10). SQ = 2.
- Planned optional field: `topic` (nullable string, the book's section heading). Not in the data yet.

### 4.4 Images (18, PNG)

ch6 CQ: 001, 005, 009, 010, 012, 013, 014, 015, 017 · ch7 CQ: 011, 014 · ch8 CQ: 006 · ch9 CQ: 001, 002, 004, 005, 006, 008 · ch10: none. File name = `{id}.png`; the app uses the filename in the JSON `image` field.

### 4.5 Known content quirks (in the book — do not "fix")

- ch6 CQ7 (ii) `Pb(NO3)2 → PbO + y + O2` and ch7 CQ18 / ch8 CQ5 (i) `SiCl4 + H2O → Si(OH)4 + HCl` are **unbalanced in the book's stem**.
- ch8 CQ3 (i): stem says `+481 kJ`; the book's own solution derives C–Cl = 708 kJ/mol (inconsistent with ch8 CQ2's 326). Left as printed.
- Partly covered lines in the book (flagged in JSON, worth one more look): ch6 CQ2(গ), CQ5(খ), CQ13(ঘ), CQ14(গ), CQ15(ঘ), CQ17(গ). ch9 CQ8(খ) also partly covered (not flagged).
- ch7 SQ2 says "লোহায় মরিচা পড়া"; the book may read "লোহার" — unverified. ch7 CQ6(খ) uses "সবল এসিড ও সবল ক্ষার" (book prints "সকল এসিড ও সবল ক্ষার").
- Near-duplicate questions across boards exist (e.g. three "মৌমাছি কামড়ালে চুন" SQs in ch9).
- Some stems use Latin digits (e.g. "360 গ্রাম") — that is how the book prints them.

### 4.6 How the data was verified (reuse for new chapters/MCQ)

1. Never trust NotebookLM/DeepSeek text; use it only as a draft.
2. Board-year tags: `pdftotext -bbox` keeps Bangla **digits** intact (letters are garbled) → extract year tokens per page and compare sequences/counts with the JSON.
3. Question text, stems, stars, board names: render pages (`pdftoppm -r 90..110`) and read; crop header lines at 150–200 dpi when a digit is uncertain (a year was once misread as ২০২৮).
4. Diagrams: `pdfimages -list` to find content images (ignore the 965×995 watermark and 33×33 icons), extract with `pdfimages -png`, map by page/position.
5. Count questions per page from year tags; DeepSeek/NotebookLM silently dropped or merged questions (NotebookLM listed 20 SQ for ch6, the book has 28; DeepSeek ch7 had 22 SQ, the book has 28).

### 4.7 MCQ data (DONE and verified, 192 items) — source, rules, location

- Source book: `MCQ.pdf` (59 pages, A4, two columns, "রসায়ন - MCQ সাজেশন, SSC 2027"). **Its Bangla text layer is garbled** (letters wrong; digits and the answer letter ক/খ/গ/ঘ intact), so never feed PDF text to DeepSeek or any text-only model; read pages as images (`pdftoppm -png -r 130`). The extract `acs_mcq_6-10.pdf` (24 pages = printed pages 26–49, PDF page n = printed page n+25) was used for verification.
- Every question has a printed answer line ("উত্তর: (খ) …") and a "ব্যাখ্যা". `correct_option` IS filled from the book; `answer` stays null; explanations are skipped.
- Chapters start mid-page; question numbers restart at ০১ per chapter and are contiguous. Page map (printed page = PDF page of MCQ.pdf):

| Chapter | Pages | MCQs | Notes |
|---|---|---|---|
| 6 | 26 (below the ch.6 bar) – 32 (top, Q48) | 48 | skip Q55–58 at top of p26 (ch.5) |
| 7 | 32 (below the ch.7 bar, Q01–07) – 38 (top, Q48–52) | 52 | |
| 8 | 38 (below the ch.8 bar) – 42 (top, Q30) | 30 | |
| 9 | 42 (below the ch.9 bar) – 46 (top, Q32) | 32 | |
| 10 | 46 (below the ch.10 bar) – 49 (top, Q27–30) | 30 | skip ch.11 on p49 |

- **Final files and SHA-256** (192 items; `Get-FileHash` in PowerShell, `sha256sum | tr a-f A-F` in Git Bash):

| File | Items | SHA-256 |
|---|---|---|
| chem-06-mcq.json | 48 | 18DEA2B7EB552A88DB0598B88BF99C5DEAC72BF2E6596D79E1AED32B99C91620 |
| chem-07-mcq.json | 52 | 2F356B323F33BD67023B138F36F8740E1454B7FDF3DC20BF00E97A2A36142CA3 |
| chem-08-mcq.json | 30 | 079240BA02474379A9326D11750EB2D057025805F71EE0A98E6FD1F65BDB3B28 |
| chem-09-mcq.json | 32 | AAC7425751868507E9C0CF5A93533D9DFDB5BBCB74B5AFD513F2ED1994CA5958 |
| chem-10-mcq.json | 30 | 2AA54293D82D5C4AA75BBA831F47854725AD404DC19D85C1D899E25A7698351E |

  chem-07's hash is the version after the one fix below; an older copy without it has a different hash.
- **Where the files live:** `Chemistry/mcq/` only. Since update #3 the local loader reads `data/*.json` **and** `Chemistry/mcq/*.json` (agent's design choice). Do **not** also copy the MCQ files into `data/` or `Chemistry/data/` (same ids would appear twice; duplicate handling was not checked). `scripts/import.ts ./Chemistry/mcq` imports them; for Supabase later import both folders.
- JSON conventions (file per chapter, array, keys in this order: `id, subject, chapter, type, stars, boards, stem, image, question, options, correct_option, answer, flags, source_no, page`):
  - `id` = `chem-<ch 2 digits>-mcq-<printed number, 3 digits>`; `source_no` = printed number; `page` = printed page where the question starts; `stars` null; `image` null; `answer` null; `flags` [] unless something is unreadable.
  - `boards`: the bracket tag split on `;`, text exactly as printed (Bangla digits).
  - Plain question: `stem` = [] and `question` = the text. Statement questions (i, ii, iii): `question` = the lead line (may end with "–"), `stem` = each statement as one string **plus the final line "নিচের কোনটি সঠিক?"**, options "i ও ii" etc. Shared-stimulus questions: the stimulus lines go into `stem` of every question that uses it.
  - Formulas as `$\ce{...}$` (single backslash in the parsed string, `\\ce` in the file text), powers like `$10^{-7}$`, `$\Delta H$`; units/words plain. NFC-normalized. Book spellings kept (e.g. "মিথ্যানল", "আকাধিক").
- **Verification done on 2026-10-22:** (1) format script on all five files: key order, unique/contiguous ids, exactly 4 options ক খ গ ঘ, `correct_option` set, NFC, no zero-width chars, single escaping, statement questions end their stem with "নিচের কোনটি সঠিক?", page order. (2) Per-page multiset of answer letters and board-year tokens vs the PDF text layer: exact match on printed pages 27–48; pages 26 and 49 also contain out-of-scope ch.5 / ch.11 items and the in-scope part matches. (3) Column-aware answer-letter sequence matches in order on every page (pp 38 and 49 confirmed on page images). Question/option words and formulas were read from images once; only ch.7 p32 and the tops of pp 38/49 were re-read, so a human spot-check is still worth doing (start with the flagged items).
- **One fix made in verification:** ch07 Q5 boards was a single string "বরিশাল বোর্ড ২০২৫, ২০২৩" (the book prints a comma instead of `;`); now two entries.
- **Flagged items (5):** ch6 Q8, Q18, Q19 (no stimulus printed; the book shows a stray "=== PAGE 288 ===" instead, so Q18/Q19 cannot be used alone in a paper); ch9 Q31 (i/ii/iii printed on one line, split in stem); ch10 Q6 ("আকাধিক" kept as printed). ch10 Q2's stem is a flattened table with `|` and `;`.

## 5. App features (implemented)

Dashboard `/admin`, question workspace `/admin/bank` (Workspace v2, see 8.2), papers list, 3-step paper builder (১ প্রশ্ন বাছাই → ২ পেপার সাজানো → ৩ প্রিন্ট/PDF) with live A4 preview, margin guide, zoom.

Paper settings: institution/exam/class/subject/chapters, set code ক/খ + shuffle, instruction lines, per-section "যেকোনো N টি × marks = total", modes "পরীক্ষা" and "সাজেশন শীট", grouping by chapter or by type, 1/2 columns, font size, spacing, figure size (small/medium/large = max 40/55/75 mm), keep-questions-together, page size (A4/A5/Letter/Legal), margins, watermark, board tags (opt-in), Bangla page numbers via `@page` margin boxes.

Also: `/admin/import` (paste/upload JSON with validation report), `scripts/check-data.ts`, command palette (cmdk), toasts, skeletons, print preview, server PDF (`/api/pdf`, Chromium reuse + cache), print token for `/print/[id]`.

## 6. Git

- Branch master, **not pushed**. `.gitignore` includes: `node_modules/ .next/ .env* local-data/ local-data.bak/ .freebuff/ freebuff-sites-build/ playwright-report/ test-results/ *.tsbuildinfo next-env.d.ts screenshots/*.pdf pw*.txt`.
- Commits (oldest → newest, confirmed): `8cfdeea` workspace v2 → `d89c696` fix tsc errors → `880ed77` fix build / NFC on import → `3bbb0ca` untrack generated pdfs → `b11f7f7` ignore generated pdfs, update screenshots → `16fbfdc` nfc runtime loader, e2e selectors for workspace v2 → `e2df5fb` fix unionBox NaN and y-edge, per-test timeouts → `992b686` remove scratch logs, ignore pw*.txt. After the last full e2e run, `screenshots/*.png` may show as modified (the e2e rewrites them; harmless) — commit "e2e green: 13 passed" if not done.
- Tracked files include `data/*.json` and `data/images/` = the whole question compilation, and `.env.example` (placeholders only, no secrets). **GitHub repo must be private.** Before pushing: `git ls-files | Select-String "\.pdf|\.env"` (expect only `.env.example`). Commits contain the user's email.
- `local-data.bak/` is a manual backup of the local store.

## 7. Print / PDF status (all four earlier defects are closed)

Verified by e2e (13/13 passed on 2026-10-22) AND by a real server-PDF review of a 2-column chapter 6+7 paper (4 CQ + 6 SQ, 2 pages, A4):

1. Server PDF formula garbling (stray italic X over subscripts): fixed. e2e `print-layout:558` compares server PDF vs browser print pixel by pixel on the formula line (< 2 % difference) and checks no MathML, KaTeX fonts loaded, mhchem spacer stays transparent in screen and print.
2. Running header: appears only from page 2 (`print-layout:525`, and seen in the real PDF).
3. Instruction lines: one N shared with the section heading, no duplicate, "সবগুলো প্রশ্নের উত্তর দাও" when N = count, default general instruction steps aside when a section has a choice (`print-layout:666`). In the real PDF (no choice sections) the wording was consistent. **Not yet seen in a real PDF with a "যেকোনো N টি" section** (optional check).
4. Right column clipping: not observed in the 2-column PDF; marks brackets aligned, long lines wrap, figures stay inside the column.

Observations from the real PDF (not defects):
- ~25 % blank space at the bottom of page 1: CQ4 did not fit, keep-questions-together moved it whole to page 2. Intended behaviour; reduce font/spacing if less white space is wanted.
- No vertical divider line between the two columns (pixel check found none). Earlier notes said "1/2 columns with divider" — check whether it is a separate option that was off; if there is no such option, decide whether to add one.
- PDF text layer: copy/paste from the PDF yields stray `X` in formulas (mhchem invisible spacers, e.g. `NX2OX4`) and broken Bangla conjuncts. Printing is unaffected. Low priority. This is also why PDF tests must not assert on extracted Bangla text.

## 8. UI decisions

### 8.1 Design tokens (implemented)
bg `#F6F5F2`, surface `#FFFFFF`, border `#E7E4DD`, text `#1F2430`, muted `#6B7280`, primary `#1E40AF`, danger `#B42318`; subject dots: chemistry `#0F9D8A`, physics `#2563EB`, math `#D97706`, biology `#16A34A`; type tags: SQ `#E6F4F1/#0B6B5D`, CQ `#FDF1DC/#8A5300`, MCQ `#EEE8FB/#5B3FB3`; radius 12/8 px; 1 px borders; 150 ms motion; Noto Sans Bengali 15px/1.7. Printed output stays pure black on white (test exists). Selection colour = green `#16A34A`.

### 8.2 Workspace v2 (reading-first, modeled on the user's reference: e-prosnobank "view-questions")
- No right-hand paper panel. Sticky top bar: editable title, "N নির্বাচিত · M নম্বর" + optional target marks + progress, buttons [তালিকা] (slide-over drawer: grouped items, drag reorder, per-section "যেকোনো [N]/M", remove, live totals), [সব নির্বাচন/বাতিল for filtered results, with confirmation], [এলোমেলো যোগ], [প্রিভিউ], [সেভ], floating "Top ↑".
- Centered column (~920 px) of fully open cards, virtualized scroll; click anywhere on a card selects (green border + wash + check badge). Card root `div[data-question-id]` now also exposes `data-selected="true|false"` (used by e2e). Shift+click range; keys j/k/Space/e/`/`/Esc. Board tag top-right with abbreviations + "+N". CQ figure as thumbnail with lightbox. Toggle "খোলা | সংক্ষিপ্ত". Type segmented control with type lock. Left filter rail: chapters with SQ/CQ counts, boards, flagged, used/unused, optional topic group. Stars hidden. Question text in Noto Serif Bengali (self-hosted via `next/font`).
- Do **not** copy the reference's ads/promos/affiliate cards or page-by-page loading spinner.
- Reserve a hidden "উত্তর দেখুন" slot for future answers; card must be MCQ-ready (2×2 option tiles).

## 9. Roadmap and ready-to-paste material

### Step 3 — "Prompt 3" (optional features; after MCQ if effort/quota is tight)
Dashboard (chapter × type table, flagged count, recent papers, quick actions); **undo for destructive actions** ("মোছা হয়েছে — পূর্বাবস্থায় ফেরান" 10 s toast + "সম্প্রতি মোছা" list for 30 days; a question was once deleted by accident); draft autosave of the paper under construction; near-duplicate grouping (display only: same subject+chapter+type and identical normalized text → one row, merged boards, "N টি অনুরূপ" badge, never edit stored data) and a non-blocking warning when a paper contains two near-duplicates.

### Step 4 — MCQ (DONE: data verified; app support implemented by a coding agent in update #3; manual test and full e2e pending, see 13)
Not implemented on purpose (optional later): answer key on the last page (only if every MCQ has `correct_option`, off by default) and an `explanation` field.

MCQ item shape:
```json
{"id":"chem-06-mcq-001","subject":"chemistry","chapter":6,"type":"MCQ","stars":null,"boards":["ঢাকা বোর্ড ২০২৪"],"stem":[],"image":null,"question":"…","options":[{"label":"ক","text":"…"},{"label":"খ","text":"…"},{"label":"গ","text":"…"},{"label":"ঘ","text":"…"}],"correct_option":null,"answer":null,"flags":[],"source_no":1,"page":12}
```

MCQ transcription prompt (kept for future subjects; DeepSeek or similar, ≤15 questions per call; rule 7 only applies if the source prints answers):
```
You are a careful data-entry transcriber. Convert the MCQ pages I give you into a JSON array, copying the source EXACTLY. Output ONLY the JSON array, no commentary, no markdown fences.
Rules:
1. Copy text exactly as printed. Never rewrite, translate, correct, complete or improve anything. If a word or symbol is unreadable write [?] and add a note to that item's "flags".
2. Do not skip or invent questions. Keep the printed question number in "source_no" and the printed page number in "page"; if the source has a gap, add a flag instead of renumbering.
3. Each item uses exactly these keys: id, subject ("chemistry"), chapter (integer), type ("MCQ"), stars (null), boards, stem, image, question, options, correct_option, answer (null), flags, source_no, page.
4. "options" has EXACTLY four objects with labels ক, খ, গ, ঘ in printed order. Never merge or drop an option.
5. "boards": from the bracket tag, e.g. [ঢাকা বোর্ড ২০২৪; রাজশাহী বোর্ড ২০২৩] -> ["ঢাকা বোর্ড ২০২৪","রাজশাহী বোর্ড ২০২৩"]; empty array if none.
6. "stem": for stimulus questions each line of the stimulus is one string; for "i, ii, iii" statement questions each statement is one string; otherwise [].
7. "correct_option": the label ONLY if an answer key is printed in the source; otherwise null. Never guess.
8. Formulas/ions/reactions in LaTeX inside $...$ with mhchem: $\ce{H2SO4}$, $\ce{SO4^2-}$, $\ce{N2 + 3H2 <=> 2NH3}$; plain math in $...$ (e.g. $\Delta H$). Do not mix Unicode subscripts with LaTeX in one expression.
9. JSON ESCAPING (critical): every backslash inside a JSON string is written as two backslashes ("$\\ce{H2O}$"). Never four.
10. Only Bangla letters/digits, ASCII and standard math symbols; no lookalike Latin letters inside Bangla words; no zero-width characters.
11. No extra keys; do not wrap the array in an object.
12. id format: chem-<chapter 2 digits>-mcq-<3 digits>, numbered in source order within the chapter, continuing from the number I give you.
Chapter: <N>. Start id number: <N>. Pages: <from>–<to>.
```

### Step 5 — Supabase + online exams (not started)
Create a free Supabase project, set `.env.local`, run `supabase/migrations/0001_init.sql`, create the public bucket `question-images`, run the real import (both `./data` and `./Chemistry/mcq`; check that `lib/data/supabase-store.ts` and the migration map MCQ `options`, `correct_option`, `source_no`, `page`), test auth (admin setup via `SETUP_SECRET`), RLS, `/print` token PDF path (untested against live Supabase). Online exam defaults decided: no student accounts (exam code/link + name + roll), MCQ only at first (needs `correct_option` for every question; publish blocked otherwise), correct answers never sent to the browser (server scores on submit), settings = duration, start/end time, shuffle questions/options, show result yes/no; teacher sees per-student marks, per-question correct rate, CSV export; home page `/` = "পরীক্ষা দিন" (enter code) + "শিক্ষক লগইন"; question bank stays behind login. CQ/SQ online later.

### Optional data task — `topic`
The book groups questions under headings (ch8: রাসায়নিক শক্তি, রাসায়নিক শক্তির ব্যবহার, তড়িৎ-রাসায়নিক প্রক্রিয়া, রাসায়নিক বিক্রিয়ার মাধ্যমে বিদ্যুৎ উৎপাদন, নিউক্লিয়ার বিক্রিয়া ও বিদ্যুৎ শক্তি উৎপাদন; ch9: এসিড, ক্ষারক এবং ক্ষার, গাঢ় এসিড ও গাঢ় ক্ষারের ক্ষয়কারী ধর্ম, pH এর ধারণা, প্রশমন বিক্রিয়া, পানি; ch10: খনিজ সম্পদ, ধাতু নিষ্কাশন, নির্বাচিত সংকর ধাতু, খনিজ অধাতু; ch7: পদার্থের পরিবর্তন, রাসায়নিক বিক্রিয়ার শ্রেণিবিভাগ, বিশেষ ধরনের রাসায়নিক বিক্রিয়া, বাস্তব ক্ষেত্রে সংঘটিত কয়েকটি রাসায়নিক বিক্রিয়ার উদাহরণ, বিক্রিয়ার গতিবেগ বা বিক্রিয়ার হার, …). The assistant can add a `topic` string to each item (read from the PDF; data hashes change → update the table in 4.1). The UI already supports an optional topic filter.

## 10. Command cheat-sheet (PowerShell, project root `E:\QB Hub`; one command per block when giving to the user)

```
git status --short
git add -A
git commit -m "message"
npx tsx scripts/import.ts ./data --dry-run
npx tsx scripts/import.ts ./Chemistry/mcq --dry-run
npx tsc --noEmit
npx vitest run 2>&1 | Select-Object -Last 8
npm run build 2>&1 | Select-Object -Last 12
npm run e2e *> pwall.txt
Get-Content pwall.txt | Select-Object -Last 15
npx playwright test e2e/<file>:<line> --timeout=180000 --reporter=line *> pw1.txt
git diff --stat -- data Chemistry
Get-FileHash Chemistry\data\chem-0*.json, Chemistry\data\chem-10.json, data\chem-0*.json, data\chem-10.json | Select-Object @{n='File';e={$_.Path.Replace('E:\QB Hub\','')}}, Hash | Format-Table -AutoSize
```
Notes: npm swallows `--dry-run` in `npm run import -- …`, so use `npx tsx scripts/import.ts ./data --dry-run`. `Select-String` has no `-Recurse` (use `Get-ChildItem … -Recurse -Include … | Select-String`). Git Bash has `grep/diff/tail`; PowerShell does not. Console shows Bangla/box characters as mojibake (terminal encoding only); edit Bangla text in the editor, never rewrite files with PowerShell redirection. Delete scratch logs (`pw*.txt`) after use. Full e2e takes ~2.3 min; do not run builds or other Playwright runs at the same time.

## 11. Rules and lessons learned (give these to every coding agent)

1. **Never edit `data/` or `Chemistry/data/`.** Derived info (image sizes etc.) is computed at load time. After every agent session: `git diff --stat -- data Chemistry` must be empty.
2. Demand command output (last lines) for tsc, lint, vitest, build, e2e. Agent reports without evidence were wrong at least twice (Windsurf said "done" with 16 tsc errors; another report said "rasterized to prove" without showing proof). When a report lacks evidence, check `git status`, `git diff --stat`, tsc, vitest yourself.
3. Do not run `npm run build` while type errors exist; commit before every agent session; one writer at a time on the working tree.
4. Keep prompts small and ordered; agents with limits stop mid-way — continue with "continue from item N". Every prompt ends with "Nothing else." (agents add unrequested features: OMR, answer sheets, extra paper sizes).
5. Do not trust LLM-transcribed question text, board names or years; verify against the PDF (4.6).
6. `.env.local` lives in the project root. Local mode = no auth; never deploy it.
7. After UI redesigns, re-check printed output: formulas (server PDF), page-1 header, instruction lines, clipped columns.
8. **e2e lessons:** (a) failing tests used to wait up to 180 s, so one run took 12 min — always run single tests with an explicit `--timeout`, and note that the server-PDF tests need more than 60 s on a cold Chromium (`paper-flow` tests now call `test.setTimeout(240_000)`); a too-short `--timeout` makes a healthy test look broken. (b) Never assert on Bangla text extracted from a PDF (conjuncts break); assert on the DOM or compare rasters. (c) Test helpers can be the bug: `unionBox` in `e2e/utils/pdf-raster.ts` used `Number.MAX` (undefined → NaN) and returned the top edge where `differingRatio` expects the bottom edge; fixed. Diagnose which side is wrong before changing app code or loosening thresholds. (d) Select cards in e2e via `[data-question-id="…"]` and `[data-selected="true"]`, not checkboxes or Tailwind classes.
9. Do not commit scratch output files; `git add -A` picks up everything not ignored.
10. Compare an agent's "what changed" list with `git status --short` and `git diff --stat`: in update #3 the agent made a design choice that was not in the prompt (loader also reads `Chemistry/mcq/`) and modified `lib/data/supabase-store.ts` without mentioning it. Ask for the diff of unexplained files.

---

## 13. Current state — 2026-10-22, update #3 (NEWEST)

### 13.1 Done and verified
- MCQ **data**: 192 items in 5 files, verified against the PDF (section 4.7).
- MCQ **app support**: implemented by a coding agent; its report arrived on 2026-10-22. Evidence in the pasted report (agent output, **not yet re-run by the user**): `import.ts ./Chemistry/mcq --dry-run` = 192 items, 0 skipped, 0 warnings; `import.ts ./data --dry-run` = 149 items, 0 skipped, 0 warnings; `tsc --noEmit` exit 0; lint clean; vitest 16 files / 143 tests passed (was 132); `npm run build` passed; targeted e2e `e2e/mcq.spec.ts` 1 passed (production build on port 3108); `git diff --stat -- data Chemistry` empty. `git status --short` showed 26 modified files, `e2e/mcq.spec.ts` new, and `QB_HUB_HANDOFF.md` staged.
- Bug-fix work from earlier today (new-paper reset, split "সব নির্বাচন"/"নির্বাচন মুছুন", bulk delete of papers): agent-verified; the user's manual browser results were not reported; commit requested.
- **Not done yet:** the user's own re-run of the checks, **full e2e (now expected 17 tests)**, manual browser test of MCQ (bank, builder, preview, real PDF), commit.

### 13.2 Code changes made (so the next agent does not undo them)
**MCQ support (update #3, from the agent's report):**
- Schema/import: `options` = `[{label,text}]`, exactly 4, labels ক খ গ ঘ in order; `correct_option` = a label or `null`; `source_no`/`page` known keys. Files: `lib/schemas/question.ts`, `lib/import/check.ts`, `lib/import/plan.ts`, `scripts/import.ts`.
- Loader: `lib/data/local-store.ts` reads `data/*.json` **and** `Chemistry/mcq/*.json`, NFC-normalised at load, files never written; `sourceQuestions()` is exported for tests.
- Bank: `components/workspace/question-card.tsx` MCQ card (stem lines, question, 2×2 option tiles, admin-only tint + "উত্তর" marker, `data-correct`); MCQ row-height estimate in `bank-workspace.tsx`; selection/drawer carry MCQ (`selection-context.tsx`, `paper-drawer.tsx`).
- Paper: MCQ section "বহুনির্বাচনী প্রশ্ন (MCQ)", 1 mark each, heading `N × ১ = N`, default order MCQ → SQ → CQ (saved orders win; missing types are appended), `mcqChoice` ("যেকোনো N টি") control in the builder, printed 2×2 option grid (single column for long options) in `components/paper/paper-document.tsx` + `app/globals.css`. `correct_option`, `flags` and the "উত্তর" marker never enter the document model.
- Also modified (check the diffs): `app/print/[id]/page.tsx`, `lib/schemas/paper.ts`, `lib/paper/model.ts`, `lib/paper/sections.ts`, `lib/paper/totals.ts`, `lib/render/rich-text.ts`, `lib/types.ts`, and **`lib/data/supabase-store.ts` (not mentioned in the agent's report)**.
- Tests: vitest 143 passed; new `e2e/mcq.spec.ts` (1 test).
- Agent's own warning: because the default order changed, old saved papers without an explicit `sectionOrder` print SQ before CQ; the other e2e specs were not re-run against this.

**Bug-fix session (earlier on 2026-10-22):**
- `components/selection/selection-context.tsx`: added `reset()` (entries + section choice) and exported `NEW_PAPER_EVENT`. `components/papers/new-paper-link.tsx` (new) is used by every "নতুন পেপার" button (`app/admin/page.tsx`, `app/admin/papers/page.tsx`, `components/shell/command-palette.tsx`); `components/builder/paper-builder.tsx` listens for `NEW_PAPER_EVENT` and resets title/sections/settings/step/items. Root cause of bug 1: the builder seeded its items from the shared selection context persisted in `localStorage` (`qbhub.selection.v2`) and "নতুন পেপার" only navigated. Nav tabs and dashboard cards keep the draft on purpose.
- Bug 2: the top-bar select-all/cancel was one toggle whose label became "বাতিল" whenever anything was selected, so "select all" cleared the selection. Now two independent controls in `components/workspace/sticky-bar.tsx` + `bank-workspace.tsx`: "সব নির্বাচন" (always selects all filtered results, keeps its confirmation) and "নির্বাচন মুছুন (N)" (only when N > 0).
- Bug 3: `components/papers/paper-list.tsx`: row checkboxes, header select-all, bulk bar, confirm dialog, bulk delete (papers only, not questions).
- `e2e/paper-fixes.spec.ts` (3 tests).
- Side finding: e2e runs write real papers into `local-data/` ("E2E রসায়ন মডেল টেস্ট" many times; dashboard showed 45 papers). Tests should clean up or use a separate data dir (not done). The user can now bulk-delete them (back up `local-data/` to `local-data.bak/` first if real papers exist).

**Earlier (unchanged, still valid):**
- `lib/images.ts` is client-safe only (`IMAGE_BUCKET`, `questionImageUrl`; never import `node:fs`/`node:path`); server-only `lib/image-dimensions.ts` holds `getImageDimensions`/`clearDimensionCache`; `lib/data/local-store.ts` imports from it.
- **NFC:** `chem-09.json`/`chem-10.json` contain precomposed U+09DC (ড়) and U+09DF (য়); NFC decomposes them. `lib/import/check.ts` rejects non-NFC text on purpose (keep that rule and its test). `scripts/import.ts` and `scripts/check-data.ts` normalize after `readFileSync`; **the runtime loader `sourceQuestions()` in `lib/data/local-store.ts` now normalizes too** (never written back to disk; a vitest covers it). Any future MCQ loader must do the same.
- `components/workspace/question-card.tsx`: card root has `data-selected="true|false"`.
- e2e: `addRows()`, drawer/view-mode/preview selectors updated for Workspace v2; `print-layout:525` assertion replaced by a DOM-based check; `e2e/utils/pdf-raster.ts` `unionBox` fixed (no `Number.MAX`; `y` = bottom edge, `height` spans bottom−pad to top+11+pad); `paper-flow` tests have per-test 240 s timeouts.

### 13.3 MCQ data progress (source and rules: section 4.7)
**192 / 192 done and verified.** Files in `Chemistry\mcq\`, hashes in 4.7. Explanations ("ব্যাখ্যা") deliberately skipped.

### 13.4 Open checklist
- [ ] User re-runs the quick checks (`git diff --stat -- data Chemistry` empty, `npx tsc --noEmit`, `npx vitest run` = 143 passed, `import.ts ./Chemistry/mcq --dry-run` = 192, SHA-256 of the five MCQ files vs 4.7), then the **full e2e** (`npm run e2e > pwall.txt 2>&1` in Git Bash; expect 17 passed), then `npm run build` and the manual browser test on port 3100.
- [ ] Review `git diff lib/data/supabase-store.ts` (modified, unexplained). Confirm the loader choice (single MCQ location `Chemistry/mcq/`, no copy into `data/`) or ask an agent to move it.
- [ ] Verify an old saved paper still prints as before (default order is now MCQ → SQ → CQ), and look at a real server PDF with an MCQ section (1 and 2 columns, statement questions, long options).
- [ ] Commit (Git Bash, one command per block): `git add -A` then `git commit -m "add MCQ support: schema, import, bank card, paper section, print"`.
- [ ] **Open bug (agent prompt already given earlier, not fixed yet):** toggle "প্রতিটি অধ্যায় নতুন পাতায় শুরু" (Advanced → মোড ও বিন্যাস) is OFF, but the downloaded PDF still starts each chapter on a new page. Suspects, in order: (1) server PDF reads the saved paper, not builder state / key-name mismatch between builder, zod schema and print component; (2) default `?? true` / `|| true` or old papers without the field; (3) print CSS `break-before: page` on chapter groups unconditionally; (4) PDF cache key ignores the setting. Quick test: toggle off → press সংরক্ষণ → download again. Needs a test: 2 short chapters, flag OFF → 1 page, ON → 2 pages.
- [ ] Clean up e2e pollution of `local-data/` (tests save real papers; bulk-delete them in the papers list, back up `local-data/` first if real papers exist).
- [ ] Decide on a column divider line; decide whether bottom-of-page blank space is acceptable; review Workspace v2 screenshots. Optional cosmetic: "তাপ" font size inside math in the PDF.
- [ ] Optional: MCQ answer key page, `explanation` field, `topic` field, Prompt 3 features (undo for deletes, draft autosave, near-duplicate grouping).
- [ ] Supabase + online exams (Step 5). Includes checking MCQ mapping in `supabase-store.ts` and the migration.
- [ ] GitHub: create a **private** repo and push as backup (checks in section 6).
- Going live on the internet: local demo mode must never be deployed. A public site needs Step 5 first.

### 13.5 When to refresh this handoff file
Ask the assistant to regenerate it (a) after each milestone (MCQ chapters done, bug fixed, Supabase connected, …), (b) before starting a long agent session, (c) whenever the chat gets long or the assistant starts forgetting earlier decisions. Upload only the newest copy and say: "Read QB_HUB_HANDOFF.md fully, then continue from section 13."
