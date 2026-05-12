-- Principal / school manager scoped management upgrade.
-- Run after principal_invitation_flow.sql and admin_panel_complete_schema.sql.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    (select up.role::text from public.user_profiles up where up.user_id = auth.uid() limit 1),
    ''
  );
$$;

create or replace function public.current_principal_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.principals p
  where p.user_id = auth.uid()
    and p.role = 'principal'
    and coalesce(p.is_active, true) = true
  limit 1;
$$;

create or replace function public.current_principal_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.school_id from public.principals p where p.user_id = auth.uid() and p.role = 'principal' and coalesce(p.is_active, true) = true limit 1),
    (select up.school_id from public.user_profiles up where up.user_id = auth.uid() and up.role::text = 'principal' and coalesce(up.is_active, true) = true limit 1)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.is_principal_for_school(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_school_id is not null
    and public.current_principal_school_id() = target_school_id;
$$;

-- ---------------------------------------------------------------------
-- Existing table hardening / compatibility columns
-- ---------------------------------------------------------------------

alter table public.user_profiles add column if not exists school_id uuid references public.schools(id) on delete set null;
alter table public.user_profiles add column if not exists role text default 'student';
alter table public.user_profiles add column if not exists is_active boolean not null default true;

alter table public.students add column if not exists preferred_language text default 'ar';
alter table public.students add column if not exists class_section text default 'alef';
alter table public.students add column if not exists is_active boolean not null default true;
alter table public.students add column if not exists last_sign_in_at timestamptz;

alter table public.test_sessions add column if not exists school_id uuid references public.schools(id) on delete set null;
alter table public.test_sessions add column if not exists engagement_score numeric(6,2);

update public.test_sessions ts
set school_id = s.school_id
from public.students s
where ts.student_id = s.id
  and ts.school_id is null;

create index if not exists idx_students_principal_scope on public.students(school_id, grade, class_section, is_active);
create index if not exists idx_test_sessions_principal_scope on public.test_sessions(school_id, student_id, status, started_at);

-- ---------------------------------------------------------------------
-- Activities
-- ---------------------------------------------------------------------

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title_ar text not null,
  title_he text,
  description_ar text,
  description_he text,
  activity_date timestamptz,
  location text,
  capacity integer,
  image_url text,
  is_global boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_registrations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'waiting_list', 'cancelled', 'attended')),
  registered_by uuid references auth.users(id) on delete set null,
  feedback_score numeric(4,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(activity_id, student_id)
);

create table if not exists public.activity_stats (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  registrations_count integer not null default 0,
  attended_count integer not null default 0,
  waiting_list_count integer not null default 0,
  attendance_rate numeric(6,2) not null default 0,
  feedback_score numeric(4,2),
  updated_at timestamptz not null default now(),
  unique(activity_id)
);

-- Existing projects may already have the activities module with a richer
-- public-event schema. Add the principal-scoping columns without replacing it.
alter table public.activities add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.activities add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.activities add column if not exists is_global boolean not null default false;
alter table public.activities add column if not exists created_by_role text;
alter table public.activities add column if not exists visibility text;

update public.activities
set visibility = case when coalesce(is_global, false) = true or school_id is null then 'global' else 'school_only' end
where visibility is null;

update public.activities
set created_by_role = case when created_by is null then 'admin' else coalesce(created_by_role, 'admin') end
where created_by_role is null;

