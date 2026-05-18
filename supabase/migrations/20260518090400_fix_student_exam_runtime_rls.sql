-- Allow authenticated students to run their own comprehensive assessment.
-- Policies are scoped through public.students.user_id = auth.uid().

alter table public.test_sessions enable row level security;
alter table public.test_session_subjects enable row level security;
alter table public.session_heartbeats enable row level security;
alter table public.student_responses enable row level security;

grant select, insert, update on public.test_sessions to authenticated;
grant select, insert, update on public.test_session_subjects to authenticated;
grant select, insert on public.session_heartbeats to authenticated;
grant select, insert on public.student_responses to authenticated;

drop policy if exists "students_insert_own_test_sessions" on public.test_sessions;
create policy "students_insert_own_test_sessions"
on public.test_sessions
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = test_sessions.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_update_own_test_sessions" on public.test_sessions;
create policy "students_update_own_test_sessions"
on public.test_sessions
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = test_sessions.student_id
      and s.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = test_sessions.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_select_own_test_session_subjects" on public.test_session_subjects;
create policy "students_select_own_test_session_subjects"
on public.test_session_subjects
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = test_session_subjects.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_insert_own_test_session_subjects" on public.test_session_subjects;
create policy "students_insert_own_test_session_subjects"
on public.test_session_subjects
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = test_session_subjects.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_update_own_test_session_subjects" on public.test_session_subjects;
create policy "students_update_own_test_session_subjects"
on public.test_session_subjects
for update
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

drop policy if exists "students_select_own_session_heartbeats" on public.session_heartbeats;
create policy "students_select_own_session_heartbeats"
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

drop policy if exists "students_insert_own_student_responses" on public.student_responses;
create policy "students_insert_own_student_responses"
on public.student_responses
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = student_responses.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_select_own_student_responses" on public.student_responses;
create policy "students_select_own_student_responses"
on public.student_responses
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = student_responses.student_id
      and s.user_id = auth.uid()
  )
);
