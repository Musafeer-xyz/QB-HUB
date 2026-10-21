# UI inventory — before → after the workspace redesign

This file is the completeness checklist for the UI redesign. Every route,
component and control that existed before the redesign is listed with its new
home. Anything not explicitly redesigned keeps its behaviour; only its styling
changes. No data-access code (`lib/data`, import/check-data) or print-engine
logic is modified.

## 1. Routes

| Before | After | Notes |
| --- | --- | --- |
| `/` | `/` | Unchanged: redirects to `/admin` in demo mode, otherwise landing page (restyled). |
| `/login` | `/login` | Same form, token styling. |
| `/setup` | `/setup` | Same first-admin flow, token styling. |
| `/admin` — question bank (search, filters, cards, tray, pagination) | `/admin` — **dashboard** | The bank itself moved to `/admin/bank`. Dashboard adds counts (questions, papers, chapters, flagged), quick actions and the recent-papers list. |
| — | `/admin/bank` — **workspace** | New home of the question bank: left filter rail, virtualized question list, right “আমার পেপার” panel. |
| `/admin/questions/new` | `/admin/questions/new` | Same form; token styling. |
| `/admin/questions/[id]/edit` | `/admin/questions/[id]/edit` | Same form; token styling. |
| `/admin/papers` | `/admin/papers` | Paper list restyled as a bordered table with row actions. |
| `/admin/papers/new` | `/admin/papers/new` | Now a 3-step flow (প্রশ্ন বাছাই → পেপার সাজানো → প্রিন্ট/PDF). |
| `/admin/papers/[id]/edit` | `/admin/papers/[id]/edit` | Same flow, seeded from the saved paper. |
| `/admin/import` | `/admin/import` | Same panel, token styling, `PageHeader`. |
| `/print/[id]` (+ `?t=`, `?print=1`, `?guide=1`) | unchanged | Print engine untouched; now also asserted to be theme-free (black on white). |
| `/api/*` | unchanged | No changes. |

## 2. Components

| Before | After |
| --- | --- |
| `components/admin-nav.tsx` | Replaced by `components/shell/app-header.tsx` (logo, subject switcher, nav, demo pill, ⌘K). Also `components/shell/command-palette.tsx` (new). |
| `components/mode-banner.tsx` | Removed from layout; the “ডেমো মোড” pill in the header shows the same information with a tooltip. |
| `components/bank/question-bank-view.tsx` | Replaced by `components/workspace/bank-workspace.tsx` + `filter-rail.tsx` + `question-row.tsx`. |
| `components/bank/question-card.tsx` | Replaced by `components/workspace/question-row.tsx` (collapsed row + in-place expansion keeps every field and action). |
| `components/selection/selection-tray.tsx` | Replaced by `components/workspace/paper-panel.tsx` (same selection store, grouped by section, drag reorder, per-section choice, totals, clear). |
| `components/selection/selection-context.tsx` | Same behaviour and storage key; adds `replace(entries)` so the builder’s step ১ can seed the shared selection from the paper being edited. |
| `components/builder/paper-builder.tsx` | Rewritten as the 3-step flow; every setting and action is kept (see §4). |
| `components/bank/question-form.tsx` | Same fields and actions; restyled with tokens and `PageHeader`. |
| `components/papers/paper-list.tsx` | Same table/actions; restyled. |
| `components/import/import-panel.tsx` | Same workflow; restyled. |
| `components/toast.tsx` | Same API; restyled to tokens, still `no-print`. |
| `components/paper/*`, `components/print/*`, `components/rich-text.tsx` | Unchanged logic; only the surrounding chrome is restyled. Printed output keeps zero theme colour. |

## 3. Question-bank controls (old `/admin` → new `/admin/bank`)

