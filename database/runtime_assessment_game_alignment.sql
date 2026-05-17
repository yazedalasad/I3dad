-- ============================================================
-- Runtime assessment/game schema alignment for i3dad / إعداد
-- ============================================================
-- Additive migration for columns and tables used by the current
-- client services. Run after the base admin/schema migrations so
-- public.is_admin() is available.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Comprehensive assessment runtime columns
-- ------------------------------------------------------------

alter table public.test_sessions add column if not exists language text default 'ar';
alter table public.test_sessions add column if not exists target_questions integer;
alter table public.test_sessions add column if not exists total_time_seconds integer;
alter table public.test_sessions add column if not exists active_time_seconds integer default 0;
alter table public.test_sessions add column if not exists idle_time_seconds integer default 0;
alter table public.test_sessions add column if not exists engagement_score numeric;
alter table public.test_sessions add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.test_session_subjects (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  target_questions integer not null default 0,
  questions_answered integer not null default 0,
  correct_answers integer not null default 0,
  is_complete boolean not null default false,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, subject_id)
);

create index if not exists idx_test_session_subjects_session
  on public.test_session_subjects(session_id);
create index if not exists idx_test_session_subjects_student
  on public.test_session_subjects(student_id);

create table if not exists public.session_heartbeats (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  event_type text not null default 'heartbeat',
  meta jsonb not null default '{}'::jsonb,
  client_ts timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_session_heartbeats_session
  on public.session_heartbeats(session_id, created_at);
create index if not exists idx_session_heartbeats_student
  on public.session_heartbeats(student_id);

-- ------------------------------------------------------------
-- Educational game runtime columns
-- ------------------------------------------------------------

alter table public.game_sessions add column if not exists level_id text;
alter table public.game_sessions add column if not exists status text not null default 'in_progress';
alter table public.game_sessions add column if not exists language text default 'ar';
alter table public.game_sessions add column if not exists current_scene_id text;
alter table public.game_sessions add column if not exists ended_at timestamptz;
alter table public.game_sessions add column if not exists interest_signal numeric;
alter table public.game_sessions add column if not exists engagement_score numeric;
alter table public.game_sessions add column if not exists trust_score numeric;
alter table public.game_sessions add column if not exists hebrew_score numeric;
alter table public.game_sessions add column if not exists medical_reasoning_score numeric;
alter table public.game_sessions add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_game_sessions_student_status
  on public.game_sessions(student_id, status, created_at desc);
create index if not exists idx_game_sessions_game_level
  on public.game_sessions(game_id, level_id);

-- ------------------------------------------------------------
-- RLS for client-owned runtime writes
-- ------------------------------------------------------------

alter table public.test_session_subjects enable row level security;
alter table public.session_heartbeats enable row level security;

grant select, insert, update, delete on public.test_session_subjects to authenticated;
grant select, insert on public.session_heartbeats to authenticated;

drop policy if exists "students_manage_own_test_session_subjects" on public.test_session_subjects;
create policy "students_manage_own_test_session_subjects"
on public.test_session_subjects
for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = test_session_subjects.student_id
      and s.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = test_session_subjects.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_insert_own_session_heartbeats" on public.session_heartbeats;
create policy "students_insert_own_session_heartbeats"
on public.session_heartbeats
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = session_heartbeats.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_read_own_session_heartbeats" on public.session_heartbeats;
create policy "students_read_own_session_heartbeats"
on public.session_heartbeats
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = session_heartbeats.student_id
      and s.user_id = auth.uid()
  )
);
