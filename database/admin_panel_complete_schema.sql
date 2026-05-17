-- ============================================================
-- i3dad / إعداد - Complete Admin Panel Schema
-- Run this in Supabase SQL Editor after the base schema files.
-- It is intentionally additive: it should not delete existing data.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Roles / shared helpers
-- ------------------------------------------------------------

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('admin', 'school_manager', 'principal', 'school_admin', 'student')),
  full_name text,
  display_name text,
  phone text,
  preferred_language text default 'ar' check (preferred_language in ('ar', 'he', 'en')),
  school_id uuid,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles add column if not exists school_id uuid;
alter table public.user_profiles add column if not exists full_name text;
alter table public.user_profiles add column if not exists display_name text;
alter table public.user_profiles add column if not exists phone text;
alter table public.user_profiles add column if not exists preferred_language text default 'ar';
alter table public.user_profiles add column if not exists is_active boolean not null default true;
alter table public.user_profiles add column if not exists last_seen_at timestamptz;
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_user_profiles_role on public.user_profiles(role);
create index if not exists idx_user_profiles_school on public.user_profiles(school_id);

-- Make your current account an admin profile.
insert into public.user_profiles (user_id, role, full_name, display_name, preferred_language, created_at, updated_at)
select id, 'admin', 'yazedassad', 'yazedassad', 'ar', now(), now()
from auth.users
where lower(email) = lower('yazedassad@gmail.com')
on conflict (user_id)
do update set role = 'admin', updated_at = now();

-- ------------------------------------------------------------
-- Schools / institutions used by students and managers
-- ------------------------------------------------------------

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_he text,
  name_en text,
  city_ar text,
  city_he text,
  region text,
  school_type text default 'high_school',
  phone text,
  email text,
  website_url text,
  address_ar text,
  address_he text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schools_active on public.schools(is_active);
create index if not exists idx_schools_city_region on public.schools(city_ar, region);

-- ------------------------------------------------------------
-- Students
-- ------------------------------------------------------------

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  student_id text unique,
  identity_number text,
  first_name text,
  last_name text,
  full_name text,
  email text,
  phone text,
  birthday date,
  gender text,
  school_id uuid references public.schools(id) on delete set null,
  school_name text,
  grade integer,
  class_section text not null default 'alef',
  preferred_language text default 'ar' check (preferred_language in ('ar', 'he', 'en')),
  is_active boolean not null default true,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_identity_number_9_digits check (
    identity_number is null or identity_number ~ '^[0-9]{9}$'
  ),
  constraint students_student_id_9_digits check (
    student_id is null or student_id ~ '^[0-9]{9}$'
  ),
  constraint students_class_section_check check (class_section in ('alef', 'bet', 'gimel', 'dalet'))
);

alter table public.students add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.students add column if not exists identity_number text;
alter table public.students add column if not exists full_name text;
alter table public.students add column if not exists email text;
alter table public.students add column if not exists phone text;
alter table public.students add column if not exists birthday date;
alter table public.students add column if not exists gender text;
alter table public.students add column if not exists school_id uuid references public.schools(id) on delete set null;
alter table public.students add column if not exists school_name text;
alter table public.students add column if not exists grade integer;
alter table public.students add column if not exists class_section text not null default 'alef';
alter table public.students add column if not exists preferred_language text default 'ar';
alter table public.students add column if not exists is_active boolean not null default true;
alter table public.students add column if not exists last_sign_in_at timestamptz;

create index if not exists idx_students_user_id on public.students(user_id);
create index if not exists idx_students_identity_number on public.students(identity_number);
create index if not exists idx_students_school_grade_section on public.students(school_id, grade, class_section);
create index if not exists idx_students_active on public.students(is_active);

-- ------------------------------------------------------------
-- School managers / principal invitations
-- ------------------------------------------------------------