| Control | Old location | New location |
| --- | --- | --- |
| Full-text search (Bangla text / id) | Sidebar form | Top of the middle pane; `/` focuses it. |
| Type filter (CQ/SQ with counts) | Sidebar chips | Filter rail → “ধরন”. |
| Chapter filter with counts | Sidebar chips | Filter rail → “অধ্যায়”, with SQ/CQ/MCQ sub-counts and a per-chapter click target. |
| Board search + checkbox list with counts | Sidebar | Filter rail → “বোর্ড” (collapsible, search inside). |
| Difficulty (`stars`) select | Sidebar | Filter rail → “কাঠিন্য”. |
| “ছবি আছে” toggle | Sidebar | Filter rail → “আরও ফিল্টার”. |
| “যাচাই দরকার” toggle | Sidebar | Filter rail → “আরও ফিল্টার”. |
| “ফিল্টার মুছুন” | Sidebar button | Active-filter chips row → “সব মুছুন”. |
| Result count + page x/y | Above cards | Sticky toolbar in the middle pane (count only; pagination is replaced by virtualization). |
| Pagination (prev/next) | Below cards | Removed — the full index is virtualized in one list. |
| “＋ নতুন প্রশ্ন” | Results header | Middle-pane toolbar. |
| “ফিল্টারের সব প্রশ্ন যোগ করুন” + confirm + status | Above cards | Middle-pane toolbar → “সব যোগ করুন” with confirmation toast. |
| Question card: id, chapter, type, stars, image chip, total marks | Card header | Row meta line (id, type tag, chapter, boards chip, flag badge, marks). |
| Question text / stem / figure / parts with marks | Card body | Collapsed: first line only. Expanded in place: full stem, figure (height reserved), parts with marks. |
| Board tags | Card body chips | One “৩ বোর্ড” chip; hover or expand lists every board. |
| Flag badge + resolve buttons | Card body | Amber badge on the row; resolve buttons inside the expanded panel. |
| “যোগ করুন” / “✓ ট্রেতে আছে” | Card footer | Row checkbox/toggle; also in the paper panel. |
| “সম্পাদনা” | Card footer | Row `⋯` menu → সম্পাদনা. |
| “মুছুন” + confirmation dialog | Card footer | Row `⋯` menu → মুছুন, same confirmation dialog. |
| Tray: toggle, count, CQ/SQ split, total marks, clear | Sticky bottom tray | Right paper panel header/footer (same totals, clear button). |
| Tray list with drag reorder/remove | Tray body | Paper panel items, grouped by section, drag reorder, per-item remove. |
| “পেপার তৈরি করুন” | Tray footer | Paper panel → “প্রিভিউ” (builder step 2) / “প্রিন্ট/PDF” (step 3). |
| — | — | New: per-section “যেকোনো [N]/M”, live total that follows the choice, “প্রিভিউ”, “প্রিন্ট/PDF”. |

## 4. Paper builder controls (kept, regrouped)

Step 1 — প্রশ্ন বাছাই: the workspace list (filters, rows, add/remove) without
the print preview.

Step 2 — পেপার সাজানো (settings in three open collapsible groups + a closed
অ্যাডভান্সড):

- **পেপারের তথ্য**: title, institute, exam name, class, subject, chapter line,
  date, time, duration, set code (ক/খ + শাফল), instructions, CQ/SQ section
  instructions, CQ/SQ answer counts (exam mode only).
- **লেআউট**: paper size (A4/A5/B5/Letter/Legal), margins (narrow/normal/wide +
  custom mm), columns, column divider, font size, spacing, figure size, SQ
  marks, page numbers, keep-question-together, compact header, restart
  numbering.
- **প্রিন্ট অপশন**: show board sources, watermark, computed total marks.
- **অ্যাডভান্সড** (collapsed, contains নেস্টেড মোড ও বিন্যাস / সাজেশন শীট অপশন):
  mode (exam/suggestion), grouping, section order,
  sort order, chapter page break, suggestion-sheet toggles (সময় / পূর্ণমান /
  নির্দেশনা / “যেকোনো N” / মোট নম্বর), manual page breaks, logo upload/remove,
  answers feature flag, auto-generation rules (chapter/CQ/SQ rows, add/remove
  rule), board filter, exclude-used, shuffle, append-to-selection, run
  auto-select, shuffle selection.
- Unchanged extras: duplicate-question warning, live preview with zoom and
  margin guide, selected-question list with part checkboxes and reordering,
  Ctrl/⌘+S save.

Step 3 — প্রিন্ট/PDF: the same preview plus প্রিন্ট (browser), PDF download with
progress/error/retry, print-view link, save.

Sticky action bar on every step: **সংরক্ষণ · প্রিন্ট · PDF ডাউনলোড**.

## 5. Everything else

- Papers list: name/institute/exam, class, question count, marks, updated date,
  edit/print/copy/delete (delete confirmation) — unchanged behaviour.
- Question form: id, chapter, type, difficulty, boards, question/stem, figure
  upload + description, parts (label/marks/text/answer, add/remove), answer,
  live preview, save/cancel, delete — unchanged behaviour.
- Import: paste JSON, choose .json files, upload figures, preview diff, report,
  commit with confirmation — unchanged behaviour.
- Auth: login, first-admin setup, logout — unchanged behaviour.
- Print/PDF, selection persistence, auto-generation, marks, sets, pagination of
  saved papers: no logic changes.

## 6. New shared UI

- Design tokens in `app/globals.css` + `tailwind.config.ts`.
- `components/ui/*`: `page-header`, `empty-state`, `skeleton`, `modal`.
- Keyboard: `/` focuses search, `Esc` closes the sheet/open row/menus, ⌘K or
  Ctrl+K opens the palette, Ctrl/⌘+S saves the paper.
- `app/admin/bank/loading.tsx` and the builder’s index loading state show
  skeletons; failures and successes use toasts.
- `lib/subjects.ts`: subject/chapter registry (chemistry 6–10 today). Adding a
  subject is a registry entry, not a UI change.
- `lib/bank/filter.ts`: pure in-memory filter used by the workspace and tested
  with a synthetic 1,000-question set (< 100 ms).
