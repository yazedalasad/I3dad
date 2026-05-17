-- ============================================================
-- i3dad / إعداد / איעדאד
-- Full Admin Database Permissions + RLS Policies
--
-- انسخ هذا الملف وشغله في Supabase SQL Editor.
--
-- ماذا يفعل؟
-- 1) يثبت حساب yazedassad@gmail.com كـ admin في Auth metadata.
-- 2) ينشئ دوال مساعدة لمعرفة هل المستخدم admin أو مدير مدرسة.
-- 3) يضيف أعمدة الأدمن الناقصة بدون كسر البيانات.
-- 4) يفعل RLS على الجداول المهمة.
-- 5) يعطي الأدمن صلاحيات قراءة/إضافة/تعديل/حذف على بيانات النظام.
-- 6) يعطي مدير المدرسة صلاحية رؤية طلاب مدرسته فقط.
--
-- مهم:
-- - هذا الملف لا ينشئ مستخدمي auth بكلمات مرور.
-- - إضافة طالب بحساب دخول جديد تحتاج Edge Function create-student
--   أو إنشاء المستخدم من Supabase Auth ثم ربطه بجدول students.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Helper functions
-- ------------------------------------------------------------

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    (
      select up.role::text
      from public.user_profiles up
      where up.user_id = auth.uid()
      limit 1
    ),
    ''
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.current_app_role() = 'admin'
    or exists (
      select 1
      from auth.users u
      where u.id = auth.uid()
        and lower(u.email) = lower('yazedassad@gmail.com')
    );
$$;

create or replace function public.current_principal_school_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.school_id
  from public.principals p
  where p.user_id = auth.uid()
    and p.is_active = true
  limit 1;
$$;

create or replace function public.is_school_manager_for_school(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.principals p
    where p.user_id = auth.uid()
      and p.is_active = true
      and p.school_id = target_school_id
  );
$$;

-- ------------------------------------------------------------
-- 2) Make current user admin
-- ------------------------------------------------------------

-- لا نضيف صفًا في public.admins أو public.user_profiles هنا لأن بعض قواعد
-- المشروع فيها trigger يمنع تعدد الأدوار باسم prevent_multi_role().
-- نثبت صلاحية الأدمن في Auth metadata بدلًا من ذلك.
update auth.users
set
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
  updated_at = now()
where lower(email) = lower('yazedassad@gmail.com');

-- ------------------------------------------------------------
-- 3) Add admin-needed columns safely
-- ------------------------------------------------------------

alter table public.students
  add column if not exists class_section text,
  add column if not exists preferred_language text default 'ar',
  add column if not exists is_active boolean not null default true,
  add column if not exists last_sign_in_at timestamptz;

update public.students
set class_section = 'alef'
where class_section is null or btrim(class_section) = '';

alter table public.students
  alter column class_section set default 'alef';

alter table public.students
  alter column class_section set not null;

alter table public.students
  drop constraint if exists students_class_section_check;

alter table public.students
  add constraint students_class_section_check
  check (class_section in ('alef', 'bet', 'gimel', 'dalet'));

-- لا نضيف constraint رقم هوية الآن حتى لا يمنع تعديل الصفوف القديمة.
alter table public.students
  drop constraint if exists students_student_id_9_digits_check;

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
-- 4) Admin support tables
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
-- 5) Indexes
-- ------------------------------------------------------------

create index if not exists idx_students_student_id on public.students(student_id);
create index if not exists idx_students_school_grade_section on public.students(school_id, grade, class_section);
create index if not exists idx_students_user_id on public.students(user_id);
create index if not exists idx_students_active on public.students(is_active);

create index if not exists idx_test_sessions_student on public.test_sessions(student_id);
create index if not exists idx_test_sessions_status on public.test_sessions(status);
create index if not exists idx_test_sessions_started_at on public.test_sessions(started_at);

create index if not exists idx_student_responses_student on public.student_responses(student_id);
create index if not exists idx_student_abilities_student on public.student_abilities(student_id);
create index if not exists idx_student_interests_student on public.student_interests(student_id);
create index if not exists idx_questions_subject on public.questions(subject_id);
create index if not exists idx_questions_active on public.questions(is_active);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);

-- ------------------------------------------------------------
-- 6) Enable RLS
-- ------------------------------------------------------------

alter table public.user_profiles enable row level security;
alter table public.admins enable row level security;
alter table public.students enable row level security;
alter table public.schools enable row level security;
alter table public.principals enable row level security;
alter table public.subjects enable row level security;
alter table public.questions enable row level security;
alter table public.test_sessions enable row level security;
alter table public.test_session_subjects enable row level security;
alter table public.session_heartbeats enable row level security;
alter table public.student_responses enable row level security;
alter table public.student_abilities enable row level security;
alter table public.student_interests enable row level security;
alter table public.student_learning_potential enable row level security;
alter table public.student_recommendations enable row level security;
alter table public.personality_test_sessions enable row level security;
alter table public.personality_responses enable row level security;
alter table public.student_personality_profiles enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_action_logs enable row level security;
alter table public.games enable row level security;
alter table public.game_levels enable row level security;
alter table public.institutions enable row level security;
alter table public.programs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.translations enable row level security;
alter table public.system_settings enable row level security;

