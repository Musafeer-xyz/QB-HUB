# QB Hub (প্রশ্নব্যাংক) — Project Handoff

Snapshot date: 2026-11-04, update #16 (replaces update #15 and all earlier versions; resolved history was removed on purpose to keep this file short). The site is now LIVE (Vercel + Supabase). Written so that a new chat or a new coding agent can continue without asking the user to re-explain anything. **Section 13 is the current state; where it contradicts sections 1–12, section 13 wins.**

---

## 0. How to use this file

**বাংলায়:** নতুন চ্যাটে শুধু এই ফাইলটা আপলোড করো। প্রথম বার্তা: "Read QB_HUB_HANDOFF.md fully, then continue from section 13." ডেটার কাজ (MCQ, নতুন চ্যাপ্টার) না হলে JSON ফাইল বা `CQ & SQ.pdf` আপলোড করার দরকার নেই, ওগুলো বড় আর টোকেন খায়। ডেটার কাজ হলে শুধু তখনই `CQ & SQ.pdf` (আর দরকার হলে `chem-0X.json`) দাও।

**English (next assistant):** Read sections 1–3, then 13 (start with 13.17, then 13.16, 13.15 and 13.13; the old 13.14 was resolved history and has been removed, its corrections live in 13.15), then 9. Section 4 holds verified-data facts (do not re-derive, do not "fix" the data). Section 11 lists mistakes that already cost time.

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
- Update #4 session: he was in **PowerShell** again (not Git Bash). `env -u`, `tail`, `grep` fail there; use `$env:NAME="x"`, `Select-Object -Last N`, `Select-String`. Run `chcp 65001` first so Bangla is readable. He cannot always run a command per block: still give one per block.
- Agents used so far: Windsurf (account 1 quota ran out; account 2 also ran out mid prompt 3; resets 2026-10-23 14:00 GMT+6), Freebuff (about 1 h left on 2026-10-22). Always give an interrupted agent an AUDIT-FIRST prompt (see 11.11), never repeat the original prompt.
- Update #5 session: he was in **Git Bash** (prompt `msi9@Tanjim-Hassan UCRT64 /e/QB Hub`). Pasting sometimes injects `[200~` junk (bracketed paste) and the command fails with "command not found": tell him to paste again or type it. In Git Bash use `clip < file` or `notepad file` (PowerShell `Get-Content | Set-Clipboard` fails there). He prefers short, step-by-step instructions with the exact button names; screenshots of the Vercel/Supabase UI help a lot.
- Update #7 session: **Git Bash (UCRT64)** the whole time (one PowerShell-only command was given by mistake and failed). `sed -n 'a,bp'`, `grep -n`, `tail`, `find` work; `/tmp` works. He sends screenshots (VS Code, live site, file explorer) and pastes terminal output. He places small code edits by hand in VS Code when given exact replacement blocks. Agent prompt only after the cause is known; for several linked bugs a prompt that starts with a short cause report (Step 0) is fine. Terminal Bangla shows doubled letters/spaces in pasted output (e.g. `flags   s`, `no one`): that is the terminal, not the file; verify with `grep -c` or by opening the file in the editor.
- Update #15 session: **Git Bash (UCRT64)** again. He runs commands one per block and pastes the full output back; he commits with `git add <file>` one by one (paths containing `[id]` need quotes) and never `git add -A`. He sends agent reports as pasted text and screenshots of the live site. When he asks for an agent prompt, give the full prompt in one code block; commands for him stay one per block. He wants the handoff refreshed while an agent is working.
- Stars (★) in the book are not needed; the field stays in the data, hidden in the UI.

## 2. Project goal and scope

A Bangla question bank for teachers (admin/teacher only for now) from which they build **printable question papers** (A4 print / PDF) and **chapter-wise suggestion sheets**.

- Now: Chemistry (রসায়ন), chapters 6–10, types **CQ** (সৃজনশীল), **SQ** (সংক্ষিপ্ত) and **MCQ** (বহুনির্বাচনী). CQ/SQ answers are `null` everywhere; MCQ `correct_option` is filled from the book. Neither answers nor `correct_option` may ever print.
- Later (in this order): real Supabase deployment (code is ready, see 13) → online exams v1 (MCQ only; code partly written, see 13) → more subjects (physics, math, biology; needs a cheaper data-extraction pipeline, see 13.6).
- Out of scope for now: OMR, answer sheets, CQ/SQ grading, student accounts. (Online exam v1 = MCQ auto-grade only.)
- Schema stays extensible: `subject`, `type` enum (CQ/SQ/MCQ), nullable `options`/`correct_option`, nullable `topic`.

## 3. Tech and environment

- Next.js 15.5.28 (App Router), TypeScript strict, Tailwind, zod, KaTeX + mhchem (`\ce{}`), Playwright (server-side PDF via headless Chromium), vitest, Playwright e2e, Supabase **provisioned and live since update #5** (see 13).
- **Local demo mode:** project-root `.env.local` has `DATA_SOURCE=local` and, since update #4, also `ALLOW_LOCAL_DEMO=1` (required when NODE_ENV=production, which `start-app.bat` uses; without it the server refuses to start); no login; edits stored in `local-data/` (`questions.json`, `papers.json`). **Never deploy local mode publicly.**
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
- Part marks follow the label: ক=1, খ=2, গ=3, ঘ=4. Chemistry CQs have all four parts (CQ = 10). **Physics CQs may have only 1–4 of the parts, exactly as printed in the book (often only ঘ, or গ+ঘ)**; a CQ's total is the sum of the parts it has. Validator: `lib/import/check.ts` `structureProblems` (relaxed in update #7). SQ = 2.
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

### Step 5 — Supabase + online exams (code-ready as of update #4; nothing provisioned yet; follow docs/deploy.md; exam spec in 13.5)
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
11. **Interrupted agent (quota ran out):** never re-send the original prompt. Send an AUDIT-FIRST prompt: (1) `git status --short` + `npx tsc --noEmit`, report per spec item exists/missing/broken, no code changes; (2) finish only the missing parts; (3) targeted e2e first, full e2e once at the end; report leftovers in `local-data/` without hand-editing. Ask for real command output, not a summary (a summary-only "all done" report arrived once; the user had to run the checks himself).
12. Guard/env tests: `.env.local` is read by `next start` and can mask the test; PowerShell session variables (`$env:NODE_ENV="production"`) persist in that terminal, so open a fresh terminal afterwards. Bangla shown as mojibake is the terminal encoding (`chcp 65001`), not file corruption.


---

## 13. Current state — 2026-11-04, update #16 (NEWEST)

