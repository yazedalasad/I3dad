-- ============================================================
-- I3dad / إعداد
-- Admin visibility upgrade for the CURRENT Supabase schema.
--
-- Important:
-- - In the current schema, public.students.student_id is the 9-digit identity number.
-- - Internal UUIDs stay internal and should not be shown in admin UI.
-- - This script is additive and safe for existing data.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Fix / confirm current admin profile
-- ------------------------------------------------------------

insert into public.user_profiles (user_id, role, created_at, updated_at)
select id, 'admin'::app_role, now(), now()
from auth.users
where lower(email) = lower('yazedassad@gmail.com')
on conflict (user_id)
do update set role = 'admin'::app_role, updated_at = now();

insert into public.admins (user_id, full_name, phone, gmail, is_active, created_at, updated_at)
select id, 'yazedassad', '0000000000', 'yazedassad@gmail.com', true, now(), now()
from auth.users
where lower(email) = lower('yazedassad@gmail.com')
on conflict (user_id)
do update set is_active = true, updated_at = now();

-- ------------------------------------------------------------
-- 2) Add missing admin-use columns to existing tables
-- ------------------------------------------------------------

alter table public.students
  add column if not exists class_section text;

update public.students
set class_section = 'alef'
where class_section is null or btrim(class_section) = '';

alter table public.students
  alter column class_section set default 'alef';

alter table public.students
  alter column class_section set not null;

alter table public.students
  add column if not exists preferred_language text default 'ar';

alter table public.students
  add column if not exists is_active boolean not null default true;

alter table public.students
  add column if not exists last_sign_in_at timestamptz;

alter table public.students
  drop constraint if exists students_class_section_check;

alter table public.students
  add constraint students_class_section_check
  check (class_section in ('alef', 'bet', 'gimel', 'dalet'));

alter table public.students
  drop constraint if exists students_student_id_9_digits_check;

-- Do not add a hard 9-digit constraint yet. Some existing rows still have
-- old UUID-like student_id values, and a constraint would block normal admin
-- actions like changing grade or class_section on those rows. Clean the data
-- first, then validate with the optional SQL at the end of this file.

alter table public.principals
  add column if not exists preferred_language text default 'ar',
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists last_sign_in_at timestamptz;

alter table public.questions
  add column if not exists question_text text,
  add column if not exists explanation_ar text,
  add column if not exists explanation_he text,
  add column if not exists tags text[] default '{}',
  add column if not exists weight numeric default 1;

update public.questions
set question_text = coalesce(question_text, question_text_ar, question_text_he)
where question_text is null;

alter table public.test_sessions
  add column if not exists correct_answers integer default 0,
  add column if not exists wrong_answers integer default 0,
  add column if not exists skipped_questions integer default 0,
  add column if not exists final_score numeric,
  add column if not exists heartbeat_events jsonb default '[]'::jsonb;

-- ------------------------------------------------------------
-- 3) Admin support tables missing from current schema
-- ------------------------------------------------------------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  page text,
  ip_address text,
  status text not null default 'success' check (status in ('success', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);

create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  translation_key text not null unique,
  text_ar text,
  text_he text,
  text_en text,
  usage_area text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_translations_usage_area on public.translations(usage_area);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description_ar text,
  description_he text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, value, description_ar)
values
  ('system_name', '"איעדאד"'::jsonb, 'اسم النظام'),
  ('default_language', '"ar"'::jsonb, 'اللغة الافتراضية'),
  ('default_question_count', '20'::jsonb, 'عدد الأسئلة الافتراضي'),
  ('games_enabled', 'true'::jsonb, 'تفعيل الألعاب'),
  ('comprehensive_test_enabled', 'true'::jsonb, 'تفعيل الاختبار الشامل')
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- 4) Indexes needed by admin pages
-- ------------------------------------------------------------

