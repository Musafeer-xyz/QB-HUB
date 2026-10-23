-- 0004_videos.sql
-- YouTube video library (no video files are stored; only the 11-char YouTube id).
-- RLS: admin-only, exactly like exams; public reads go through the service role.

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  topic text not null default '',
  title text not null,
  youtube_id text not null,
  position int not null default 0,
  published boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists videos_subject_idx on public.videos (subject);
create index if not exists videos_published_idx on public.videos (published);

alter table public.videos enable row level security;

drop policy if exists videos_select on public.videos;
create policy videos_select on public.videos
  for select to authenticated using (public.is_admin());

drop policy if exists videos_insert on public.videos;
create policy videos_insert on public.videos
  for insert to authenticated with check (public.is_admin());

drop policy if exists videos_update on public.videos;
create policy videos_update on public.videos
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists videos_delete on public.videos;
create policy videos_delete on public.videos
  for delete to authenticated using (public.is_admin());
