-- 0003_exams.sql
-- Online exams (MCQ only for now).
-- Exams are created by admins; students take them via server actions.
-- RLS: admin-only access to tables; student access goes through server actions.

-- ---------------------------------------------------------------------------
-- Exams table
-- ---------------------------------------------------------------------------
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  chapter integer not null,
  question_ids text[] not null,
  duration_min integer not null check (duration_min > 0),
  is_open boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Attempts table
-- ---------------------------------------------------------------------------
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_name text not null,
  student_id text null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz null,
  answers jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  total integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists attempts_exam_id_idx on public.attempts (exam_id);
create index if not exists attempts_student_name_idx on public.attempts (student_name);
create index if not exists exams_subject_chapter_idx on public.exams (subject, chapter);
create index if not exists exams_is_open_idx on public.exams (is_open);

-- ---------------------------------------------------------------------------
-- Row Level Security: admin-only
-- ---------------------------------------------------------------------------
alter table public.exams enable row level security;
alter table public.attempts enable row level security;

-- Exams: admins only
drop policy if exists exams_select on public.exams;
create policy exams_select on public.exams
  for select to authenticated using (public.is_admin());

drop policy if exists exams_insert on public.exams;
create policy exams_insert on public.exams
  for insert to authenticated with check (public.is_admin());

drop policy if exists exams_update on public.exams;
create policy exams_update on public.exams
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists exams_delete on public.exams;
create policy exams_delete on public.exams
  for delete to authenticated using (public.is_admin());

-- Attempts: admins only (students go through server actions with service role)
drop policy if exists attempts_select on public.attempts;
create policy attempts_select on public.attempts
  for select to authenticated using (public.is_admin());

drop policy if exists attempts_insert on public.attempts;
create policy attempts_insert on public.attempts
  for insert to authenticated with check (public.is_admin());

drop policy if exists attempts_update on public.attempts;
create policy attempts_update on public.attempts
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists attempts_delete on public.attempts;
create policy attempts_delete on public.attempts
  for delete to authenticated using (public.is_admin());