create index if not exists idx_students_identity_number on public.students(student_id);
create index if not exists idx_students_school_grade_section
  on public.students(school_id, grade, class_section);
create index if not exists idx_students_active on public.students(is_active);
create index if not exists idx_students_user_id on public.students(user_id);

create index if not exists idx_test_sessions_student on public.test_sessions(student_id);
create index if not exists idx_test_sessions_status on public.test_sessions(status);
create index if not exists idx_test_sessions_started_at on public.test_sessions(started_at);

create index if not exists idx_student_abilities_student on public.student_abilities(student_id);
create index if not exists idx_student_interests_student on public.student_interests(student_id);
create index if not exists idx_student_responses_student on public.student_responses(student_id);

create index if not exists idx_questions_subject on public.questions(subject_id);
create index if not exists idx_questions_active on public.questions(is_active);
create index if not exists idx_questions_target_language on public.questions(target_language);

-- ------------------------------------------------------------
-- 5) Admin views: use identity number, never internal UUID
-- ------------------------------------------------------------

create or replace view public.admin_students_overview as
select
  s.id as internal_student_uuid,
  s.student_id as identity_number,
  nullif(trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, '')), '') as full_name,
  s.first_name,
  s.last_name,
  s.email,
  s.phone,
  s.birthday,
  s.school_id,
  coalesce(sc.name_ar, s.school_name) as school_name_ar,
  coalesce(sc.name_he, s.school_name) as school_name_he,
  s.grade,
  s.class_section,
  s.preferred_language,
  s.is_active,
  s.created_at,
  s.updated_at,
  s.last_sign_in_at,
  count(ts.id) as total_sessions,
  count(ts.id) filter (where ts.status = 'completed') as completed_tests,
  max(ts.started_at) as last_test_at,
  avg(coalesce(ts.final_score, ts.final_ability_estimate)) as average_score
from public.students s
left join public.schools sc on sc.id = s.school_id
left join public.test_sessions ts on ts.student_id = s.id
group by s.id, sc.name_ar, sc.name_he;

create or replace view public.admin_test_sessions_overview as
select
  ts.id as session_id,
  s.student_id as identity_number,
  nullif(trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, '')), '') as student_name,
  coalesce(sc.name_ar, s.school_name) as school_name_ar,
  s.grade,
  s.class_section,
  ts.session_type,
  ts.status,
  ts.language,
  ts.started_at,
  ts.completed_at,
  ts.total_time_seconds,
  ts.target_questions,
  ts.questions_answered,
  ts.correct_answers,
  ts.wrong_answers,
  ts.skipped_questions,
  coalesce(ts.final_score, ts.final_ability_estimate) as final_result,
  ts.active_time_seconds,
  ts.idle_time_seconds,
  ts.focus_lost_count,
  ts.engagement_score
from public.test_sessions ts
left join public.students s on s.id = ts.student_id
left join public.schools sc on sc.id = s.school_id;

create or replace view public.admin_questions_overview as
select
  q.id,
  coalesce(q.question_text, q.question_text_ar, q.question_text_he) as question_text,
  q.question_text_ar,
  q.question_text_he,
  sub.name_ar as subject_name_ar,
  sub.name_he as subject_name_he,
  sub.name_en as subject_name_en,
  q.difficulty,
  q.target_language,
  q.correct_answer,
  q.times_used,
  q.times_correct,
  case
    when q.times_used > 0 then round((q.times_correct::numeric / q.times_used::numeric) * 100, 2)
    else null
  end as correct_rate,
  q.is_active,
  q.created_at,
  q.updated_at
from public.questions q
left join public.subjects sub on sub.id = q.subject_id;

