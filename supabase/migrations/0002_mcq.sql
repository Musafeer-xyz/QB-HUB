-- 0002_mcq.sql
-- বহুনির্বাচনী (MCQ) support for databases created from 0001.
--
-- 0001 already shipped `options jsonb` / `correct_option text`; this migration
-- makes the MCQ contract explicit, adds the printed-source columns and
-- (re)creates the type check so a database created before MCQ existed also
-- accepts `type = 'MCQ'`. It never edits 0001 and is safe to run twice.

-- ---------------------------------------------------------------------------
-- Columns (idempotent; an older 0001 may not have any of these)
-- ---------------------------------------------------------------------------
alter table public.questions add column if not exists stem text[] not null default '{}';
alter table public.questions add column if not exists options jsonb null;
alter table public.questions add column if not exists correct_option text null;
alter table public.questions add column if not exists source_no integer null;
alter table public.questions add column if not exists page integer null;

-- ---------------------------------------------------------------------------
-- Type check: CQ / SQ / MCQ
-- The inline check in 0001 is auto-named `questions_type_check`.
-- ---------------------------------------------------------------------------
alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions
  add constraint questions_type_check check (type in ('CQ', 'SQ', 'MCQ'));

-- ---------------------------------------------------------------------------
-- MCQ shape: jsonb array of exactly four {label,text} objects, and
-- correct_option (when set) must be one of the option labels.
-- CQ/SQ rows keep options = null.
-- ---------------------------------------------------------------------------
alter table public.questions drop constraint if exists questions_options_shape_check;
alter table public.questions
  add constraint questions_options_shape_check check (
    options is null
    or (
      jsonb_typeof(options) = 'array'
      and jsonb_array_length(options) = 4
    )
  );

alter table public.questions drop constraint if exists questions_correct_option_check;
alter table public.questions
  add constraint questions_correct_option_check check (
    correct_option is null
    or (
      correct_option in ('ক', 'খ', 'গ', 'ঘ')
      and options is not null
      and options @> jsonb_build_array(jsonb_build_object('label', correct_option))
    )
  );

-- ---------------------------------------------------------------------------
-- Source book location (MCQ.pdf prints a question number and page per item).
-- ---------------------------------------------------------------------------
alter table public.questions drop constraint if exists questions_source_no_check;
alter table public.questions
  add constraint questions_source_no_check check (source_no is null or source_no > 0);

alter table public.questions drop constraint if exists questions_page_check;
alter table public.questions
  add constraint questions_page_check check (page is null or page > 0);