create table if not exists public.principals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text,
  email text not null,
  phone text,
  school_id uuid references public.schools(id) on delete set null,
  school_name text,
  preferred_language text default 'ar' check (preferred_language in ('ar', 'he', 'en')),
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.principals add column if not exists school_id uuid references public.schools(id) on delete set null;
alter table public.principals add column if not exists school_name text;
alter table public.principals add column if not exists email text;
alter table public.principals add column if not exists gmail text;
update public.principals
set email = coalesce(nullif(email, ''), nullif(gmail, ''))
where email is null or email = '';
alter table public.principals add column if not exists role text not null default 'principal';
alter table public.principals add column if not exists is_active boolean not null default true;

create unique index if not exists idx_principals_email_unique on public.principals(lower(email));
create index if not exists idx_principals_school on public.principals(school_id);

create table if not exists public.principal_registration_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  school_name text not null,
  school_id uuid references public.schools(id) on delete set null,
  invite_token text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'approved', 'rejected', 'completed', 'expired')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.principal_registration_requests add column if not exists school_id uuid references public.schools(id) on delete set null;
alter table public.principal_registration_requests add column if not exists full_name text;
alter table public.principal_registration_requests add column if not exists email text;
alter table public.principal_registration_requests add column if not exists phone text;
alter table public.principal_registration_requests add column if not exists school_name text;
alter table public.principal_registration_requests add column if not exists invite_token text;
alter table public.principal_registration_requests add column if not exists status text not null default 'pending';
alter table public.principal_registration_requests add column if not exists notes text;
alter table public.principal_registration_requests add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.principal_registration_requests add column if not exists created_at timestamptz not null default now();
alter table public.principal_registration_requests add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_principal_registration_requests_status on public.principal_registration_requests(status);
create index if not exists idx_principal_registration_requests_email on public.principal_registration_requests(lower(email));

-- ------------------------------------------------------------
-- Subjects / abilities / questions
-- ------------------------------------------------------------

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_he text,
  name_en text,
  code text unique,
  category text,
  description_ar text,
  description_he text,
  description_en text,
  icon text,
  color text,
  difficulty text,
  point_level integer,
  include_in_comprehensive boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subjects_active on public.subjects(is_active);
create index if not exists idx_subjects_category on public.subjects(category);