create or replace view public.admin_student_reports_overview as
select
  sa.id,
  s.student_id as identity_number,
  nullif(trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, '')), '') as student_name,
  coalesce(sc.name_ar, s.school_name) as school_name_ar,
  s.grade,
  s.class_section,
  sub.name_ar as subject_name_ar,
  sub.name_he as subject_name_he,
  sa.ability_score,
  sa.theta_estimate,
  sa.confidence_level,
  sa.total_questions_answered,
  sa.correct_answers,
  sa.accuracy_rate,
  sa.last_assessed_at,
  sa.updated_at
from public.student_abilities sa
left join public.students s on s.id = sa.student_id
left join public.schools sc on sc.id = s.school_id
left join public.subjects sub on sub.id = sa.subject_id;

create or replace view public.admin_games_overview as
select
  gs.id as game_session_id,
  s.student_id as identity_number,
  nullif(trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, '')), '') as student_name,
  gs.game_id,
  g.title as game_title,
  gs.level_id,
  gs.status,
  gs.language,
  gs.hebrew_score,
  gs.medical_reasoning_score,
  gs.engagement_score,
  gs.interest_signal,
  gs.trust_score,
  gs.started_at,
  gs.ended_at,
  gs.created_at
from public.game_sessions gs
left join public.students s on s.id = gs.student_id
left join public.games g on g.id = gs.game_id;

-- ------------------------------------------------------------
-- 6) RLS: admin sees all, manager sees own school, student sees self
-- ------------------------------------------------------------

alter table public.user_profiles enable row level security;
alter table public.admins enable row level security;
alter table public.students enable row level security;
alter table public.schools enable row level security;
alter table public.principals enable row level security;
alter table public.questions enable row level security;
alter table public.subjects enable row level security;
alter table public.test_sessions enable row level security;
alter table public.test_session_subjects enable row level security;
alter table public.student_responses enable row level security;
alter table public.student_abilities enable row level security;
alter table public.student_interests enable row level security;
alter table public.student_learning_potential enable row level security;
alter table public.student_recommendations enable row level security;
alter table public.personality_responses enable row level security;
alter table public.personality_test_sessions enable row level security;
alter table public.student_personality_profiles enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_action_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.translations enable row level security;
alter table public.system_settings enable row level security;

drop policy if exists "admin_read_user_profiles" on public.user_profiles;
create policy "admin_read_user_profiles"
on public.user_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

drop policy if exists "admin_read_students" on public.students;
create policy "admin_read_students"
on public.students
for select
to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (
    select 1
    from public.principals p
    where p.user_id = auth.uid()
      and p.school_id = students.school_id
      and p.is_active = true
  )
);

drop policy if exists "students_insert_own_row" on public.students;
create policy "students_insert_own_row"
on public.students
for insert
to authenticated
with check (
  user_id = auth.uid()
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

drop policy if exists "students_update_own_or_admin" on public.students;
create policy "students_update_own_or_admin"
on public.students
for update
to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
)
with check (
  user_id = auth.uid()
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

drop policy if exists "admin_delete_students" on public.students;
create policy "admin_delete_students"
on public.students
for delete
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_student_responses" on public.student_responses;
create policy "admin_manage_student_responses"
on public.student_responses
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_test_session_subjects" on public.test_session_subjects;
create policy "admin_manage_test_session_subjects"
on public.test_session_subjects
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_session_heartbeats" on public.session_heartbeats;
create policy "admin_manage_session_heartbeats"
on public.session_heartbeats
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_student_abilities" on public.student_abilities;
create policy "admin_manage_student_abilities"
on public.student_abilities
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_student_interests" on public.student_interests;
create policy "admin_manage_student_interests"
on public.student_interests
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_student_learning_potential" on public.student_learning_potential;
create policy "admin_manage_student_learning_potential"
on public.student_learning_potential
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_student_recommendations" on public.student_recommendations;
create policy "admin_manage_student_recommendations"
on public.student_recommendations
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_personality_responses" on public.personality_responses;
create policy "admin_manage_personality_responses"
on public.personality_responses
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_personality_sessions" on public.personality_test_sessions;
create policy "admin_manage_personality_sessions"
on public.personality_test_sessions
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_personality_profiles" on public.student_personality_profiles;
create policy "admin_manage_personality_profiles"
on public.student_personality_profiles
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_game_sessions" on public.game_sessions;
create policy "admin_manage_game_sessions"
on public.game_sessions
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_game_action_logs" on public.game_action_logs;
create policy "admin_manage_game_action_logs"
on public.game_action_logs
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_manage_test_sessions" on public.test_sessions;
create policy "admin_manage_test_sessions"
on public.test_sessions
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "public_read_schools" on public.schools;
create policy "public_read_schools"
on public.schools
for select
to authenticated
using (true);

drop policy if exists "public_read_subjects" on public.subjects;
create policy "public_read_subjects"
on public.subjects
for select
to authenticated
using (true);

drop policy if exists "public_read_questions" on public.questions;
create policy "public_read_questions"
on public.questions
for select
to authenticated
using (true);

drop policy if exists "admin_manage_questions" on public.questions;
create policy "admin_manage_questions"
on public.questions
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_read_test_sessions" on public.test_sessions;
create policy "admin_read_test_sessions"
on public.test_sessions
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = test_sessions.student_id and s.user_id = auth.uid())
  or exists (
    select 1
    from public.principals p
    join public.students s on s.id = test_sessions.student_id
    where p.user_id = auth.uid()
      and p.school_id = s.school_id
      and p.is_active = true
  )
);

