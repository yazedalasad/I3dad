-- Allow principals to read personality test completion and profiles for students
-- in their own school only. This fixes principal analytics showing 0 completed
-- personality tests when rows exist but RLS hides them from the principal.

alter table public.personality_test_sessions enable row level security;
alter table public.student_personality_profiles enable row level security;

grant select on public.personality_test_sessions to authenticated;
grant select on public.student_personality_profiles to authenticated;

drop policy if exists "principal_select_school_personality_sessions" on public.personality_test_sessions;
create policy "principal_select_school_personality_sessions"
on public.personality_test_sessions
for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = personality_test_sessions.student_id
      and (
        s.user_id = auth.uid()
        or public.is_principal_for_school(s.school_id)
      )
  )
);

drop policy if exists "principal_select_school_personality_profiles" on public.student_personality_profiles;
create policy "principal_select_school_personality_profiles"
on public.student_personality_profiles
for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.students s
    where s.id = student_personality_profiles.student_id
      and (
        s.user_id = auth.uid()
        or public.is_principal_for_school(s.school_id)
      )
  )
);

-- Quick admin check after running:
-- select count(*) from public.student_personality_profiles spp
-- join public.students s on s.id = spp.student_id
-- where s.school_name = 'مدرسة اللقية الثانوية';
