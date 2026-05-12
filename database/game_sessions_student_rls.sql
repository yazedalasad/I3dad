-- Fix game session RLS for students.
-- Run this in Supabase SQL Editor if game_sessions insert/update says:
-- "new row violates row-level security policy for table game_sessions".

alter table public.game_sessions enable row level security;
alter table public.game_action_logs enable row level security;

drop policy if exists "students_manage_own_game_sessions" on public.game_sessions;
create policy "students_manage_own_game_sessions"
on public.game_sessions
for all
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (
    select 1
    from public.students s
    where s.id = game_sessions.student_id
      and s.user_id = auth.uid()
  )
)
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (
    select 1
    from public.students s
    where s.id = game_sessions.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_manage_own_game_action_logs" on public.game_action_logs;
create policy "students_manage_own_game_action_logs"
on public.game_action_logs
for all
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  or exists (
    select 1
    from public.game_sessions gs
    join public.students s on s.id = gs.student_id
    where gs.id = game_action_logs.game_session_id
      and s.user_id = auth.uid()
  )
)
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