alter table public.activities alter column visibility set default 'school_only';
alter table public.activities alter column visibility set not null;
alter table public.activities alter column created_by_role set default 'admin';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'activities_created_by_role_check'
      and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_created_by_role_check
      check (created_by_role in ('admin', 'principal'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'activities_visibility_check'
      and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_visibility_check
      check (visibility in ('global', 'school_only'));
  end if;
end $$;

alter table public.activity_registrations add column if not exists student_id uuid references public.students(id) on delete cascade;
alter table public.activity_registrations add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.activity_registrations add column if not exists registered_by uuid references auth.users(id) on delete set null;

alter table public.activity_stats add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.activity_stats add column if not exists registrations_count integer not null default 0;
alter table public.activity_stats add column if not exists attended_count integer not null default 0;
alter table public.activity_stats add column if not exists waiting_list_count integer not null default 0;
alter table public.activity_stats add column if not exists feedback_score numeric(4,2);

create index if not exists idx_activities_school on public.activities(school_id, activity_date, is_active);
create index if not exists idx_activity_registrations_school on public.activity_registrations(school_id, status);

-- ---------------------------------------------------------------------
-- Principal notes and notifications
-- ---------------------------------------------------------------------

create table if not exists public.principal_student_notes (
  id uuid primary key default gen_random_uuid(),
  principal_id uuid not null references public.principals(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  note text not null,
  visibility text not null default 'principal_only' check (visibility in ('principal_only', 'school_staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.principal_notifications (
  id uuid primary key default gen_random_uuid(),
  principal_id uuid references public.principals(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  type text not null,
  title_ar text,
  title_he text,
  body_ar text,
  body_he text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_principal_notes_scope on public.principal_student_notes(principal_id, school_id, student_id);
create index if not exists idx_principal_notifications_scope on public.principal_notifications(principal_id, school_id, is_read, created_at desc);

-- Recommendation follow-up note kept separate from recommendation generation.
create table if not exists public.principal_recommendation_notes (
  id uuid primary key default gen_random_uuid(),
  principal_id uuid not null references public.principals(id) on delete cascade,
  recommendation_id uuid not null references public.student_recommendations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Audit log compatibility
-- ---------------------------------------------------------------------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id uuid,
  page text,
  status text default 'success',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs add column if not exists actor_role text;
alter table public.audit_logs add column if not exists page text;
alter table public.audit_logs add column if not exists status text default 'success';
create index if not exists idx_audit_logs_principal_actions on public.audit_logs(actor_id, actor_role, created_at desc);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.students enable row level security;
alter table public.test_sessions enable row level security;
alter table public.student_abilities enable row level security;
alter table public.student_interests enable row level security;
alter table public.student_learning_potential enable row level security;
alter table public.student_recommendations enable row level security;
alter table public.personality_test_sessions enable row level security;
alter table public.student_personality_profiles enable row level security;
alter table public.activities enable row level security;
alter table public.activity_registrations enable row level security;
alter table public.activity_stats enable row level security;
alter table public.principal_student_notes enable row level security;
alter table public.principal_notifications enable row level security;
alter table public.principal_recommendation_notes enable row level security;
alter table public.audit_logs enable row level security;

grant select, update on public.students to authenticated;
grant select on public.test_sessions, public.student_abilities, public.student_interests, public.student_learning_potential, public.student_recommendations to authenticated;
grant select on public.personality_test_sessions, public.student_personality_profiles to authenticated;
grant select, insert, update on public.activities, public.activity_registrations to authenticated;
grant select on public.activity_stats to authenticated;
grant select, insert, update, delete on public.principal_student_notes to authenticated;
grant select, update on public.principal_notifications to authenticated;
grant select, insert, update, delete on public.principal_recommendation_notes to authenticated;
grant insert, select on public.audit_logs to authenticated;

drop policy if exists "principal_select_own_school_students" on public.students;
create policy "principal_select_own_school_students"
on public.students
for select to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or public.is_principal_for_school(school_id)
);

drop policy if exists "principal_update_safe_student_fields" on public.students;
create policy "principal_update_safe_student_fields"
on public.students
for update to authenticated
using (public.is_admin() or public.is_principal_for_school(school_id))
with check (
  public.is_admin()
  or (
    public.is_principal_for_school(school_id)
    and school_id = (select s.school_id from public.students s where s.id = students.id)
    and user_id = (select s.user_id from public.students s where s.id = students.id)
  )
);

drop policy if exists "principal_select_school_sessions" on public.test_sessions;
create policy "principal_select_school_sessions"
on public.test_sessions
for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = test_sessions.student_id and (s.user_id = auth.uid() or public.is_principal_for_school(s.school_id)))
);

drop policy if exists "principal_select_school_abilities" on public.student_abilities;
create policy "principal_select_school_abilities"
on public.student_abilities
for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = student_abilities.student_id and (s.user_id = auth.uid() or public.is_principal_for_school(s.school_id)))
);

drop policy if exists "principal_select_school_interests" on public.student_interests;
create policy "principal_select_school_interests"
on public.student_interests
for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = student_interests.student_id and (s.user_id = auth.uid() or public.is_principal_for_school(s.school_id)))
);

drop policy if exists "principal_select_school_potential" on public.student_learning_potential;
create policy "principal_select_school_potential"
on public.student_learning_potential
for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = student_learning_potential.student_id and (s.user_id = auth.uid() or public.is_principal_for_school(s.school_id)))
);

drop policy if exists "principal_select_school_recommendations" on public.student_recommendations;
create policy "principal_select_school_recommendations"
on public.student_recommendations
for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = student_recommendations.student_id and (s.user_id = auth.uid() or public.is_principal_for_school(s.school_id)))
);

drop policy if exists "principal_select_school_personality_sessions" on public.personality_test_sessions;
create policy "principal_select_school_personality_sessions"
on public.personality_test_sessions
for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = personality_test_sessions.student_id and (s.user_id = auth.uid() or public.is_principal_for_school(s.school_id)))
);

drop policy if exists "principal_select_school_personality_profiles" on public.student_personality_profiles;
create policy "principal_select_school_personality_profiles"
on public.student_personality_profiles
for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.students s where s.id = student_personality_profiles.student_id and (s.user_id = auth.uid() or public.is_principal_for_school(s.school_id)))
);