create table if not exists public.abilities (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_he text,
  name_en text,
  description_ar text,
  description_he text,
  calculation_method text,
  weight numeric(5,2) not null default 1,
  show_in_student_report boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subject_abilities (
  subject_id uuid references public.subjects(id) on delete cascade,
  ability_id uuid references public.abilities(id) on delete cascade,
  weight numeric(5,2) not null default 1,
  primary key (subject_id, ability_id)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete cascade,
  ability_id uuid references public.abilities(id) on delete set null,
  question_text text,
  question_text_ar text,
  question_text_he text,
  option_a_ar text,
  option_a_he text,
  option_b_ar text,
  option_b_he text,
  option_c_ar text,
  option_c_he text,
  option_d_ar text,
  option_d_he text,
  correct_answer text check (correct_answer in ('A', 'B', 'C', 'D')),
  difficulty numeric(5,3) default 0,
  discrimination numeric(5,3) default 1,
  guessing numeric(5,3) default 0.25,
  question_type text default 'multiple_choice',
  cognitive_level text,
  target_language text default 'both' check (target_language in ('ar', 'he', 'both')),
  estimated_time_seconds integer default 60,
  weight numeric(5,2) default 1,
  explanation_ar text,
  explanation_he text,
  tags text[] default '{}',
  times_used integer not null default 0,
  times_correct integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.questions add column if not exists question_text text;
alter table public.questions add column if not exists ability_id uuid references public.abilities(id) on delete set null;
alter table public.questions add column if not exists weight numeric(5,2) default 1;
alter table public.questions add column if not exists explanation_ar text;
alter table public.questions add column if not exists explanation_he text;
alter table public.questions add column if not exists tags text[] default '{}';
alter table public.questions add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists idx_questions_subject on public.questions(subject_id);
create index if not exists idx_questions_ability on public.questions(ability_id);
create index if not exists idx_questions_active on public.questions(is_active);
create index if not exists idx_questions_language on public.questions(target_language);

-- ------------------------------------------------------------
-- Test sessions / student analytics
-- ------------------------------------------------------------

create table if not exists public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  session_type text default 'full_assessment',
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned', 'paused')),
  language text default 'ar' check (language in ('ar', 'he')),
  target_questions integer default 20,
  questions_answered integer default 0,
  correct_answers integer default 0,
  wrong_answers integer default 0,
  skipped_questions integer default 0,
  final_score numeric(6,2),
  final_ability_estimate numeric(6,3),
  total_time_seconds integer,
  heartbeat_events jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.test_sessions add column if not exists school_id uuid references public.schools(id) on delete set null;

create index if not exists idx_test_sessions_student on public.test_sessions(student_id);
create index if not exists idx_test_sessions_school on public.test_sessions(school_id);
create index if not exists idx_test_sessions_status on public.test_sessions(status);
create index if not exists idx_test_sessions_started on public.test_sessions(started_at);

create table if not exists public.student_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.test_sessions(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  selected_answer text,
  is_correct boolean,
  time_taken_seconds integer,
  was_skipped boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.student_abilities (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  ability_id uuid references public.abilities(id) on delete set null,
  ability_estimate numeric(6,3),
  total_questions_answered integer default 0,
  correct_answers integer default 0,
  confidence_score numeric(6,2),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id, ability_id)
);

create table if not exists public.student_interests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  interest_score numeric(6,2),
  questions_attempted integer default 0,
  avg_time_seconds numeric(8,2),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

create table if not exists public.student_recommendations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  recommendation_type text,
  title_ar text,
  title_he text,
  body_ar text,
  body_he text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Games
-- ------------------------------------------------------------

create table if not exists public.games (
  id text primary key,
  title text not null,
  domain text,
  language text default 'he',
  status text default 'active',
  created_at timestamp without time zone default now()
);

alter table public.games add column if not exists title text;
alter table public.games add column if not exists domain text;
alter table public.games add column if not exists language text default 'he';
alter table public.games add column if not exists status text default 'active';
alter table public.games add column if not exists created_at timestamp without time zone default now();

insert into public.games (id, title, domain, language, status)
values
  ('arabic-poet-puzzle', 'كنوز الألفاظ', 'لغة', 'ar', 'active'),
  ('arabic_poet_puzzle', 'كنوز الألفاظ', 'لغة', 'ar', 'active'),
  ('physics-lab', 'مختبر الفيزياء', 'علوم', 'ar', 'active'),
  ('physics_lab', 'Physics Lab', 'physics', 'en', 'active')
on conflict (id) do update
set
  title = excluded.title,
  domain = excluded.domain,
  language = excluded.language;

create table if not exists public.game_levels (
  id text primary key,
  game_id text references public.games(id),
  title text not null,
  difficulty text,
  patient_id text,
  estimated_minutes integer,
  is_active boolean default true,
  created_at timestamp without time zone default now()
);

alter table public.game_levels add column if not exists game_id text;
alter table public.game_levels add column if not exists title text;
alter table public.game_levels add column if not exists difficulty text;
alter table public.game_levels add column if not exists patient_id text;
alter table public.game_levels add column if not exists estimated_minutes integer;
alter table public.game_levels add column if not exists is_active boolean default true;
alter table public.game_levels add column if not exists created_at timestamp without time zone default now();

insert into public.game_levels (id, game_id, title, difficulty, estimated_minutes, is_active)
values
  ('arabic_poet_puzzle_level_1', 'arabic_poet_puzzle', 'المستوى الأول - ألفاظ شعرية قديمة', 'beginner', 8, true),
  ('arabic_emotion_poetry_level_1', 'arabic_poet_puzzle', 'خريطة العاطفة في الشعر العربي', 'intermediate', 10, true),
  ('arabic_majnun_layla_level_1', 'arabic_poet_puzzle', 'المستوى الثالث - خريطة العشق والفراق', 'advanced', 12, true),
  ('physics_lab_level_1', 'physics_lab', 'Level 1 - Speed', 'beginner', 6, true),
  ('physics_lab_level_2', 'physics_lab', 'Level 2 - Distance', 'intermediate', 8, true),
  ('physics_lab_level_3', 'physics_lab', 'Level 3 - Acceleration', 'advanced', 10, true)
on conflict (id) do update
set
  game_id = excluded.game_id,
  title = excluded.title,
  difficulty = excluded.difficulty,
  estimated_minutes = excluded.estimated_minutes,
  is_active = excluded.is_active;

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  game_id text references public.games(id),
  score numeric(8,2),
  max_score numeric(8,2),
  duration_seconds integer,
  mistakes jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.game_sessions add column if not exists game_id text;

create index if not exists idx_game_sessions_student on public.game_sessions(student_id);
create index if not exists idx_game_sessions_game_id on public.game_sessions(game_id);

create table if not exists public.game_action_logs (
  id uuid primary key default gen_random_uuid(),
  game_session_id uuid references public.game_sessions(id),
  scene_id text,
  choice_id text,
  action_type text,
  time_to_choose_ms integer,
  is_optimal boolean,
  created_at timestamp without time zone default now()
);

create index if not exists idx_game_action_logs_session on public.game_action_logs(game_session_id);

-- ------------------------------------------------------------
-- Academic institutions / content / audit / settings
-- ------------------------------------------------------------

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_he text,
  name_en text,
  city_ar text,
  city_he text,
  region text,
  institution_type text default 'college',
  address_ar text,
  address_he text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  website_url text,
  fields text[] default '{}',
  admission_requirements_ar text,
  admission_requirements_he text,
  description_ar text,
  description_he text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  page text,
  ip_address text,
  status text default 'success' check (status in ('success', 'failed')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at);

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
-- Admin-friendly views
-- ------------------------------------------------------------

drop view if exists public.admin_students_overview cascade;
create or replace view public.admin_students_overview as
select
  s.id,
  s.user_id,
  coalesce(s.identity_number, s.student_id) as identity_number,
  coalesce(s.full_name, nullif(trim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, '')), ''), s.email) as full_name,
  s.email,
  s.phone,
  s.school_id,
  coalesce(sc.name_ar, s.school_name) as school_name,
  s.grade,
  s.class_section,
  s.preferred_language,
  s.is_active,
  s.created_at,
  s.last_sign_in_at,
  count(ts.id) filter (where ts.status = 'completed') as completed_tests,
  count(ts.id) as total_sessions,
  max(ts.started_at) as last_test_at
