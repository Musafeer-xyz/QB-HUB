# Deploy QB Hub to a Node host (not serverless)

Not for Vercel/serverless: the PDF route needs a long-lived Node process and headless Chromium.

## 1. Supabase project
Create a Supabase project and note the project URL, anon key and service-role key.

## 2. Migrations
Run in order in the Supabase SQL editor (or `supabase db push`):
`0001_init.sql`, `0002_mcq.sql`, `0003_exams.sql` (folder `supabase/migrations/`).

## 3. Storage bucket
Create a public bucket `question-images` (question `image` paths are bucket-relative keys).

## 4. Import questions
```bash
npx tsx scripts/import.ts ./data
npx tsx scripts/import.ts ./Chemistry/mcq
```
Both are idempotent upserts by question id; `--dry-run` needs no credentials, and
`scripts/upload-images.ts --dry-run` reports what would be uploaded.
Images matching `data/images` and `Chemistry/data/images` are uploaded to
`question-images` alongside the rows.

## 5. Environment on the host
Set these BEFORE the deploy build — `NEXT_PUBLIC_*` values are inlined at build time:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
SETUP_SECRET=long-random-string
DATA_SOURCE=supabase
```
Optional: `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`, `PRINT_TOKEN_SECRET=...`.

Without the three Supabase values the server refuses to start in Supabase mode;
it exits with the missing variable names. `npm run build` needs none of them.

## 6. Build and run
```bash
npm ci
npm run build
npx playwright install chromium --with-deps   # or set CHROMIUM_EXECUTABLE_PATH
npm start                                      # next start, PORT=3000 by default
```
Host: Node 18+, Playwright Chromium (PDF export; without it `/api/pdf` answers 501 and
the UI offers browser print), Supabase connectivity.

## 7. Create the admin account
`/setup` needs `SETUP_SECRET`; POST to `/api/setup` with
`{ "email", "password", "secret": "<SETUP_SECRET>" }`.
The page and route become unusable once an admin exists.

## Local demo (development only)
`.env.local`:
```
DATA_SOURCE=local
ALLOW_LOCAL_DEMO=1
```
Local mode also needs a non-production `NODE_ENV`. Never expose it publicly.