### 13.1 Live setup (done)
- **Live site:** https://tanjim-eduscripts.vercel.app (Vercel project `qb-hub`, renamed domain; GitHub repo `Musafeer-xyz/QB-HUB`, branch `master`; every `git push origin master` triggers an automatic deploy. Repo should be private; verify once in GitHub Settings). Host is Vercel **serverless**, so the server-side PDF (Chromium) is probably NOT working live: untested; PDFs are still made on the user's PC (`start-app.bat`, local mode). `docs/deploy.md` still says "not Vercel": ignore that line for the exam use.
- **Supabase:** free project `qb-hub` (project ref `vhynhpudevizxbifyacr`). Migrations 0001, 0002, 0003 were run by hand in the SQL Editor (copy a file via `notepad`, Ctrl+A, Ctrl+C; `clip` once pasted the file NAME instead). All three returned "Success. No rows returned" (normal).
- **Vercel env vars (4):** `NEXT_PUBLIC_SUPABASE_URL` (type Config; value MUST be `https://<ref>.supabase.co`, NOT a supabase.com/dashboard link: that caused CORS errors, `/api/setup/status` returning Supabase's 404 HTML, and login failing with "ইমেইল বা পাসওয়ার্ড ভুল"), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Config; publishable key), `SUPABASE_SERVICE_ROLE_KEY` (Secret; secret key), `SETUP_SECRET` (Secret). `NEXT_PUBLIC_*` are baked in at build: after changing them, Redeploy. Vercel shows Secret values as empty/greyed after saving: do not press Save on such a form (it can overwrite with empty). Do not add the Vercel "Supabase integration".
- First deploy failed once on `next/font` (`Noto_Serif_Bengali` fetch, TypeError reading '1'); a plain Redeploy fixed it (transient). If it recurs, look at `app/layout.tsx` font settings.
- **Admin account:** `/setup` is unreachable because `lib/supabase/middleware.ts` lists `/setup` in PROTECTED_PREFIXES (needs a login, which needs an admin: a design bug, NOT fixed on purpose; low priority). Workaround used: Supabase → Authentication → Users → Add user (Auto Confirm) then SQL `insert into public.admins (user_id) select id from auth.users where email = '<his email>';`. Login works at `/login`. Never ask for or store his password.
- **Data import to Supabase (done from his PC):** `.env.local` needs `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `DATA_SOURCE=local` (keeps the local app in local mode). `npm run import -- ./data` (149 CQ/SQ) and `npm run import -- ./Chemistry/mcq` (192 MCQ), dry-runs showed 0 skipped, 0 warnings. `npm run import -- <dir> --dry-run` DOES work (older note in section 10 saying npm swallows `--dry-run` is outdated). Import is an idempotent upsert by id.

### 13.2 Features shipped (all committed and pushed; vitest 192 tests, tsc/lint/build clean, `git diff --stat -- data Chemistry` empty)
- **Online exam v1** (spec 13.5 below) works live: admin creates exams in `/admin/exams`, students use `/exams` and `/exam/[id]`.
- **Admin guard:** `lib/admin-guard.ts` `requireAdmin()` on all six admin exam handlers (`/api/exams`, `/api/exams/[id]`, `/api/exams/[id]/results`). Earlier assumption "exam APIs are unauthenticated" was WRONG (inline checks existed; the shared guard just removes duplication). `/api/exams` is deliberately not a middleware prefix (it would block `/start`). **Verified live:** anonymous `GET /api/exams` returns 401 `{"error":"লগইন প্রয়োজন।"}`.
- **Answer-key safety:** start payload goes through `publicQuestions()` (no correct_option/answer/explanation); leak tests in `lib/exams.test.ts`. Correct answers are returned only by submit/result.
- **Branding:** `lib/brand.ts` `BRAND_NAME = "TANJIM EDUSCRIPTS"`, `components/brand-header.tsx` (centred) on all public screens; `/exams` title block "অনলাইন পরীক্ষা" + muted "ONLINE EXAM".
- **Result review:** every option shown after submit; correct = green ✓, wrong chosen = red ✗, unanswered note "দেওয়া হয়নি".
- **Subject sections on /exams:** `EXAM_SECTIONS` in `lib/subjects.ts` (CHEMISTRY, PHYSICS, MATH, HIGHER MATH with accent colours; empty = "শীঘ্রই আসছে"; unknown subject = "অন্যান্য"); stored values are mapped by aliases, never renamed (`groupOpenExamsBySection` in `lib/exams.ts`).
- **Question shuffle per attempt:** `seededQuestionOrder` / `seededOrder` in `lib/exams.ts` (seed = attempt id, so F5/resume and the review keep the same order; questions sharing a `stem` stay together). Options are deliberately NOT shuffled (options like "ক ও খ" would break).
- **Video section (built, pushed, live):** migration `0004_videos.sql` (run by hand in the SQL Editor), table `videos`, store methods in both stores, public `GET /api/videos`, admin `/api/videos/admin[/id]` with `requireAdmin()`, `lib/video.ts` `parseYoutubeId` (only the 11-char id is stored; embed `youtube-nocookie.com/embed/ID?rel=0&modestbranding=1`), pages `/videos` (subject sections, topic groups, thumbnails) and `/videos/[id]`, admin page `/admin/videos`. Videos should be Unlisted on YouTube with embedding allowed; ads cannot be fully removed (paid host later if needed). vitest 195 tests.
- **Public home `/`:** only two big cards, EXAM (`/exams`) and VIDEO (`/videos`); NO login link anywhere on public pages. Teachers open `/admin` directly (bookmark it); anonymous visitors are redirected to `/login` by the middleware, and after login `router.push(next ?? "/admin")` lands on `/admin`.
- **Admin:** top nav now has ড্যাশবোর্ড, প্রশ্নব্যাংক, পেপার, এক্সাম, ভিডিও, ইমপোর্ট; the `/admin` dashboard starts with two big cards (প্রশ্নব্যাংক -> `/admin/bank`, ভিডিও -> `/admin/videos`) above the unchanged stat cards, recent papers, quick start and chapter list. The header subject switcher is bank-only.
- Not yet confirmed by hand (as of this update): admin video add/edit/delete on the live site, different students get different orders, F5 keeps order, review order matches, `/exams` header centring on phone, Bangla fonts on phone.

### 13.3 Data
Chemistry 6–10 complete: CQ/SQ 149 + MCQ 192 (verified, section 4); live exams exist for ch8 (30 Q) and ch9 (32 Q) at least.

**Physics (subject id `physics`, CQ/SQ only, no MCQ yet):** live in Supabase since update #7: chapters 4, 7, 8, 10 = 97 items (CQ 38 + SQ 59; ch4 = 29, ch7 = 25, ch8 = 26, ch10 = 17) and 19 images. Files: `Physics/data/phy-04.json`, `phy-07.json`, `phy-08.json`, `phy-10.json` + `Physics/data/images/`; byte copies in `data/` and `data/images/` (so `npx tsx scripts/import.ts ./data --dry-run` = 246 items = 149 chemistry + 97 physics, 0 skipped, 0 warnings). Physics file hashes are not recorded yet (record once frozen). Physics CQs often print only some parts (e.g. only ঘ); the data keeps exactly what is printed. `phy-10` cq-001/002/007 give a harmless "প্রশ্ন ৮ অক্ষরের চেয়ে ছোট" warning in check-data (their stimulus is the image).

**Physics chapter 2 is LIVE (update #15, see 13.16):** `Physics/data/phy-02.json` (48 items: SQ 29, CQ 19) and 9 images are in Supabase, `Physics/data/` + `data/` and pushed (commit `b0f015c`). Physics now = 145 items (chapters 2, 4, 7, 8, 10). `./data` = 618 items (chemistry CQ/SQ 149 + physics 145 + math 324); the DB holds 810 in total (chemistry 341 incl. MCQ, physics 145, math 324).

**Math (subject id `math`, CQ/SQ only, no MCQ yet):** live in Supabase since update #12: chapters 3, 5, 8, 9, 11, 16 = 236 items (ch3 38, ch5 9, ch8 53, ch9 38, ch11 36, ch16 62) and 28 images. Details and pipeline in 13.13.

Other subjects (Higher Math, Biology) not started. Chemistry, physics and math are the templates.

### 13.4 Open checklist (in order)
- [ ] **Start here (update #15):** (1) DONE in update #15 (cq-006: DB subject restored by import `updated 1`, dropdown chemistry 341 / physics 145 / math 324; spelling fixed in both copies, `data/phy-02.json` synced in commit "Sync data/phy-02.json (cq-006 spelling)" — verified pushed in update #16 as 5d75271); (2) mobile UI: 4 modified files (`app/exams/page.tsx`, `app/videos/[id]/page.tsx`, `components/brand-footer.tsx`, `components/brand-header.tsx`), uncommitted; the user wants to plan the full mobile UI together with the assistant AFTER the other open items, so do not commit them yet (see 13.16, 13.17); (DONE: math ch 17 tables checked live by the user, "perfect"); (DONE: SQ figures live and checked on math-16-sq-015/020 in bank card, paper preview and print, update #16; figure caption bug fixed, see 13.17; still to do: look at the 9 re-flagged math items in 13.16, and check `/exam/[id]` for a caption under SQ figures); (5) confirm math CQ marks from the book (13.13); (6) Vercel Logs duration/cold start, then `prefetch={false}` on `/admin` links; (7) results CSV export; (8) Prompt B (fresh quota); (9) delete 2 test papers and test attempts; commit `QB_HUB_HANDOFF.md`.
- [ ] **New subject data (physics ch.2/4/7/8/10 done; Math/Higher Math/Biology next):** first ask which subject and which book/PDF, test whether the PDF has a correct Bangla text layer (13.6), then: produce JSON in the same shapes (4.3 / Step 4), put it in a NEW folder (e.g. `Physics/mcq`), keep `subject` strings consistent with an alias in `lib/subjects.ts` (check with `grep -n -i physics lib/subjects.ts`; the agent report mentioned an odd Arabic-script alias, harmless). Then: `npm run import -- ./Physics/mcq --dry-run` (must show 0 skipped / 0 warnings) → real import → create the exam in `/admin/exams` (students only see EXAMS, not raw questions) → commit data files and push as backup. NFC-normalise Bangla text (13.7). Pipeline ideas in 13.6.
- [ ] Hand checks on the live site (13.2 last bullet); delete test exams and test attempts from admin before sharing the link.
- [ ] Before real exams: Supabase free projects PAUSE after about a week without activity: open the dashboard and press Restore if paused.
- [x] `/api/pdf` live: CONFIRMED not working on Vercel (red toast "এই সার্ভারে Chromium চালু করা যায়নি…", same for chemistry). Open decision: keep PDFs local (`start-app.bat`) / browser print, or move to a Node host later.
- [ ] Check whether the admin results page has CSV export (spec 13.5 asks for it); if missing, a small agent task.
- [ ] Video section is DONE (13.2). Only the hand checks remain: add, edit, delete a video in `/admin/videos`; anonymous `/api/videos/admin` must return 401; confirm the YouTube video plays in `/videos/[id]`.
- [ ] Other feature ideas, in priority order: results CSV (admin), practice mode (no timer, by chapter), option shuffle only after auditing MCQs for "ক ও খ"/"সবগুলো" options.
- [ ] Old open bug (maybe still open): toggle "প্রতিটি অধ্যায় নতুন পাতায় শুরু" OFF still page-breaks per chapter in the PDF.
- [ ] Optional later: `/setup` middleware design fix, answer-key page, `explanation`, `topic`, near-duplicate grouping.

### 13.5 Online exam v1 — spec as built
Admin: in the bank, select MCQs → "এক্সাম বানাও" (title, duration, subject, chapter, "মিশ্র" if mixed; MCQs without `correct_option` rejected) → `/admin/exams` (list, open/close, delete, results). Student (public, no login, cannot customise): `/exams` open exams grouped by subject then chapter; `/exam/[id]` start screen (name required, ID optional), all questions on one page (KaTeX/mhchem), server-timed countdown, submit, resume after refresh by attempt id, result with review. Server: start creates the attempt with server `started_at` and returns questions WITHOUT answers; submit grades on the server (by question id), one submission per attempt, closed exam blocks start. Tables `exams`, `attempts` (migration 0003; no public RLS, all student access through server code with the service role); local mode uses `local-data/exams.json` + `attempts.json`. Out of scope: accounts, payments, CQ/SQ grading, negative marking, anti-cheat, analytics.

### 13.6 More subjects: cheaper data pipeline (idea, not started)
Scanning each book through an LLM is slow and token-hungry. (1) Test whether the source PDF has a correct Unicode Bangla text layer (copy-paste test); if yes, extract text with coordinates (PyMuPDF/pdfplumber) and parse structure deterministically (question numbers, ক খ গ ঘ options, [board] tags, page numbers, figure crops). (2) Use an LLM only for formulas to LaTeX/mhchem on flagged lines. (3) Cross-check two independent extractions and show only disagreements for human review (page image left, editable item right) using `lib/import/check.ts`. (4) Never trust a single LLM pass (rule 11.5). If the PDF is a scan or legacy Bijoy font, use the vision route with batching and the automatic validators. First action: test the text layer on 3 sample pages of the next subject. The MCQ transcription prompt in Step 4 can be reused (change `subject` and the id prefix).

### 13.7 Agents and refresh
Freebuff is the agent in use (about 30 min per big task); Windsurf quota ran out again on 2026-10-24 and resets 2026-10-25 14:00 GMT+6. Prompts so far always end with an evidence block (tsc, lint, vitest last 8, build, `git diff --stat -- data Chemistry` empty, `git status --short`) and "Nothing else."; keep that. After each milestone upload the newest copy of this file and start the new chat with: "Read QB_HUB_HANDOFF.md fully, then continue from section 13."

### 13.8 Update #7 (2026-10-24) — done, live-site problems, next

**Done** (tsc clean, vitest 203 pass, Vercel build passed; lint and full e2e were NOT re-run):
- CQ validator relaxed (`lib/import/check.ts` `structureProblems`): 1–4 parts, labels from ক/খ/গ/ঘ, unique and in order (gaps allowed), marks must equal the label (ক=1 খ=2 গ=3 ঘ=4). Tests in `lib/import/check.test.ts` (18 pass). Chemistry unaffected (dry-runs 149 + 192, 0 problems). No hard-coded 10-mark total was found; a one-part CQ shows `[৪]` and the paper total is the sum of the real parts (seen: 3 physics CQs = 11 marks).
- `Ω` (U+03A9) added to `ALLOWED_CHAR`.
- Paper builder is multi-subject: `components/builder/paper-builder.tsx` takes `state.subject` (and the default title "<বিষয়> — মডেল টেস্ট") from the first selected question and uses `subjectQuestions` (filtered) for chapters, auto-generate and the embedded BankWorkspace; `byId` (preview) keeps all questions. `app/api/questions/route.ts` now returns ALL subjects (loops `SUBJECTS`, pageSize 1000 each). This fixed the empty physics preview but made loading slower (problem 5).
- Physics ch.4/7/8/10 imported to Supabase (97 inserted, 0 skipped), see 13.3. Lessons: a whole-folder import aborts if any item is bad; to import only ready chapters copy their JSON + images into a temp folder (Git Bash `/tmp/phy-ready`, `images/` inside) and import that; `ls | head -20` can hide files.
- Confirmed at the end of the session: everything is committed and pushed (HEAD 6056c7a = origin/master; commits e6816ae validator, 646b44a builder, 6056c7a physics data + Ω). Only `Physics/data/phy-02.json` is untracked, on purpose.

**Problems seen on the live site (status after update #9: 1, 2, 3 fixed; 5 partly fixed, see 13.10; 6 fixed locally via print fallback, live check pending; 4, 7 open):**
1. Header subject switcher shows রসায়ন on `/admin/papers/new` and `/admin/papers/<id>/edit` even when the paper is physics (those URLs carry no `?subject=`; bank/dashboard URLs do).
2. Clicking "সংরক্ষণ" on step 2 of a new paper lands on `/admin/papers/<id>/edit` at step 1 (it should stay on the step); `/admin/papers/new?step=2` sometimes renders step 1.
3. Header dropdown shows "ডেটা নেই" next to subjects that have data (physics has 97).
4. Paper builder step 1 and `/admin/bank` look different (the builder embeds BankWorkspace with other chrome). The user wants one consistent UI now that subjects grow. Do this AFTER problems 1–3, 5, otherwise it breaks again.
5. Speed: physics preview is slow (every builder load fetches all subjects × 1000 plus an image-exists check); the exam site takes about 2 s per click. Suspects, unchecked: Vercel function region far from the Supabase region (every query crosses an ocean), cold starts on the free plan, sequential queries. Check Vercel → Project → Settings → Functions (function region) against the Supabase project region.
6. PDF on the live site fails (red toast, Chromium unavailable on Vercel). Workarounds: local app (`start-app.bat`) for PDF, or browser print ("প্রিন্ট" → Save as PDF).
7. Dashboard "সংরক্ষিত পেপার" / recent papers are not subject-filtered (physics dashboard lists chemistry papers; maybe intended). Two test papers ("রসায়ন প্রথম পত্র — মডেল টেস্ট", 2 questions, 20 marks) are saved; delete before sharing the site.

**Prompt A (DONE in update #8, kept for reference; Windsurf quota resets 2026-10-25 14:00 GMT+6, otherwise Freebuff):**
```
Task: make the current subject a single, consistent source of truth in the admin area, and stop loading all subjects at once. Do NOT touch data/, Physics/, Chemistry/ or the PDF code.

Observed on the live site (physics data, 97 items):
1. On /admin/papers/new and /admin/papers/<id>/edit the header subject switcher shows রসায়ন even when the paper's questions are physics.
2. Clicking "সংরক্ষণ" on step 2 of a new paper lands on /admin/papers/<id>/edit at step 1 (should stay on the step the user was on). Also /admin/papers/new?step=2 sometimes renders step 1.
3. The header subject dropdown shows "ডেটা নেই" for physics although it has 97 questions.
4. GET /api/questions returns all subjects (loops SUBJECTS x 1000) on every builder load: slow.

Step 0 (before changing code, report in 10 lines max): for each of the 4 items name the file and line that causes it.
Step 1: the current subject is: ?subject= in the URL if present; on /admin/papers/<id>/edit the paper's own subject; on a new paper the subject of the selected questions; otherwise the default. The header switcher must show it on every admin page and keep it when navigating (internal links carry it).
Step 2: GET /api/questions accepts ?subject=<id> and returns only that subject (missing param = chemistry, as before). The builder passes its subject. No all-subject fetch anywhere.
Step 3: after saving a new paper keep the same step (router.replace with ?step=N, no reset to step 1).
Step 4: the dropdown's data indicator uses real per-subject counts.
Minimal changes: no redesign, no new features. Add vitest tests only for pure logic you touch. Do not run the full e2e suite.

Finish with evidence only: tsc --noEmit, lint, vitest last 8 lines, build last 12 lines, git diff --stat -- data Chemistry Physics (must be empty), git status --short. Nothing else.
```
After Prompt A: recheck live (physics paper → header stays physics, save stays on step, dropdown counts, preview fast), then write Prompt B (unify builder/bank UI) from screenshots, then decide on PDF hosting and the speed check (region).

### 13.9 Update #8 (2026-10-24 night)

**Prompt A finished, committed and pushed (`25f6174`, 14 files).** Root causes found by the agent (Step 0): header subject came only from `?subject=` (default chemistry); the builder's `router.replace` dropped `?step=` (plus a mount-only step read and `NEW_PAPER_EVENT` reset it); `physics.hasData: false` was hard-coded in `lib/subjects.ts`; `/api/questions` looped over all SUBJECTS. Fix: `lib/admin-subject.ts` (URL → paper → selection → default; `withSubject` for links), `components/shell/subject-context.tsx`, `/api/questions?subject=` (no param = chemistry), new admin-guarded `/api/questions/counts` (one `pageSize: 1` query per subject, fetched only when the dropdown is first opened), `hasData` removed. Evidence: tsc, lint, vitest 212, build clean; `data/ Chemistry/ Physics/` untouched; e2e not run. **Live-verified by the user:** header stays পদার্থবিজ্ঞান on paper pages, saving stays on the same step (`/edit?step=2&subject=physics`), dropdown counts correct (chemistry 341, physics 97), physics preview faster.

**Speed:** the user set the Vercel function region equal to the Supabase region (value not recorded); "somewhat faster", wants more (exam site was ~2 s per click). Measure before changing anything: DevTools → Network → click a slow page → "Waiting for server response" (TTFB) of the document/RSC request. High = server/DB side (suspects, unchecked: the middleware `getUser()` auth call on every request, sequential queries, cold starts); low = client rendering/bundle size.

**PDF:** live "PDF ডাউনলোড" still shows the red Chromium toast; "প্রিন্ট" → Save as PDF works on live; the local app makes PDFs fine. Recommended next (cause known): make the live PDF button fall back to the print flow with a short info toast instead of an error. Bigger options later: real server PDF on Vercel (`@sparticuz/chromium`; risks: function time/size limits, Bangla fonts) or a Node host.

**Prompt B (not written yet):** unify the paper-builder step 1 and `/admin/bank` look; write it from fresh screenshots now that the subject plumbing is fixed.

### 13.10 Update #9 (2026-10-25) — Prompt C and PDF fallback (committed and pushed as ce0d168; live check pending at time of writing)

**Prompt C.** Cause: the builder fetched with `state.subject` (default `"chemistry"`) before the real subject was resolved, so physics paper = chemistry request, then physics request (seen in DevTools: 743 ms + 598 ms). Fix: `resolveBuilderSubject` in `lib/admin-subject.ts` (paper → `?subject=` → tray → default), resolved with `useMemo` before fetching, so exactly one `/api/questions?subject=…`. All builder links carry the subject (drawer, sticky bar, paper panel `subjectId` prop, `NewPaperLink`). Skeletons `PageSkeleton`/`BuilderSkeleton`/`FormSkeleton` in `components/ui/skeleton.tsx` + 12 `loading.tsx` files (admin papers, papers/new, papers/[id]/edit, questions/new, questions/[id]/edit, exams, exams/new, exams/[id]/results, import, videos; public `/exams`, `/exam/[id]`). Limit: the public `/exams` and `/exam/[id]` entries are plain `<a href>` hard loads, so their `loading.tsx` shows only on a slow render; public-page slowness is NOT solved by this.

**PDF fallback.** `onPdf()` in `components/builder/paper-builder.tsx` checks the `/api/pdf` answer `501 {code:"chromium_unavailable", fallback:"browser-print"}` (`lib/pdf/fallback.ts` `isChromiumUnavailable`, tests in `lib/pdf/fallback.test.ts`) and calls `onQuickPrint()` (opens `/print/<id>?print=1`) with the info toast "ব্রাউজার প্রিন্ট খুলছে — 'Save as PDF' বেছে নিন।"; other errors still show the error toast; the real PDF path is unchanged (local POST `/api/pdf` = 200 application/pdf). `app/api/pdf/route.ts` untouched. Live check needed: popup blockers (`window.open` after an await; allow popups for the site if nothing opens).

**Evidence (both runs):** tsc clean, lint clean, vitest 221 pass (26 files), build clean, `data/ Chemistry/ Physics/` untouched. e2e was run after the push (full suite: 19 pass, 2 fail, 1 not run). `question-crud` failed once and passed on rerun (timing, slow PC). `paper-flow` failed because the test took the paper id with `split("/").pop()` and the saved URL is now `/edit?step=2&subject=…` (404): a test expectation, not an app bug. Fixed in `e2e/paper-flow.spec.ts` (id from `new URL(page.url()).pathname`; test timeout 240→420 s because a cold `next dev` plus the first local `/api/pdf` Chromium launch (~34 s) is slow on this PC); `paper-flow.spec.ts` now 2/2 pass (3.4 min). The e2e run rewrites tracked `screenshots/*.png`: do not commit them (`git restore screenshots`). Commit of the e2e fix: pending.

**Still open:** (a) speed: the 2 measurements in the start-here bullet; DevTools numbers seen on 2026-10-25 (with extension noise): server-rendered RSC requests 0.3–1.2 s each, `/exams` RSC 1.19 s, question PNGs (~100 kB) 0.55–1.2 s each; (b) exam redirect: opening an exam link in a browser that already has an attempt token (localStorage) shows that attempt's result (by design: resume; the token stays after submit). Verify in a private window; planned small fix: a "নতুন করে দিন" button on the result screen that clears the token (not written yet).

### 13.11 Update #10 (2026-10-25 night) — live findings after Prompt C and the PDF fallback

- **Builder fetch OK on live:** one `/api/questions?subject=physics` request (~0.9 s), no chemistry request.
- **PDF fallback fails in practice:** clicking "PDF ডাউনলোড" shows the red toast "পপ-আপ ব্লক হয়েছে — “প্রিন্ট ভিউ” লিংক থেকে খুলুন।". Cause (from DevTools): the save/re-render request `edit?step=2&subject=physics` takes 5–6 s and POST `/api/pdf` takes 6–8 s just to return 501 (the failed Chromium launch), so `window.open` runs more than 10 s after the click and Brave blocks it. Workaround now: use the "প্রিন্ট ভিউ" button, then Ctrl+P → Save as PDF (or allow popups for the site).
- **Exam redirect confirmed by Vercel logs:** opening `/exam/<id>` is followed by `GET /api/attempts/<attemptId>` (attempt id restored from localStorage) and the old 0/30 result shows. By design (resume), no server bug. Workaround: clear the site's local storage. Fix pending: a "নতুন করে দিন" button on the result screen (multiple attempts per person are already allowed; results list shows repeated names).
- **Vercel Logs (Hobby, project qb-hub):** opening `/admin` fires about 12 function invocations within ~7 s (5 nav prefetches, the 5 recent-paper edit links, `/admin/papers/new`, `/admin/questions/new`). Suspected prefetch fan-out; durations not read yet (click a log row for Duration, Region, cold start).
- **Save is slow:** the request after saving (`edit?step=2&subject=…`, server render of `/admin/papers/[id]/edit`) takes 5–6 s on live; cause unknown.
- `/favicon.ico` returns 404 on every page (8.3 kB not-found render).
- Local commit `5ec3b8d` (e2e fix) is not pushed yet.

(Prompt D text removed in update #12: it is done, see 13.12.)

### 13.12 Update #11 (2026-10-25 night) — Prompt D result (done, verified locally, committed and pushed in update #12; live check of its items not confirmed)

- **Print/PDF popup block:** `onQuickPrint` in `components/builder/paper-builder.tsx` opens `about:blank` synchronously before any await (`tab.opener = null`), sets the location to `/print/<id>?print=1` after the save, closes the tab on a failed save, keeps the "পপ-আপ ব্লক হয়েছে…" message when the handle is null. `canRenderPdf={!process.env.VERCEL}` is passed from `app/admin/papers/new/page.tsx` and `app/admin/papers/[id]/edit/page.tsx`; when false, `onPdf` skips `/api/pdf` and goes straight to the print flow with the info toast (verified with `VERCEL=1 next start`: zero `/api/pdf` calls). Locally unchanged (POST `/api/pdf` 200 + download). If the live PDF button still calls `/api/pdf`, the Vercel system variable `VERCEL` is not exposed to the deployment: set it manually.
- **Save slowness (cause found):** `app/actions/papers.ts` (create and update) awaited `store.getQuestion()` once per selected question, sequentially (8–20 Supabase round trips of 150–400 ms). Now a shared `loadQuestionRecords()` runs the lookups in parallel, deduped, same missing-question error text. The post-write re-read of the nested paper (`lib/data/supabase-store.ts` ~551, ~594) was left alone. Expect the `edit?step=2&subject=…` request to drop from 5–6 s; measure live.
- **Exam result restart:** `app/exam/[id]/exam-client.tsx` restores the attempt from `localStorage["qbhub.exam.token.<examId>"]`; the result screen now has "নতুন করে দিন" (`restart()`) which removes the token and the attempt's draft key and shows the start screen.
- **Favicon:** `app/icon.svg` + `app/favicon.ico` (removes the `/favicon.ico` 404).
- **Evidence:** tsc, lint, vitest 221, build clean; `data/ Chemistry/ Physics/` untouched; e2e `paper-flow` + `exam-flow` 3/3 pass (1.2 min with a warm dev server). Caveat: the first three runs of that command failed `exam-flow` at `toHaveURL("/admin/exams")` (cold `next dev`; a hot-update script dropped a pending `router.push`), the fourth passed; treat as a dev-server flake and re-run once if it recurs.
- **Not committed yet:** `app/actions/papers.ts`, `app/admin/papers/[id]/edit/page.tsx`, `app/admin/papers/new/page.tsx`, `app/exam/[id]/exam-client.tsx`, `components/builder/paper-builder.tsx`, `app/icon.svg`, `app/favicon.ico`; local commit `5ec3b8d` (e2e fix) is also unpushed. Never commit `screenshots/*.png` (the e2e run rewrites them; `git restore screenshots`).

### 13.13 Update #12 (2026-10-28 night) — Math chapters imported and pushed

**Git/live:** Prompt D files and the old local commit `5ec3b8d` are pushed (`707ef96..380b38c`, `git log origin/master..HEAD` empty). Live check of Prompt D items (print tab without popup block, save time, "নতুন করে দিন", favicon) was NOT reported. Still uncommitted: `QB_HUB_HANDOFF.md`, `Physics/data/phy-02.json` (untracked), `screenshots/*.png` changes (never commit; `git restore screenshots`).

**Math data (user-prepared, 6 files):** `Math/data/math-03.json`, `math-05`, `math-08`, `math-09`, `math-11`, `math-16` + `Math/data/images/`. Ids `math-NN-sq-NNN` / `math-NN-cq-NNN`, subject `"math"` (alias exists in `lib/subjects.ts`; `EXAM_SECTIONS` MATH exists). Counts: ch3 38 (SQ 11, CQ 27), ch5 9, ch8 53, ch9 38, ch11 36, ch16 62 = 236. Proof-check against the book: the user said the files were ready; verification status not stated. `math-03-cq-021` flag "check math": arithmetic re-checked, 2525 is correct.

**Schema gap and the pipeline (important):** the user's math CQs have ONE `question` string and no `parts`; the app's CQ schema requires `stem` + `parts` (error "parts: Required", 158 errors on the first dry-run). Solution, no app change: `scripts/math-fix.mjs` reads `Math/data/*.json` and writes `Math/ready/*.json` where every CQ becomes `stem: []` + one part `{label: LABEL, marks: MARKS, text: <question>, answer: null}` (constants at the top of the script; currently **LABEL "ঘ", MARKS 4 for ALL math CQs, an assumption**). SQ and everything else pass through unchanged. `Math/data/` = raw source (edit here), `Math/ready/` = generated (never hand-edit; images are copied into `Math/ready/images/` by hand with `cp -r Math/data/images/. Math/ready/images/`). Import and the app copy use the READY files: `npm run import -- ./Math/ready`, then `cp Math/ready/*.json data/` and `cp -r Math/ready/images/. data/images/`. So `data/math-*.json` are the converted versions, not byte copies of `Math/data`. Expected totals: `npx tsx scripts/import.ts ./Math/ready --dry-run` = 236; `./data` = 482 (246 + 236), 0 skipped, 0 warnings. Import is an idempotent upsert by id: changing LABEL/MARKS, rerunning the script and importing again updates the live data.

**Fixes made during the import (reuse for the next chapters):**
- The validator rejects plain Unicode math symbols (`∠`, `α`, `β`, U+2220/3B1/3B2) in ANY text field, including `image_desc`; write them as LaTeX in `$...$` (`\\angle`, `\\alpha`, `\\beta` in the file text). `math-09-cq-010` `image_desc` was fixed this way (agent edit on `Math/data/math-09.json`).
- Image checks apply to CQ only: a missing `images/<id>.png` is an error for CQ. `math-08-cq-018.png` was a mis-named copy of `math-08-cq-019.png` (renamed). 17 CQ images: ch8 003, 006, 007, 010, 014, 015, 016, 017, 019, 020; ch9 010; ch16 003, 004, 005, 019, 035, 036.
- `math-16-sq-010` and `math-16-sq-017` have `image:"none"` on purpose (flag "figure belongs to solution": the question asks the student to draw the figure); their PNGs were moved to `Math/unused/` (kept for a future solution page).
- A board year like `২২০১৭` in terminal output was terminal letter-doubling (`grep -c` showed 0), not a data error.

**Open problem (unverified): SQ images.** 11 SQ items carry an image in the JSON (ch8 sq-003, 005, 006, 007, 008, 009, 010, 016, 017; ch16 sq-015, 020) and their PNGs are imported, but the validator did not check them and the SQ schema in 4.3 has no `image` field. It is unknown whether the app shows them (bank, paper builder, print view, exam). Check live first; if they do not show, an agent task adds SQ image support (loader, card, print view, tests; Step 0 report first).

**Open: CQ marks.** The math CQ part label/marks are an assumption (ঘ, 4). Confirm from the book (maybe গ=3 or ঘ=4 depending on the question, or a different total) and print a math paper to look at the marks. If marks differ per item, the script needs a per-id map.

**Session notes for the next assistant:** Git Bash (UCRT64) the whole time. Lesson: when giving a replacement line for a data file, do NOT show it as a pasteable line; the user pasted it into the terminal and bash tried to run it. Give a small `node` script file (or exact VS Code edit instructions) instead. Agent in use: Freebuff (~1 h of quota left at the time); a short audit-style prompt with an evidence block worked well for the `math-09-cq-010` fix. Suggested order for a 1-hour agent session: SQ image support (if needed) → `/admin` link `prefetch={false}` → results CSV; keep Prompt B for a fresh quota.

### 13.15 Update #14 (2026-10-30) — Math chapters 2 and 17 LIVE; frequency tables stored as KaTeX text

**State:** all 8 math chapters (2, 3, 5, 8, 9, 11, 16, 17) are live in Supabase = **324 items**. Ch 2 had already been imported earlier by the user; the last real import (`npm run import -- ./Math/ready`) reported inserted 43 (ch 17), unchanged 281, skipped 0, warnings 0. Pushed to GitHub: the renderer fix and commit `f0b4678` "Add math chapters 2 and 17" (`data/math-02.json`, `data/math-17.json`, `Math/data/math-17.json`, `Math/ready/math-17.json`; push range `b411cd6..f0b4678`). `./data` should now hold 570 items. Note: the dry-run does NOT compare with the database (it said 324 inserted); only the real import reports inserted/unchanged.

**Decision (option B, text tables):** the 25 frequency tables of ch 17 now live inside `question` as `$\begin{array}{|c|...|}\hline ... \end{array}$` (written with doubled backslashes in the JSON file), `image:"none"`, `image_desc` removed. Made by `scripts/math17-tables.mjs` (tables embedded in the script, input `Math/data/math-17.json`, writes `Math/data/math-17.new.json`, never overwrites; one-off, untracked, not needed again). Audit result: the import validator and KaTeX accept such tables (`throwOnError:true`, `strict:false` in `lib/render/rich-text.ts`); the two real problems were print overflow (8 columns = 568.6px vs 329px column) and a collapsed newline. Agent fix (shared `RichText`, so bank card, builder preview, print/PDF and online exam all get it): `lib/render/rich-text.ts` wraps `array` math in a block `.rt-table`; `fitWideFormulas` in `components/paper/paper-document.tsx` measures the nearest block ancestor with a width; test in `lib/render/rich-text.test.ts`. tsc, lint and vitest (11 tests) pass; scale for an 8-column table is 0.577. Local screenshot check: 9-column `cq-007`, 8-column and the 10-row `sq-004` are readable on the paper (cosmetic: header-row text sits close to the cell border). If a wider table ever gets too small, transpose it (columns to rows) in the script instead of shrinking more.

**Corrections to 13.14 (it was wrong in places; trust this; the old 13.14 it corrects was removed in update #15):**
- The "4 WRONG tables" were not wrong. All 25 Gemini tables match the book pages 83-94 (compared by eye with the PDF). `cq-018` and `cq-027`: the BOOK prints "50 জন" but the frequencies sum to 54 and the book's own solution says বি.দ্র. n = 54; data kept exactly as printed (the script prints a warning for these two, expected). `cq-017` and `cq-024`: the table is right, the JSON question wrongly said 40; the book says 80, fixed.
- Stars: the book DID print stars for the 6 math-17 items that had `stars:0` (`sq-005, 014, 015, 016` = 2, `cq-004` = 2, `cq-019` = 3); the script restored these real values after `fix-stars.mjs` had set them to null. Lesson 5 of 13.14 ("stars 0 = no stars in the book") is NOT reliable: Gemini wrote 0 when unsure. The 7 math-02 items that `fix-stars.mjs` set to null were NOT compared with the book (stars are hidden in the UI anyway).
- Other source errors fixed in math-17: `sq-007` "১০ম" → "৯ম"; board years `sq-003` ২০২৯ → ২০১৯ (the old flag guessed 2023, wrong) and `sq-013` ২০০৯ → ২০১৯. Two resolved flags removed; remaining flags are informational. Only math-17 got this text/board/stars pass against the book; the other math files are still unchecked (verification status unknown).

**New lessons:** (1) `scripts/math-fix.mjs` converts EVERY `*.json` in `Math/data/`: never leave a backup such as `math-17.backup.json` there (it created duplicate ids and "image missing" errors in the dry-run); keep backups outside the project (the user's is `~/math-17.backup.json`). (2) Do not trust a dry-run's "inserted" count as DB state. (3) Before commits use `git add <files>` one by one (untracked Math/Physics files and screenshots are always around); never `git add -A`. (4) Embed small data in the one-off script instead of asking the user to move a file around.

**Open:** live check of the tables (checklist item 1); a stray untracked `Math/math-17.json` exists (differs from the pre-table backup, origin unknown, not read by any script; do not commit, ask before deleting); `scripts/math17-tables.mjs` untracked (commit or delete); other items as in 13.4.



### 13.16 Update #15 (2026-11-01) — Physics chapter 2 LIVE; edit-save subject bug found and fixed; mobile UI audit pending commit

**Physics ch 2 (done):** the user gave only the chapter PDF `Physics_Chap-2.pdf` (book pages 4–11). 9 figures exist in the book: CQ 008, 009, 010, 011, 012, 013, 014, 017, 018 (the old handoff said 10 incl. `cq-007`: wrong, `cq-007` has NO figure, its time/speed data is printed as text). The figures are real embedded images in the PDF, so they were extracted with `pdfimages -png` (no cropping, original resolution 350–780 px wide) and named `phy-02-cq-0NN.png`; `cq-010` (a table image with a merged "x" cell) had a clipped caption strip trimmed at the top. The user compared all 9 with the book: correct. Fixes made in `phy-02.json` by an agent (3 lines): `cq-007` `image:"none"`, `image_desc` removed and the table appended to `stem`; `cq-009` 2nd-car table appended to `stem` (the image is the 1st car graph; `image_desc` kept); `cq-013` board `২০২৮` → `২০২৪` and the flag removed. `cq-017` image_desc `1000 m` was only terminal letter-doubling (file already `100 m`). The phy-02 import validated with 0 skipped / 0 warnings: `npm run import -- ./Physics/data` inserted 48, unchanged 97. Commit `b0f015c` "Add physics chapter 2" (20 files: 2 JSON + 18 PNG) is pushed. Live check by the user: images fine; `cq-006` problem below. `cq-008` and `cq-011`/`cq-013` axis captions are cut in the book's own image (not fixable).

**BUG found and fixed (important, it can recur in similar form):** after the user fixed a spelling flag on `phy-02-cq-006` in the bank UI and saved, the question moved from Physics to "Chemistry chapter 2" (chemistry total 342, physics 144). Cause (confirmed by an agent, not a guess): `components/bank/question-form.tsx` line 116 hard-coded `subject: "chemistry"` in the save payload for create AND edit, and the form had no subject prop; `app/actions/questions.ts` never carried the existing item's subject; `lib/data/supabase-store.ts` (`questionRowFromForm`) and `lib/data/local-store.ts` wrote `values.subject`. Chapter and type survived because the form initialises them from the loaded item. `row.subject ?? "chemistry"` at supabase-store.ts:143 is a read fallback only (0 NULL-subject rows). Fix: `keepStoredSubject()` in `lib/data/store.ts` (an edit keeps the stored subject and never writes null/missing), the action passes its payload through it on update, the form sends `initial?.subject ?? "chemistry"`; new test `lib/data/store.test.ts` (physics edit keeps subject "physics"). tsc/lint clean, vitest 241 passed. Commit `e987988` "Keep stored subject when editing a question" (4 files) pushed. Blast radius: the file-vs-DB comparison of subject/chapter/type found exactly ONE mismatch (`phy-02-cq-006`), so earlier verified chapters of other subjects did not move.

**Still open from this bug:**
- `phy-02-cq-006` may still be stored with `subject='chemistry'` in Supabase (unknown if the user ran the SQL). Either way, after the spelling fix is mirrored into both JSON files (the file has `সমভরে`, the DB already has the correct `সমভরের`), `npm run import -- ./Physics/data` restores `subject` to `physics` (`updated 1`) or reports `updated 0` if the SQL was already run. Fallback SQL (one row, text untouched): `select id, subject, chapter, type from public.questions where id = 'phy-02-cq-006';` then `update public.questions set subject = 'physics' where id = 'phy-02-cq-006';`. Expected counts afterwards: chemistry 341, physics 145, math 324.
- **Diff audit (RESOLVED):** the earlier "175 differing ids" was an artefact of a sloppy comparison (auto-generated flags, part ordering). The proper read-only audit (NFC + whitespace + trim, then the import's own `normalizeForDb`): 618 ids in both `data/*.json` and the DB, 21 still differ, of which 20 are pure import-normaliser artefacts (9 source flags superseded by `buildFlags` auto flags, e.g. `check spelling: …`, `check math: …`, `no board tag`, `construction: …` on math-02/03/11; 11 `image_desc` values on SQ items math-08-sq-003…017 and math-16-sq-015/020 that `normalizeForDb` nulls because the SQ schema has no figure field) and exactly ONE is a genuine UI edit: `phy-02-cq-006` stem (spelling), DB correct, file lagging. Consequences: `npm run import` is safe again for unchanged data (idempotent), and UI edits are safe now that `e987988` is deployed, but every UI edit must be mirrored into the JSON files (lesson 5 at the end of 13.16) or a later import reverts it.
- **Hint for the open SQ-image problem (13.13):** the DB drops `image_desc` for SQ items because the SQ schema has no figure field, so SQ figures (math-08 sq-003…017, math-16 sq-015/020) are probably NOT shown by the app. CONFIRMED live (update #15): `math-08-sq-003` ("প্রমাণ করো, অর্ধবৃত্তস্থ কোণ একটি সমকোণ।") shows NO figure. That item is a proof question, so its figure probably belongs to the solution; classify all 11 SQ items with an image (math-08 sq-003, 005–010, 016, 017; math-16 sq-015, 020) by reading their question text (`node -e` over `Math/data/math-08.json` and `math-16.json`, `type==='SQ'` and `image!=='none'`): solution-only figures get `image:"none"` (as math-16-sq-010/017); figures that belong to the question need SQ image support. If needed, an agent task must add SQ image support (loader, card, print view, exam, tests; Step 0 report first). **CORRECTION (update #15, checked against the book PDF `math-08_p31-39.pdf`):** the earlier text-only classification was wrong. In the book every one of these SQ figures is printed directly under the question, before "সমাধান:" (math-08 sq-003, 005, 006, 007, 008, 009, 010, 016, 017 checked on book pages 31–34; math-16 sq-015 and sq-020 not checked, pages not available). So NO figure is set to `none`: all 11 SQ items keep their figure, exactly like the book. Plan: push the SQ-figure code (agent change, 13 files, committed with the exam-client mobile fixes), then `npm run import -- ./Math/ready` (expect `updated 11`), then live-check `math-08-sq-006` in the bank card, paper preview and print.

**SQ figures LIVE (update #15, late):** commit `6c25c17` "Show figures on SQ items; includes mobile fixes in exam-client" (13 files: SQ `image`/`image_desc` in `sqQuestionSchema`, `normalizeForDb`, check.ts, both stores, `getExamQuestions`, `publicQuestions`, bank card, paper/print document, exam question page; no DB migration, `questions.image_path` already existed). Then `npm run import -- ./Math/ready` gave `updated 20`: 11 = the SQ figures (math-08 sq-003/005/006/007/008/009/010/016/017, math-16 sq-015/020), 9 = flags only (see below). The user confirmed live that the figures appear on `math-08-sq-003`, `sq-006`, `sq-017` ("ছবি ৩ টাতেই এসেছে"); no question text, stem, parts, options, answers or marks changed (agent diff of old vs current normaliser, plus row timestamps). Idempotent again: re-planning yields 0 updates.

**Import side effect to know (update #15):** the 9 extra updates were `math-02-sq-004/007/018`, `math-02-cq-027`, `math-03-cq-021`, `math-11-cq-016/019/028`, `math-11-sq-004`. Each has a source quality flag in the JSON (`check spelling: …`, `check math: …`, `no board tag`, `construction: figure belongs to solution`) that its DB row did not have (the user had probably cleared/resolved it in the bank UI), so the import re-added it (stored with `createdAt: 1970-01-01T00:00:00Z`, the marker `buildFlags` uses for a re-created flag). They show again under the "যাচাই দরকার" filter. Content is unchanged. To keep a resolved flag resolved across imports, remove that flag from the JSON source as well (both copies) — otherwise any re-import brings it back. Lesson 7 of update #15.

**Mobile-responsive audit (public pages), agent work done, NOT committed:** modified and unstaged: `app/exams/page.tsx`, `app/exam/[id]/exam-client.tsx`, `app/videos/[id]/page.tsx`, `components/brand-footer.tsx`, `components/brand-header.tsx` (17 insertions, 12 deletions; scope matches the agent report; LF/CRLF warnings are harmless). Agent report: no horizontal overflow at 360/375/414 px; `html{font-size:15px}` made `min-h-11`/`text-base` resolve to 41px/15px, so explicit pixels were used (`min-h-[44px]`, `text-[16px]`); `/exams` leftmost chip (CHEMISTRY) clipped: inset moved off the scroll container (`scroll-pl-4`, no negative margin) + `snap-start`; header nav tabs, wordmark link, footer social icons (44×44), "← ভিডিও তালিকা" link, exam start inputs/buttons and "জমা দিন"/retry buttons raised to 44px; MCQ option rows were already 46px. No logic change; tsc ok, lint ok, vitest 238 passed at that time (241 after the subject fix). Viewport meta is `width=device-width, initial-scale=1` (no `viewport-fit`, no safe-area padding in use). Still to do by the user on a real phone: chip row not clipped, no iOS zoom on the name/roll inputs, option rows easy to tap, header/footer layout not broken. Then commit with `git add components/brand-header.tsx components/brand-footer.tsx app/exams/page.tsx`, `git add "app/exam/[id]/exam-client.tsx" "app/videos/[id]/page.tsx"`, message "Mobile fixes for public pages". A Playwright overflow spec was offered by the agent and deliberately skipped (quota).

**Other state:** untracked files that stay untracked for now: `Math/math-17.json` (origin unknown), `scripts/math17-tables.mjs` (one-off). DB subject counts as shown in the subject dropdown are a quick sanity check for stray moves (expected chemistry 341, physics 145, math 324).

**Lessons (update #15):** (1) When a PDF embeds its figures, `pdfimages -png -f N -l M file.pdf prefix` gives clean originals; no network or PyMuPDF is needed (the container has `pdfimages`, `pdftoppm`, PIL). Check the figure count against the handoff list before trusting a "missing images" list (here it was off by one: `cq-007` has no figure). (2) A table that is printed as text in the book belongs in `stem`, not only in `image_desc` (students never see `image_desc`). (3) A validator error like "চিত্রের ফাইল পাওয়া যায়নি" for one id usually means the JSON claims an image the book does not have. (4) After any admin UI save, compare the subject dropdown counts; one moved question shows as +1/−1. (5) Editing a question in the UI changes only the DB: apply the same fix to the JSON files or a re-import silently reverts it. Apply it to BOTH copies (source `<Subject>/data/*.json` and the app copy `data/*.json`; for math the app copy is the converted `Math/ready` version) and compare with `node -e` (JSON.stringify per item) because `cmp` also flags harmless LF/CRLF differences; a `grep -c` on one copy only (as in update #15, where `data/phy-02.json` still had the old spelling) hides drift. (7) A re-import re-adds any source flag the DB row lacks, i.e. it silently undoes "resolve flag" clicks made in the bank; clear the flag in the JSON files too. (6) The terminal doubles Bangla letters and punctuation in pasted output (`,,`, `0111`, `017..png`); always verify with `grep -c` or an agent's node check, not by eye.



### 13.17 Update #16 (2026-11-04) — figure captions hidden; SQ edit-save bug fixed

**Done, pushed and live-checked:**
- `components/paper/question-image.tsx`: the `<figcaption>` that printed `image_desc` under every figure is commented out (paper preview and print/PDF). Cause: `image_desc` was always shown as a plain-text caption, so math descriptions appeared with raw `$...$` (screenshot: math-16-sq-020). `image_desc` is now alt text only; the "figure missing" placeholder still shows `desc`. Checked live: preview and print of math-16-sq-015/020 show the figures with no caption.
- `dddec3d` "Hide figure caption on bank card": same change in `components/workspace/question-card.tsx` (the bank list card has its own figcaption, separate from `QuestionImage`). Confirmed live by the user.
- `754855b` "Keep SQ image and image_desc when editing a question": `components/bank/question-form.tsx` `onSave` sent `image: null` and `image_desc: null` for every SQ (left over from before SQ figures existed), so saving an edit of a figure-bearing SQ could wipe its figure. Now sends `image` and `image_desc` as loaded (state is initialised from `initial.imagePath` / `initial.imageDesc`). No test was added for this (optional: a test in `lib/data/question-form.test.ts` that an SQ edit keeps image and image_desc). tsc clean, vitest 28 files / 246 tests passed.
- All commits are pushed (`git log origin/master..HEAD` empty).

**Not yet checked:**
- Whether the online exam page (`app/exam/[id]`, exam-client) shows a caption under SQ figures. Find it with `Select-String -Path app\**\*.tsx -Pattern "figcaption"` (the last search over `components/` and `app/` found only question-form.tsx:501 (editor preview, keep), question-image.tsx and question-card.tsx, so probably nothing there).
- The editor preview in `question-form.tsx` (lines ~497–501) still shows the caption on purpose.
- If a figure-bearing SQ (math-08, math-16) was edited from the bank UI BEFORE `754855b`, its `image_path` may be null: check in Supabase and run `npm run import -- ./Math/ready` to restore. No such edit is known.
- Whether the form can add or change an SQ figure from the UI is unknown (imports handle SQ figures so far).

**Lesson (update #16):** the bank edit form writes some fields from hard-coded values instead of the loaded item (first `subject`, now SQ `image`/`image_desc`). After adding a field or type to the schema, re-read `onSave` in `question-form.tsx`.

**Working-tree state:** uncommitted: `app/exams/page.tsx`, `app/videos/[id]/page.tsx`, `components/brand-footer.tsx`, `components/brand-header.tsx` (mobile fixes), `QB_HUB_HANDOFF.md`. Untracked: `Math/math-17.json` (origin unknown), `scripts/math17-tables.mjs`.

**Mobile UI (what the uncommitted changes are):** only the public pages (exams, videos, brand header/footer), style-only, no logic: tap targets raised to 44px (header tabs, footer social icons, "← ভিডিও তালিকা", exam inputs and buttons, submit and retry buttons), input font 16px to stop iOS zoom, `/exams` first chip no longer clipped (`scroll-pl-4`, `snap-start`). Admin and bank screens were not touched. The user wants a full mobile-UI plan (public pages and possibly admin/bank) worked out together with the assistant after the other open items.

**Shell notes (update #16, PowerShell):** `git diff --stat` opens a pager and can stick ("Log file is already in use"): press `q`, or use `git --no-pager diff --stat`. Pasting a second command onto the same line glued two commands (`git add ...git add ...`, and `npx tsc --noEmit` became a junk file named `c --noEmit`, 1166 bytes, deleted): press Esc before every paste. `start-app.bat` runs `next start` on port 3100 and needs `npm run build` first (no `.next` folder gives "Could not find a production build"); for quick local checks `npm run dev` serves port 3000, not 3100. The terminal shows Bangla as mojibake in `Get-Content` output; the files are fine.
