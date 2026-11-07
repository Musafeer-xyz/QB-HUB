-- ---------------------------------------------------------------------------
-- MCQ explanation
--
-- Optional "why is this the answer" note. Shown to a student only on the
-- result screen, never in the exam start payload.
-- ---------------------------------------------------------------------------

alter table public.questions add column if not exists explanation text;
