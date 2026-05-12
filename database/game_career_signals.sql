-- Game career signals layer.
-- Keeps full_assessment as the main recommendation source and adds a capped game bonus.

create extension if not exists pgcrypto;

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

create table if not exists public.student_game_skills (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  game_session_id uuid references public.game_sessions(id) on delete cascade,
  game_key text not null,
  topic_key text not null,
  skill_tag text not null,
  ability_signal numeric(6,2) not null default 0 check (ability_signal >= 0 and ability_signal <= 100),
  interest_signal numeric(6,2) not null default 0 check (interest_signal >= 0 and interest_signal <= 100),
  signal_strength numeric(6,2) not null default 0 check (signal_strength >= 0 and signal_strength <= 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, game_session_id, topic_key, skill_tag)
);

create table if not exists public.student_game_interests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  game_session_id uuid references public.game_sessions(id) on delete cascade,
  game_key text not null,
  topic_key text not null,
  related_subject text not null,
  ability_signal numeric(6,2) not null default 0 check (ability_signal >= 0 and ability_signal <= 100),
  interest_signal numeric(6,2) not null default 0 check (interest_signal >= 0 and interest_signal <= 100),
  signal_weight numeric(6,3) not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, game_session_id, topic_key, related_subject)
);

create table if not exists public.student_career_signals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  game_session_id uuid references public.game_sessions(id) on delete cascade,
  game_key text not null,
  topic_key text not null,
  degree_code text not null,
  degree_id uuid references public.degrees(id) on delete set null,
  ability_signal numeric(6,2) not null default 0 check (ability_signal >= 0 and ability_signal <= 100),
  interest_signal numeric(6,2) not null default 0 check (interest_signal >= 0 and interest_signal <= 100),
  signal_weight numeric(6,3) not null default 1,
  career_signal numeric(8,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, game_session_id, topic_key, degree_code)
);

create index if not exists idx_student_game_skills_student on public.student_game_skills(student_id, signal_strength desc);
create index if not exists idx_student_game_interests_student on public.student_game_interests(student_id, interest_signal desc);
create index if not exists idx_student_career_signals_student on public.student_career_signals(student_id, degree_id, career_signal desc);

alter table public.student_game_skills enable row level security;
alter table public.student_game_interests enable row level security;
alter table public.student_career_signals enable row level security;

grant select, insert, update on public.student_game_skills to authenticated;
grant select, insert, update on public.student_game_interests to authenticated;
grant select, insert, update on public.student_career_signals to authenticated;

drop policy if exists "student_read_own_game_skills" on public.student_game_skills;
create policy "student_read_own_game_skills"
on public.student_game_skills
for select to authenticated
using (
  exists (select 1 from public.students s where s.id = student_game_skills.student_id and s.user_id = auth.uid())
  or public.is_admin()
  or exists (select 1 from public.students s where s.id = student_game_skills.student_id and public.is_principal_for_school(s.school_id))
);

drop policy if exists "student_write_own_game_skills" on public.student_game_skills;
create policy "student_write_own_game_skills"
on public.student_game_skills
for insert to authenticated
with check (exists (select 1 from public.students s where s.id = student_game_skills.student_id and s.user_id = auth.uid()));

drop policy if exists "student_update_own_game_skills" on public.student_game_skills;
create policy "student_update_own_game_skills"
on public.student_game_skills
for update to authenticated
using (exists (select 1 from public.students s where s.id = student_game_skills.student_id and s.user_id = auth.uid()))
with check (exists (select 1 from public.students s where s.id = student_game_skills.student_id and s.user_id = auth.uid()));

drop policy if exists "student_read_own_game_interests" on public.student_game_interests;
create policy "student_read_own_game_interests"
on public.student_game_interests
for select to authenticated
using (
  exists (select 1 from public.students s where s.id = student_game_interests.student_id and s.user_id = auth.uid())
  or public.is_admin()
  or exists (select 1 from public.students s where s.id = student_game_interests.student_id and public.is_principal_for_school(s.school_id))
);

drop policy if exists "student_write_own_game_interests" on public.student_game_interests;
create policy "student_write_own_game_interests"
on public.student_game_interests
for insert to authenticated
with check (exists (select 1 from public.students s where s.id = student_game_interests.student_id and s.user_id = auth.uid()));

drop policy if exists "student_update_own_game_interests" on public.student_game_interests;
create policy "student_update_own_game_interests"
on public.student_game_interests
for update to authenticated
using (exists (select 1 from public.students s where s.id = student_game_interests.student_id and s.user_id = auth.uid()))
with check (exists (select 1 from public.students s where s.id = student_game_interests.student_id and s.user_id = auth.uid()));

drop policy if exists "student_read_own_career_signals" on public.student_career_signals;
create policy "student_read_own_career_signals"
on public.student_career_signals
for select to authenticated
using (
  exists (select 1 from public.students s where s.id = student_career_signals.student_id and s.user_id = auth.uid())
  or public.is_admin()
  or exists (select 1 from public.students s where s.id = student_career_signals.student_id and public.is_principal_for_school(s.school_id))
);

drop policy if exists "student_write_own_career_signals" on public.student_career_signals;
create policy "student_write_own_career_signals"
on public.student_career_signals
for insert to authenticated
with check (exists (select 1 from public.students s where s.id = student_career_signals.student_id and s.user_id = auth.uid()));

drop policy if exists "student_update_own_career_signals" on public.student_career_signals;
create policy "student_update_own_career_signals"
on public.student_career_signals
for update to authenticated
using (exists (select 1 from public.students s where s.id = student_career_signals.student_id and s.user_id = auth.uid()))
with check (exists (select 1 from public.students s where s.id = student_career_signals.student_id and s.user_id = auth.uid()));
