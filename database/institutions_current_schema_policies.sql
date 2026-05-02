-- ============================================================
-- Institutions permissions for the CURRENT production schema
-- ============================================================
-- This matches the current public.institutions table:
-- id, name_he, name_ar, name_en, type, website, is_active, created_at, updated_at
--
-- Run in Supabase SQL Editor.

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

alter table public.institutions enable row level security;
alter table public.programs enable row level security;
alter table public.program_subject_weights enable row level security;

grant usage on schema public to authenticated, anon;
grant select on public.institutions to authenticated, anon;
grant insert, update, delete on public.institutions to authenticated;
grant select on public.programs to authenticated, anon;
grant insert, update, delete on public.programs to authenticated;
grant select on public.program_subject_weights to authenticated;
grant insert, update, delete on public.program_subject_weights to authenticated;

drop policy if exists "institutions_public_read_active" on public.institutions;
create policy "institutions_public_read_active"
on public.institutions
for select
to anon, authenticated
using (is_active is true or public.is_admin());

drop policy if exists "institutions_admin_all" on public.institutions;
create policy "institutions_admin_all"
on public.institutions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "programs_public_read_active_institutions" on public.programs;
create policy "programs_public_read_active_institutions"
on public.programs
for select
to anon, authenticated
using (
  is_active is true
  or public.is_admin()
);

drop policy if exists "programs_admin_all" on public.programs;
create policy "programs_admin_all"
on public.programs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "program_subject_weights_admin_all" on public.program_subject_weights;
create policy "program_subject_weights_admin_all"
on public.program_subject_weights
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Quick checks after running:
-- select public.is_admin();
-- select id, name_he, name_ar, name_en, type, website, is_active from public.institutions order by name_he;
