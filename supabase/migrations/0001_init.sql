-- 0001_init.sql
-- প্রশ্নব্যাংক — initial schema.
-- Run with the Supabase SQL editor / CLI (`supabase db push`) or `psql -f`.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
-- pg_trgm powers fast Bangla search; pgcrypto gives gen_random_uuid().
-- Both are optional: the app degrades gracefully if they are unavailable.
do $$
begin
  create extension if not exists pg_trgm with schema public;
exception when others then
  raise notice 'pg_trgm unavailable: %', sqlerrm;
end $$;

do $$
begin
  create extension if not exists pgcrypto with schema public;
exception when others then
  raise notice 'pgcrypto unavailable: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- Admins (every signed-in user must be added here to see anything)
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Questions
-- ---------------------------------------------------------------------------
create table if not exists public.questions (
  id text primary key,
  subject text not null,
  chapter integer not null check (chapter between 1 and 99),
  type text not null check (type in ('CQ', 'SQ', 'MCQ')),
  stars integer null check (stars is null or stars between 1 and 5),
  boards text[] not null default '{}',
  question text null,
  stem text[] not null default '{}',
  image_path text null,
  image_desc text null,
  flags jsonb not null default '[]'::jsonb,
  answer text null,
  options jsonb null,
  correct_option text null,
  -- Denormalised search haystack (question + stem + parts text), maintained
  -- by trigger. Trigram-indexed so Bangla ILIKE search stays fast.
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_parts (
  id bigint generated always as identity primary key,
  question_id text not null references public.questions (id) on delete cascade,
  label text not null,
  marks integer not null default 0,
  text text not null,
  answer text null,
  position integer not null default 0,
  unique (question_id, position)
);

-- ---------------------------------------------------------------------------
-- Papers
-- ---------------------------------------------------------------------------
create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  institute text not null default '',
  exam_name text not null default '',
  class_name text not null default '',
  subject text not null default 'chemistry',
  duration_minutes integer null,
  total_marks numeric(6, 2) not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paper_questions (
  paper_id uuid not null references public.papers (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  position integer not null,
  section text null check (section is null or section in ('CQ', 'SQ', 'MCQ')),
  -- empty array = every part of the question
  selected_parts text[] not null default '{}',
  primary key (paper_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists questions_subject_chapter_type_idx
  on public.questions (subject, chapter, type);
create index if not exists questions_boards_gin_idx
  on public.questions using gin (boards);
create index if not exists questions_stars_idx on public.questions (stars) where stars is not null;
create index if not exists paper_questions_paper_position_idx
  on public.paper_questions (paper_id, position);
create index if not exists papers_created_by_idx on public.papers (created_by);

-- Trigram index powers `search_text ilike '%…%'` for Bangla text.
do $$
begin
  create index if not exists questions_search_trgm_idx
    on public.questions using gin (search_text gin_trgm_ops);
exception
  when others then
    raise notice 'pg_trgm index skipped: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- Triggers: search_text + updated_at
-- ---------------------------------------------------------------------------
create or replace function public.normalize_search(t text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g'));
$$;

create or replace function public.questions_search_compute()
returns trigger
language plpgsql
as $$
begin
  new.search_text := public.normalize_search(
    coalesce(new.question, '') || ' ' ||
    array_to_string(new.stem, ' ') || ' ' ||
    coalesce((
      select string_agg(p.text, ' ') from public.question_parts p where p.question_id = new.id
    ), '')
  );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists questions_search_compute on public.questions;
create trigger questions_search_compute
  before insert or update on public.questions
  for each row execute function public.questions_search_compute();

create or replace function public.question_parts_search_sync()
returns trigger
language plpgsql
as $$
declare
  qid text;
begin
  qid := coalesce(new.question_id, old.question_id);
  update public.questions q
     set search_text = public.normalize_search(
           coalesce(q.question, '') || ' ' ||
           array_to_string(q.stem, ' ') || ' ' ||
           coalesce((select string_agg(p.text, ' ') from public.question_parts p where p.question_id = q.id), '')
         )
   where q.id = qid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists question_parts_search_sync on public.question_parts;
create trigger question_parts_search_sync
  after insert or update or delete on public.question_parts
  for each row execute function public.question_parts_search_sync();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists papers_set_updated_at on public.papers;
create trigger papers_set_updated_at
  before update on public.papers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: only authenticated admins may read or write anything
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.questions enable row level security;
alter table public.question_parts enable row level security;
alter table public.papers enable row level security;
alter table public.paper_questions enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- admins: a user may always see their own row (used by /api/setup status).
drop policy if exists admins_select on public.admins;
create policy admins_select on public.admins
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists questions_select on public.questions;
create policy questions_select on public.questions
  for select to authenticated using (public.is_admin());
drop policy if exists questions_insert on public.questions;
create policy questions_insert on public.questions
  for insert to authenticated with check (public.is_admin());
drop policy if exists questions_update on public.questions;
create policy questions_update on public.questions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists questions_delete on public.questions;
create policy questions_delete on public.questions
  for delete to authenticated using (public.is_admin());

drop policy if exists question_parts_select on public.question_parts;
create policy question_parts_select on public.question_parts
  for select to authenticated using (public.is_admin());
drop policy if exists question_parts_insert on public.question_parts;
create policy question_parts_insert on public.question_parts
  for insert to authenticated with check (public.is_admin());
drop policy if exists question_parts_update on public.question_parts;
create policy question_parts_update on public.question_parts
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists question_parts_delete on public.question_parts;
create policy question_parts_delete on public.question_parts
  for delete to authenticated using (public.is_admin());

drop policy if exists papers_select on public.papers;
create policy papers_select on public.papers
  for select to authenticated using (public.is_admin());
drop policy if exists papers_insert on public.papers;
create policy papers_insert on public.papers
  for insert to authenticated with check (public.is_admin());
drop policy if exists papers_update on public.papers;
create policy papers_update on public.papers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists papers_delete on public.papers;
create policy papers_delete on public.papers
  for delete to authenticated using (public.is_admin());

drop policy if exists paper_questions_select on public.paper_questions;
create policy paper_questions_select on public.paper_questions
  for select to authenticated using (public.is_admin());
drop policy if exists paper_questions_insert on public.paper_questions;
create policy paper_questions_insert on public.paper_questions
  for insert to authenticated with check (public.is_admin());
drop policy if exists paper_questions_update on public.paper_questions;
create policy paper_questions_update on public.paper_questions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists paper_questions_delete on public.paper_questions;
create policy paper_questions_delete on public.paper_questions
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: public bucket for question images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do update set public = true;

drop policy if exists question_images_public_read on storage.objects;
create policy question_images_public_read on storage.objects
  for select using (bucket_id = 'question-images');

drop policy if exists question_images_admin_insert on storage.objects;
create policy question_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'question-images' and public.is_admin());

drop policy if exists question_images_admin_update on storage.objects;
create policy question_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'question-images' and public.is_admin());

drop policy if exists question_images_admin_delete on storage.objects;
create policy question_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'question-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