drop policy if exists "principal_manage_own_school_activities" on public.activities;
drop policy if exists "principal_select_scoped_activities" on public.activities;
create policy "principal_select_scoped_activities"
on public.activities
for select to authenticated
using (
  public.is_admin()
  or visibility = 'global'
  or (visibility = 'school_only' and public.is_principal_for_school(school_id))
);

drop policy if exists "principal_insert_school_activities" on public.activities;
create policy "principal_insert_school_activities"
on public.activities
for insert to authenticated
with check (
  public.is_admin()
  or (
    visibility = 'school_only'
    and public.is_principal_for_school(school_id)
    and created_by = auth.uid()
    and created_by_role = 'principal'
    and coalesce(featured, false) = false
    and coalesce(is_global, false) = false
  )
);

drop policy if exists "principal_update_school_activities" on public.activities;
create policy "principal_update_school_activities"
on public.activities
for update to authenticated
using (
  public.is_admin()
  or (
    created_by = auth.uid()
    and created_by_role = 'principal'
    and visibility = 'school_only'
    and public.is_principal_for_school(school_id)
  )
)
with check (
  public.is_admin()
  or (
    created_by = auth.uid()
    and created_by_role = 'principal'
    and visibility = 'school_only'
    and public.is_principal_for_school(school_id)
    and coalesce(featured, false) = false
    and coalesce(is_global, false) = false
  )
);

drop policy if exists "admin_delete_activities" on public.activities;
create policy "admin_delete_activities"
on public.activities
for delete to authenticated
using (public.is_admin());

drop policy if exists "principal_manage_own_school_registrations" on public.activity_registrations;
create policy "principal_manage_own_school_registrations"
on public.activity_registrations
for all to authenticated
using (public.is_admin() or public.is_principal_for_school(school_id))
with check (
  public.is_admin()
  or (
    public.is_principal_for_school(school_id)
    and exists (select 1 from public.students s where s.id = activity_registrations.student_id and s.school_id = activity_registrations.school_id)
    and exists (select 1 from public.activities a where a.id = activity_registrations.activity_id and (a.school_id = activity_registrations.school_id or a.is_global = true))
  )
);

drop policy if exists "principal_select_own_school_activity_stats" on public.activity_stats;
create policy "principal_select_own_school_activity_stats"
on public.activity_stats
for select to authenticated
using (public.is_admin() or public.is_principal_for_school(school_id));

drop policy if exists "principal_manage_own_notes" on public.principal_student_notes;
create policy "principal_manage_own_notes"
on public.principal_student_notes
for all to authenticated
using (
  public.is_admin()
  or (principal_id = public.current_principal_id() and public.is_principal_for_school(school_id))
)
with check (
  public.is_admin()
  or (
    principal_id = public.current_principal_id()
    and public.is_principal_for_school(school_id)
    and exists (select 1 from public.students s where s.id = principal_student_notes.student_id and s.school_id = principal_student_notes.school_id)
  )
);

drop policy if exists "principal_read_update_own_notifications" on public.principal_notifications;
create policy "principal_read_update_own_notifications"
on public.principal_notifications
for select to authenticated
using (
  public.is_admin()
  or (principal_id = public.current_principal_id() and public.is_principal_for_school(school_id))
);

drop policy if exists "principal_update_own_notifications" on public.principal_notifications;
create policy "principal_update_own_notifications"
on public.principal_notifications
for update to authenticated
using (principal_id = public.current_principal_id() and public.is_principal_for_school(school_id))
with check (principal_id = public.current_principal_id() and public.is_principal_for_school(school_id));

drop policy if exists "principal_manage_recommendation_notes" on public.principal_recommendation_notes;
create policy "principal_manage_recommendation_notes"
on public.principal_recommendation_notes
for all to authenticated
using (public.is_admin() or (principal_id = public.current_principal_id() and public.is_principal_for_school(school_id)))
with check (
  public.is_admin()
  or (
    principal_id = public.current_principal_id()
    and public.is_principal_for_school(school_id)
    and exists (select 1 from public.students s where s.id = principal_recommendation_notes.student_id and s.school_id = principal_recommendation_notes.school_id)
  )
);

drop policy if exists "principal_insert_audit_logs" on public.audit_logs;
create policy "principal_insert_audit_logs"
on public.audit_logs
for insert to authenticated
with check (
  actor_id = auth.uid()
  and actor_role in ('principal', 'admin')
);

drop policy if exists "principal_read_own_audit_logs" on public.audit_logs;
create policy "principal_read_own_audit_logs"
on public.audit_logs
for select to authenticated
using (public.is_admin() or actor_id = auth.uid());