from public.students s
left join public.schools sc on sc.id = s.school_id
left join public.test_sessions ts on ts.student_id = s.id
group by s.id, sc.name_ar;

drop view if exists public.admin_questions_overview cascade;
create or replace view public.admin_questions_overview as
select
  q.*,
  coalesce(q.question_text, q.question_text_ar, q.question_text_he) as display_question,
  coalesce(sub.name_ar, sub.name_he, sub.name_en, sub.code) as subject_name,
  ab.name_ar as ability_name_ar,
  case when q.times_used > 0 then round((q.times_correct::numeric / q.times_used::numeric) * 100, 2) else null end as correct_rate
from public.questions q
left join public.subjects sub on sub.id = q.subject_id
left join public.abilities ab on ab.id = q.ability_id;

-- ------------------------------------------------------------
-- RLS policies for admin / school manager / student
-- ------------------------------------------------------------

alter table public.user_profiles enable row level security;
alter table public.students enable row level security;
alter table public.schools enable row level security;
alter table public.principals enable row level security;
alter table public.subjects enable row level security;
alter table public.abilities enable row level security;
alter table public.questions enable row level security;
alter table public.test_sessions enable row level security;
alter table public.student_responses enable row level security;
alter table public.student_abilities enable row level security;
alter table public.student_interests enable row level security;
alter table public.student_recommendations enable row level security;
alter table public.games enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_action_logs enable row level security;
alter table public.institutions enable row level security;
alter table public.translations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

drop policy if exists "admin read profiles" on public.user_profiles;
create policy "admin read profiles" on public.user_profiles
for select to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

