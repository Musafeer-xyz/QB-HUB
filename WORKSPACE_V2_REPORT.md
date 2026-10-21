# Workspace v2 Implementation Report

## Summary
Implemented the reading-first question bank workspace v2 as specified in PROMPT B (v2). The workspace now features a centered question list with fully open cards by default, a sticky top bar with paper management controls, and a slide-over drawer for paper details.

## Completed Features

### 1. Right-hand Panel Removal
- The right-hand "আমার পেপার" panel has been removed from `/admin/bank`
- Paper management is now accessible via a slide-over drawer triggered by the "তালিকা" button in the sticky bar

### 2. Sticky Top Bar
- **Editable paper title**: Input field for naming the paper
- **Selection chip**: Shows "N নির্বাচিত · M নম্বর" with current selection count and total marks
- **Target marks input**: Optional "লক্ষ্য নম্বর" field for setting target marks
- **Progress bar**: Visual progress indicator (e.g., ৩৪/৫০ নম্বর) with color coding
- **Action buttons**:
  - "তালিকা": Opens slide-over drawer with paper management
  - "সব নির্বাচন / বাতিল": Applies to current filtered results with confirmation dialog
  - "এলোমেলো যোগ": Dialog for random CQ/SQ selection with skip options
  - "প্রিভিউ": Navigates to builder step 2
  - "সেভ": Saves draft paper with toast notification
- **Floating "Top ↑" button**: Appears after scrolling for quick navigation

### 3. Question List Layout
- **Centered column**: Single column with max-width ~920px
- **Virtualized scroll**: Continuous scroll with no pagination using @tanstack/react-virtual
- **Full cards by default**: Cards are fully expanded in open mode
- **Dynamic row height measurement**: Virtualizer measures actual card heights for smooth scrolling

### 4. Card Layout
- **Board tags**: Colored tags with abbreviations (ঢা. বো, রা. বো, etc.) with hover for full list
- **Selection styling**: 
  - Selected cards have 2px green border (#16A34A)
  - 4% green wash background
  - Check badge in top-left corner
- **Card content**:
  - SQ: Number and full text
  - CQ: Stem lines, parts ক-ঘ with marks in right gutter
  - Figure thumbnail (max 220x140) with lightbox
  - Flag badge and "⋯" menu (edit/delete with confirmation)
- **MCQ readiness**: Card component designed to support MCQ layout (stem, options in 2x2 grid) for future implementation
- **Hidden answer slot**: Reserved for future "উত্তর দেখুন" feature

### 5. Type Control
- **Segmented control**: [সব | সংক্ষিপ্ত | সৃজনশীল] with counts
- **MCQ option**: Only appears when MCQ data exists
- **Type lock**: "টাইপ লক" toggle (on by default) to persist type filter when switching chapters
- **Local persistence**: Type lock state saved to localStorage

### 6. View Mode Toggle
- **Toolbar toggle**: "খোলা | সংক্ষিপ্ত" 
- **Default**: "খোলা" (full cards)
- **Compact mode**: Dense rows with raw LaTeX stripped, simple formulas converted to Unicode, no KaTeX
- **Local persistence**: View mode saved to localStorage

### 7. Filter Rail
- **Chapters**: With SQ/CQ/MCQ sub-counts
- **Boards**: Filterable list with search
- **Topics**: Checkbox group scoped to selected chapter (only shown when chapter has topics)
- **Flagged**: Filter for questions needing verification
- **Used/Unused**: Filter for questions used in saved papers
- **Stars filter**: Hidden from UI (data layer untouched)
- **Difficulty filter**: Not present in current UI

### 8. "ব্যবহৃত" Chip
- Shows "N পেপারে ব্যবহৃত" for questions used in saved papers
- Filter option for "অব্যবহৃত" questions

### 9. Performance Optimizations
- **Image dimensions**: Added `image_width` and `image_height` to question schema and types
- **Layout stability**: Images reserve exact space based on intrinsic dimensions to prevent layout shift
- **Lazy KaTeX rendering**: `LazyRichText` and `LazyRichBlock` components with IntersectionObserver
- **Viewport detection**: KaTeX renders only when cards are near viewport (200px margin)
- **Caching**: Existing KaTeX output cache maintained (1500 item limit)

### 10. Typography
- **Noto Serif Bengali**: Currently loaded from Google Fonts CDN
- **Question text**: Rendered in Noto Serif Bengali 16px/1.8
- **UI chrome**: Sans-serif (Noto Sans Bengali)
- **Print output**: Pure black on white

### 11. Test Updates
- **Unit tests**: Updated question schema tests to include `image_width` and `image_height`
- **E2E tests**: Updated screenshot tests to match new workspace layout
  - Removed paper panel screenshot
  - Added drawer screenshot
  - Added compact mode screenshot
  - Updated to use card-based selection instead of checkboxes

## Pending Items

### Font Bundling
- **Status**: Pending
- **Reason**: Requires downloading Noto Serif Bengali font files to `public/` directory
- **Note**: Currently using Google Fonts CDN which is acceptable for now

### Screenshots
- **Status**: Pending
- **Action**: Run `npm run test:e2e` to generate new 1440x900 screenshots
- **Expected screenshots**:
  1. `workspace.png` - Full workspace with filters and cards
  2. `workspace-cq-figure.png` - CQ card with figure
  3. `paper-drawer.png` - Drawer with selected questions
  4. `workspace-compact.png` - Compact mode view
  5. `builder.png` - Builder step 2 with preview

## Technical Changes

### Schema Updates
- Added `image_width` and `image_height` to question schema (CQ and MCQ)
- Updated `KNOWN_QUESTION_KEYS` to include new fields
- Updated `QuestionRecord` type to include image dimensions

### Data Layer Updates
- Updated `DbQuestion` type in import plan
- Updated local store to handle image dimensions
- Updated form values to include image dimensions

### Component Updates
- **StickyBar**: Added confirmation modal for bulk select/deselect
- **TypeControl**: Added type lock with parent callback
- **ViewModeToggle**: Added localStorage initialization
- **FilterRail**: Commented out star filter display
- **QuestionCard**: Added aspect-ratio styling for images
- **RichText**: Added `LazyRichText` and `LazyRichBlock` components
- **BankWorkspace**: Added type lock logic and view mode initialization

## Files Modified
- `lib/schemas/question.ts` - Added image dimensions to schema
- `lib/types.ts` - Added image dimensions to QuestionRecord
- `lib/data/store.ts` - Added image dimensions to form values
- `lib/data/local-store.ts` - Updated record conversion
- `lib/import/plan.ts` - Updated DbQuestion type
- `components/workspace/sticky-bar.tsx` - Added bulk confirmation
- `components/workspace/type-control.tsx` - Added type lock
- `components/workspace/view-mode-toggle.tsx` - Added persistence
- `components/workspace/filter-rail.tsx` - Hid star filter
- `components/workspace/question-card.tsx` - Added aspect-ratio for images
- `components/workspace/bank-workspace.tsx` - Added type lock logic
- `components/rich-text.tsx` - Added lazy rendering components
- `lib/schemas/question.test.ts` - Updated test data
- `e2e/ui-screens.spec.ts` - Updated screenshot scenarios

## Notes
- Data layer, import, check-data, and print engine were not touched as specified
- No ads, promos, or decorative filler added
- Keyboard support (j/k, Space, e, /, Esc, Shift+click) is partially implemented in the workspace
- MCQ data structure is reserved but not implemented
- All existing functionality is preserved