drop policy if exists "admin_read_student_abilities" on public.student_abilities;
create policy "admin_read_student_abilities"
on public.student_abilities
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = student_abilities.student_id and s.user_id = auth.uid())
  or exists (
    select 1
    from public.principals p
    join public.students s on s.id = student_abilities.student_id
    where p.user_id = auth.uid()
      and p.school_id = s.school_id
      and p.is_active = true
  )
);

drop policy if exists "admin_read_student_interests" on public.student_interests;
create policy "admin_read_student_interests"
on public.student_interests
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = student_interests.student_id and s.user_id = auth.uid())
  or exists (
    select 1
    from public.principals p
    join public.students s on s.id = student_interests.student_id
    where p.user_id = auth.uid()
      and p.school_id = s.school_id
      and p.is_active = true
  )
);

drop policy if exists "admin_read_student_responses" on public.student_responses;
create policy "admin_read_student_responses"
on public.student_responses
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = student_responses.student_id and s.user_id = auth.uid())
);

drop policy if exists "admin_read_recommendations" on public.student_recommendations;
create policy "admin_read_recommendations"
on public.student_recommendations
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = student_recommendations.student_id and s.user_id = auth.uid())
);

drop policy if exists "admin_read_game_sessions" on public.game_sessions;
create policy "admin_read_game_sessions"
on public.game_sessions
for select
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = game_sessions.student_id and s.user_id = auth.uid())
);

drop policy if exists "admin_read_audit_logs" on public.audit_logs;
create policy "admin_read_audit_logs"
on public.audit_logs
for select
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_read_translations" on public.translations;
create policy "admin_read_translations"
on public.translations
for select
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_read_system_settings" on public.system_settings;
create policy "admin_read_system_settings"
on public.system_settings
for select
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ------------------------------------------------------------
-- 7) Data cleanup helper
-- ------------------------------------------------------------
-- Run this SELECT after the upgrade to see students that still need a real
-- identity number. Update those rows with the actual 9-digit ID, then you can
-- optionally add and validate the constraint:
--
--   alter table public.students
--     add constraint students_student_id_9_digits_check
--     check (student_id ~ '^[0-9]{9}$') not valid;
--
--   alter table public.students validate constraint students_student_id_9_digits_check;
--
select
  id,
  user_id,
  student_id as current_invalid_identity_number,
  first_name,
  last_name,
  email
from public.students
where student_id is null
   or student_id !~ '^[0-9]{9}$';
