-- Allow authenticated students to run and complete their own personality test.
-- Policies are scoped through public.students.user_id = auth.uid().

alter table public.personality_test_sessions enable row level security;
alter table public.personality_responses enable row level security;
alter table public.student_personality_profiles enable row level security;

grant select, insert, update on public.personality_test_sessions to authenticated;
grant select, insert on public.personality_responses to authenticated;
grant select, insert, update on public.student_personality_profiles to authenticated;

drop policy if exists "students_select_own_personality_test_sessions" on public.personality_test_sessions;
create policy "students_select_own_personality_test_sessions"
on public.personality_test_sessions
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = personality_test_sessions.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_insert_own_personality_test_sessions" on public.personality_test_sessions;
create policy "students_insert_own_personality_test_sessions"
on public.personality_test_sessions
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = personality_test_sessions.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_update_own_personality_test_sessions" on public.personality_test_sessions;
create policy "students_update_own_personality_test_sessions"
on public.personality_test_sessions
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = personality_test_sessions.student_id
      and s.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = personality_test_sessions.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_select_own_personality_responses" on public.personality_responses;
create policy "students_select_own_personality_responses"
on public.personality_responses
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = personality_responses.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_insert_own_personality_responses" on public.personality_responses;
create policy "students_insert_own_personality_responses"
on public.personality_responses
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = personality_responses.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_select_own_personality_profiles" on public.student_personality_profiles;
create policy "students_select_own_personality_profiles"
on public.student_personality_profiles
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = student_personality_profiles.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_insert_own_personality_profiles" on public.student_personality_profiles;
create policy "students_insert_own_personality_profiles"
on public.student_personality_profiles
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = student_personality_profiles.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_update_own_personality_profiles" on public.student_personality_profiles;
create policy "students_update_own_personality_profiles"
on public.student_personality_profiles
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = student_personality_profiles.student_id
      and s.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = student_personality_profiles.student_id
      and s.user_id = auth.uid()
  )
);