-- ------------------------------------------------------------
-- 7) Drop old policy names from this file
-- ------------------------------------------------------------

drop policy if exists "admin_all_user_profiles" on public.user_profiles;
drop policy if exists "admin_all_admins" on public.admins;
drop policy if exists "admin_all_students" on public.students;
drop policy if exists "student_read_self" on public.students;
drop policy if exists "student_insert_self" on public.students;
drop policy if exists "student_update_self" on public.students;
drop policy if exists "manager_read_school_students" on public.students;
drop policy if exists "admin_all_schools" on public.schools;
drop policy if exists "authenticated_read_schools" on public.schools;
drop policy if exists "admin_all_principals" on public.principals;
drop policy if exists "principal_read_self" on public.principals;
drop policy if exists "admin_all_subjects" on public.subjects;
drop policy if exists "authenticated_read_subjects" on public.subjects;
drop policy if exists "admin_all_questions" on public.questions;
drop policy if exists "authenticated_read_questions" on public.questions;

-- ------------------------------------------------------------
-- 8) Core users / roles policies
-- ------------------------------------------------------------

create policy "admin_all_user_profiles"
on public.user_profiles
for all
to authenticated
using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

create policy "admin_all_admins"
on public.admins
for all
to authenticated
using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin());

-- ------------------------------------------------------------
-- 9) Students policies
-- ------------------------------------------------------------

create policy "admin_all_students"
on public.students
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "student_read_self"
on public.students
for select
to authenticated
using (user_id = auth.uid());

create policy "student_insert_self"
on public.students
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

create policy "student_update_self"
on public.students
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "manager_read_school_students"
on public.students
for select
to authenticated
using (public.is_school_manager_for_school(school_id));

-- ------------------------------------------------------------
-- 10) Schools / principals / subjects / questions
-- ------------------------------------------------------------

create policy "admin_all_schools"
on public.schools
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "authenticated_read_schools"
on public.schools
for select
to authenticated
using (true);

create policy "admin_all_principals"
on public.principals
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "principal_read_self"
on public.principals
for select
to authenticated
using (user_id = auth.uid());

create policy "admin_all_subjects"
on public.subjects
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "authenticated_read_subjects"
on public.subjects
for select
to authenticated
using (true);

create policy "admin_all_questions"
on public.questions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "authenticated_read_questions"
on public.questions
for select
to authenticated
using (true);

-- ------------------------------------------------------------
-- 11) Generic admin policies for system tables
-- ------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'test_sessions',
    'test_session_subjects',
    'session_heartbeats',
    'student_responses',
    'student_abilities',
    'student_interests',
    'student_learning_potential',
    'student_recommendations',
    'personality_test_sessions',
    'personality_responses',
    'student_personality_profiles',
    'game_sessions',
    'game_action_logs',
    'games',
    'game_levels',
    'institutions',
    'programs',
    'audit_logs',
    'translations',
    'system_settings'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'admin_all_' || t, t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      'admin_all_' || t,
      t
    );
  end loop;
end $$;

-- ------------------------------------------------------------
-- 12) Student self-read policies for their own data
-- ------------------------------------------------------------

drop policy if exists "student_read_own_test_sessions" on public.test_sessions;
create policy "student_read_own_test_sessions"
on public.test_sessions
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.students s
    where s.id = test_sessions.student_id
      and s.user_id = auth.uid()
  )
  or exists (
    select 1 from public.students s
    where s.id = test_sessions.student_id
      and public.is_school_manager_for_school(s.school_id)
  )
);

drop policy if exists "student_read_own_abilities" on public.student_abilities;
create policy "student_read_own_abilities"
on public.student_abilities
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.students s
    where s.id = student_abilities.student_id
      and s.user_id = auth.uid()
  )
  or exists (
    select 1 from public.students s
    where s.id = student_abilities.student_id
      and public.is_school_manager_for_school(s.school_id)
  )
);

drop policy if exists "student_read_own_interests" on public.student_interests;
create policy "student_read_own_interests"
on public.student_interests
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.students s
    where s.id = student_interests.student_id
      and s.user_id = auth.uid()
  )
  or exists (
    select 1 from public.students s
    where s.id = student_interests.student_id
      and public.is_school_manager_for_school(s.school_id)
  )
);

-- ------------------------------------------------------------
-- 13) Admin overview views
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

-- ------------------------------------------------------------
-- 14) Check invalid student identity numbers
-- ------------------------------------------------------------

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
