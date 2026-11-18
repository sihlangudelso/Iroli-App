-- ============================================================
-- Grade 11-12 Pathway (the Pro plan)
--
-- Run ONCE in the Supabase SQL editor BEFORE the Pathway code goes live.
-- Safe to run again: every statement is "if not exists" / "or replace".
--
-- Adds:
--   learners."plan"       'standard' | 'pro'   (protected like licenseStatus)
--   learners."planSource" 'admin' | 'class'    (where a Pro plan came from)
--   learners."gradeYear"  the school year the saved grade belongs to, so the
--                         app can move a learner up a grade each January
--   learners."termMarks"  marks per school term:
--                         { "2027": { "grade": 11,
--                                     "terms": { "1": { "Mathematics": 64, ... },
--                                                "2": { ... } } } }
--   learners."pathway"    the learner's plan: languages, support subjects,
--                         up to three programme goals (each a snapshot of the
--                         programme's requirements when saved), the bursary
--                         goal with the learner's answers, application status
--   classes."plan"        which plan a class code gives ('standard' | 'pro')
--   public.bursaries      the starter bursary list (owner-maintained, read-only
--                         to the app; filled by seed_bursaries.sql)
--
-- Also fixes: joining a class used to overwrite licenseSource with 'class'
-- even for a learner the admin had activated individually, so leaving that
-- class later took their paid licence away. An admin-granted licence (and an
-- admin-granted Pro plan) now survives joining and leaving a class.
-- ============================================================

-- ---------- columns ----------
alter table public.learners add column if not exists "plan" text not null default 'standard';
alter table public.learners add column if not exists "planSource" text;
alter table public.learners add column if not exists "gradeYear" smallint;
alter table public.learners add column if not exists "termMarks" jsonb;
alter table public.learners add column if not exists "pathway" jsonb;
alter table public.classes  add column if not exists "plan" text not null default 'standard';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'learners_plan_check') then
    alter table public.learners add constraint learners_plan_check check ("plan" in ('standard','pro'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'learners_plan_source_check') then
    alter table public.learners add constraint learners_plan_source_check check ("planSource" in ('admin','class'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'classes_plan_check') then
    alter table public.classes add constraint classes_plan_check check ("plan" in ('standard','pro'));
  end if;
end $$;

-- ---------- a learner's first save can never be Pro ----------
drop policy if exists "learners_insert_own" on public.learners;
create policy "learners_insert_own"
  on public.learners for insert
  with check (auth.uid() = id and "licenseStatus" = 'trial' and coalesce("plan",'standard') = 'standard');

-- ---------- licence + plan protection (one function, see schema.sql) ----------
create or replace function public.protect_license_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  via_join boolean := coalesce(current_setting('app.allow_license_activation', true), 'false') = 'true';
begin
  -- Only an admin or the class-join path may change these four.
  if not public.is_admin() and not via_join then
    new."licenseStatus" := old."licenseStatus";
    new."licenseSource" := old."licenseSource";
    new."plan" := old."plan";
    new."planSource" := old."planSource";
  end if;
  -- Leaving a class (or an admin moving the learner, or the class being
  -- deleted): whatever came from that class seat goes. The class-join path
  -- is skipped here because join_class_by_code sets what the NEW class gives
  -- itself -- before, switching from one paid class to another by code
  -- reverted the learner to trial.
  if new."classId" is distinct from old."classId" and not via_join then
    if old."licenseSource" = 'class' then
      new."licenseStatus" := 'trial';
      new."licenseSource" := null;
    end if;
    if old."planSource" = 'class' then
      new."plan" := 'standard';
      new."planSource" := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_license_status_trigger on public.learners;
create trigger protect_license_status_trigger
  before update on public.learners
  for each row execute function public.protect_license_status();

-- ---------- class join: seat limit, licence, plan ----------
create or replace function public.join_class_by_code(p_code text)
returns table(class_id uuid, class_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  found_class public.classes;
  me public.learners;
  active_count int;
begin
  select * into found_class from public.classes where upper(code) = upper(trim(p_code)) for update;
  if found_class.id is null then
    raise exception 'No class found with that code';
  end if;
  if found_class."seatLimit" is not null and found_class."seatLimit" > 0 then
    select count(*) into active_count from public.learners
      where "classId" = found_class.id and "licenseStatus" = 'active' and id <> auth.uid();
    if active_count >= found_class."seatLimit" then
      raise exception 'This class has reached its seat limit';
    end if;
  end if;
  select * into me from public.learners where id = auth.uid();
  perform set_config('app.allow_class_join', 'true', true);
  perform set_config('app.allow_license_activation', 'true', true);
  update public.learners set
    "classId" = found_class.id,
    "licenseStatus" = 'active',
    -- Keep an individually paid (admin-granted) licence as admin-granted.
    "licenseSource" = case when me."licenseSource" = 'admin' and me."licenseStatus" = 'active' then 'admin' else 'class' end,
    -- A Pro class gives Pro; never downgrade an admin-granted Pro plan.
    "plan" = case
               when me."planSource" = 'admin' and me."plan" = 'pro' then 'pro'
               when found_class."plan" = 'pro' then 'pro'
               else 'standard' end,
    "planSource" = case
               when me."planSource" = 'admin' and me."plan" = 'pro' then 'admin'
               when found_class."plan" = 'pro' then 'class'
               else null end,
    "updatedAt" = now()
    where id = auth.uid();
  return query select found_class.id, found_class.name;
end;
$$;

-- ---------- starter bursary list ----------
create table if not exists public.bursaries (
  id text primary key,                 -- short stable id, e.g. 'nsfas'
  name text not null,
  provider text,
  fields text,                         -- plain-language fields of study
  "academicRules" jsonb,               -- { "minAverage": 65, "subjects": { "Mathematics": 5, "Mathematics Literacy": 7 } }
  "academicNote" text,                 -- the requirement in plain words, as published
  "otherCriteria" jsonb,               -- [ { "id":"citizen", "label":"...", "kind":"citizenship|income|group|age|other" } ]
  documents jsonb,                     -- [ "Certified copy of ID", ... ]
  "usualClosing" text,                 -- e.g. '31 August'
  obligations text,
  "officialUrl" text,
  cycle text,                          -- e.g. '2027 intake'
  "verifiedOn" date,
  active boolean not null default false,
  "sortOrder" int not null default 100
);
alter table public.bursaries enable row level security;
drop policy if exists "bursaries_select_authenticated" on public.bursaries;
create policy "bursaries_select_authenticated"
  on public.bursaries for select
  to authenticated
  using (true);

-- Make the API pick the new columns up straight away.
notify pgrst, 'reload schema';

-- Check: this should return NO rows once everything is in place.
select c.col as still_missing
from unnest(array['plan','planSource','gradeYear','termMarks','pathway']) as c(col)
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'learners' and column_name = c.col
);