drop policy if exists "admin read all students" on public.students;
create policy "admin read all students" on public.students
for select to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (
    select 1 from public.user_profiles p
    where p.user_id = auth.uid()
      and p.role::text in ('school_manager', 'principal', 'school_admin')
      and p.school_id = students.school_id
  )
);

drop policy if exists "students insert own row" on public.students;
create policy "students insert own row" on public.students
for insert to authenticated
with check (
  user_id = auth.uid()
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

drop policy if exists "students update own row or admin" on public.students;
create policy "students update own row or admin" on public.students
for update to authenticated
using (
  user_id = auth.uid()
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
)
with check (
  user_id = auth.uid()
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

drop policy if exists "admin read reference tables" on public.schools;
create policy "admin read reference tables" on public.schools
for select to authenticated
using (true);

drop policy if exists "admin read subjects" on public.subjects;
create policy "admin read subjects" on public.subjects
for select to authenticated
using (true);

drop policy if exists "admin read abilities" on public.abilities;
create policy "admin read abilities" on public.abilities
for select to authenticated
using (true);

drop policy if exists "admin read questions" on public.questions;
create policy "admin read questions" on public.questions
for select to authenticated
using (true);

drop policy if exists "admin manage questions" on public.questions;
create policy "admin manage questions" on public.questions
for all to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin read sessions" on public.test_sessions;
create policy "admin read sessions" on public.test_sessions
for select to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = test_sessions.student_id and s.user_id = auth.uid())
);

drop policy if exists "admin read student responses" on public.student_responses;
create policy "admin read student responses" on public.student_responses
for select to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = student_responses.student_id and s.user_id = auth.uid())
);

drop policy if exists "admin read student abilities" on public.student_abilities;
create policy "admin read student abilities" on public.student_abilities
for select to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = student_abilities.student_id and s.user_id = auth.uid())
);

drop policy if exists "admin read student interests" on public.student_interests;
create policy "admin read student interests" on public.student_interests
for select to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = student_interests.student_id and s.user_id = auth.uid())
);

drop policy if exists "admin read recommendations" on public.student_recommendations;
create policy "admin read recommendations" on public.student_recommendations
for select to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = student_recommendations.student_id and s.user_id = auth.uid())
);

drop policy if exists "admin read games" on public.games;
create policy "admin read games" on public.games
for select to authenticated
using (true);

drop policy if exists "admin upsert games" on public.games;
create policy "admin upsert games" on public.games
for insert to authenticated
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

drop policy if exists "admin update games" on public.games;
create policy "admin update games" on public.games
for update to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
)
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

drop policy if exists "admin read game sessions" on public.game_sessions;
create policy "admin read game sessions" on public.game_sessions
for select to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = game_sessions.student_id and s.user_id = auth.uid())
);

drop policy if exists "students create game sessions" on public.game_sessions;
create policy "students create game sessions" on public.game_sessions
for insert to authenticated
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = game_sessions.student_id and s.user_id = auth.uid())
);

drop policy if exists "students update own game sessions" on public.game_sessions;
create policy "students update own game sessions" on public.game_sessions
for update to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = game_sessions.student_id and s.user_id = auth.uid())
)
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (select 1 from public.students s where s.id = game_sessions.student_id and s.user_id = auth.uid())
);

drop policy if exists "students read own game logs" on public.game_action_logs;
create policy "students read own game logs" on public.game_action_logs
for select to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (
    select 1
    from public.game_sessions gs
    join public.students s on s.id = gs.student_id
    where gs.id = game_action_logs.game_session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students create game logs" on public.game_action_logs;
create policy "students create game logs" on public.game_action_logs
for insert to authenticated
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (
    select 1
    from public.game_sessions gs
    join public.students s on s.id = gs.student_id
    where gs.id = game_action_logs.game_session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "admin read institutions" on public.institutions;
create policy "admin read institutions" on public.institutions
for select to authenticated
using (true);

drop policy if exists "admin read translations" on public.translations;
create policy "admin read translations" on public.translations
for select to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin read audit logs" on public.audit_logs;
create policy "admin read audit logs" on public.audit_logs
for select to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "admin read system settings" on public.system_settings;
create policy "admin read system settings" on public.system_settings
for select to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
