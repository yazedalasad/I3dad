-- ============================================================
-- Secure principal invitation + first-time registration flow
-- ============================================================
-- Run in Supabase SQL Editor after deploying the Edge Functions:
-- create-principal-invitation, validate-principal-invitation,
-- accept-principal-invitation.

create extension if not exists pgcrypto;

create table if not exists public.principal_invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  invited_email text not null,
  invited_name text,
  invited_phone text,
  preferred_language text not null default 'ar' check (preferred_language in ('ar', 'he', 'en')),
  role text not null default 'principal' check (role = 'principal'),
  invite_token text unique not null,
  invitation_code text not null,
  status text not null default 'pending' check (status in ('pending', 'used', 'expired')),
  expires_at timestamptz not null,
  used_at timestamptz,
  principal_user_id uuid references auth.users(id) on delete set null,
  created_by_admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  notes text,
  school_name text
);

-- Upgrade older deployments that used email/full_name/token/accepted names.
alter table public.principal_invitations add column if not exists school_id uuid references public.schools(id) on delete restrict;
alter table public.principal_invitations add column if not exists invited_email text;
alter table public.principal_invitations add column if not exists invited_name text;
alter table public.principal_invitations add column if not exists invited_phone text;
alter table public.principal_invitations add column if not exists preferred_language text default 'ar';
alter table public.principal_invitations add column if not exists role text default 'principal';
alter table public.principal_invitations add column if not exists invite_token text;
alter table public.principal_invitations add column if not exists invitation_code text;
alter table public.principal_invitations add column if not exists status text default 'pending';
alter table public.principal_invitations add column if not exists expires_at timestamptz;
alter table public.principal_invitations add column if not exists used_at timestamptz;
alter table public.principal_invitations add column if not exists principal_user_id uuid references auth.users(id) on delete set null;
alter table public.principal_invitations add column if not exists created_by_admin_id uuid references auth.users(id) on delete set null;
alter table public.principal_invitations add column if not exists created_at timestamptz default now();
alter table public.principal_invitations add column if not exists notes text;
alter table public.principal_invitations add column if not exists school_name text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'principal_invitations' and column_name = 'email'
  ) then
    update public.principal_invitations set invited_email = coalesce(invited_email, email);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'principal_invitations' and column_name = 'full_name'
  ) then
    update public.principal_invitations set invited_name = coalesce(invited_name, full_name);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'principal_invitations' and column_name = 'phone'
  ) then
    update public.principal_invitations set invited_phone = coalesce(invited_phone, phone);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'principal_invitations' and column_name = 'invitation_token'
  ) then
    update public.principal_invitations set invite_token = coalesce(invite_token, invitation_token);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'principal_invitations' and column_name = 'accepted_at'
  ) then
    update public.principal_invitations
    set used_at = coalesce(used_at, accepted_at),
        status = case when status = 'accepted' then 'used' else status end;
  end if;
end $$;

update public.principal_invitations
set invitation_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
where invitation_code is null or btrim(invitation_code) = '';

update public.principal_invitations
set expires_at = now() + interval '7 days'
where expires_at is null;

update public.principal_invitations
set role = 'principal'
where role is null or role <> 'principal';

update public.principal_invitations
set status = 'expired'
where status = 'revoked';

alter table public.principal_invitations
  alter column school_id set not null,
  alter column invited_email set not null,
  alter column preferred_language set not null,
  alter column role set not null,
  alter column invite_token set not null,
  alter column invitation_code set not null,
  alter column status set not null,
  alter column expires_at set not null,
  alter column created_at set not null;

alter table public.principal_invitations
  drop constraint if exists principal_invitations_preferred_language_check,
  add constraint principal_invitations_preferred_language_check check (preferred_language in ('ar', 'he', 'en'));

alter table public.principal_invitations
  drop constraint if exists principal_invitations_role_check,
  add constraint principal_invitations_role_check check (role = 'principal');

alter table public.principal_invitations
  drop constraint if exists principal_invitations_status_check,
  add constraint principal_invitations_status_check check (status in ('pending', 'used', 'expired'));

alter table public.principals
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists school_id uuid references public.schools(id) on delete restrict,
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists gmail text,
  add column if not exists phone text,
  add column if not exists preferred_language text default 'ar',
  add column if not exists role text not null default 'principal',
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.principals
  drop constraint if exists principals_role_check,
  add constraint principals_role_check check (role = 'principal');

alter table public.principals
  drop constraint if exists principals_preferred_language_check,
  add constraint principals_preferred_language_check check (preferred_language in ('ar', 'he', 'en'));

create unique index if not exists idx_principals_user_id_unique on public.principals(user_id);
create unique index if not exists idx_principal_invitations_token_unique on public.principal_invitations(invite_token);
create index if not exists idx_principal_invitations_email_school on public.principal_invitations (lower(invited_email), school_id);
create index if not exists idx_principal_invitations_status on public.principal_invitations (status, expires_at);
create index if not exists idx_principals_school_user on public.principals(school_id, user_id);

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
    (select up.role::text from public.user_profiles up where up.user_id = auth.uid() limit 1),
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
set search_path = public
as $$
  select p.school_id
  from public.principals p
  where p.user_id = auth.uid()
    and p.role = 'principal'
    and p.is_active = true
  limit 1;
$$;

create or replace function public.guard_principal_restricted_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.user_id is distinct from old.user_id
    or new.school_id is distinct from old.school_id
    or new.school_name is distinct from old.school_name
    or new.role is distinct from old.role
    or new.is_active is distinct from old.is_active
    or new.email is distinct from old.email
    or new.gmail is distinct from old.gmail then
    raise exception 'principals can only update full_name, phone, and preferred_language';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_principal_restricted_columns on public.principals;
create trigger trg_guard_principal_restricted_columns
before update on public.principals
for each row
execute function public.guard_principal_restricted_columns();

alter table public.principal_invitations enable row level security;
alter table public.principals enable row level security;
alter table public.schools enable row level security;
alter table public.students enable row level security;

grant select, insert, update, delete on public.principal_invitations to authenticated;
grant select, insert, update on public.principals to authenticated;
grant select on public.schools to authenticated;
grant select on public.students to authenticated;

drop policy if exists "admin_all_principal_invitations" on public.principal_invitations;
create policy "admin_all_principal_invitations"
on public.principal_invitations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "principals_read_own_row" on public.principals;
create policy "principals_read_own_row"
on public.principals
for select
to authenticated
using (public.is_admin() or user_id = auth.uid());

drop policy if exists "principals_update_own_basic_profile" on public.principals;
create policy "principals_update_own_basic_profile"
on public.principals
for update
to authenticated
using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

drop policy if exists "principals_admin_insert" on public.principals;
create policy "principals_admin_insert"
on public.principals
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "schools_select_admin_principal_or_student" on public.schools;
create policy "schools_select_admin_principal_or_student"
on public.schools
for select
to authenticated
using (
  public.is_admin()
  or id = public.current_principal_school_id()
  or exists (
    select 1 from public.students s
    where s.user_id = auth.uid()
      and s.school_id = schools.id
  )
);

drop policy if exists "students_select_own_admin_or_principal_school" on public.students;
create policy "students_select_own_admin_or_principal_school"
on public.students
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or (school_id is not null and school_id = public.current_principal_school_id())
);

drop policy if exists "students_update_own_or_admin" on public.students;
create policy "students_update_own_or_admin"
on public.students
for update
to authenticated
using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'test_sessions',
    'student_responses',
    'student_abilities',
    'student_interests',
    'student_recommendations',
    'personality_test_sessions',
    'personality_test_responses',
    'personality_results'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('grant select on public.%I to authenticated', table_name);
    end if;
  end loop;
end $$;

drop policy if exists "test_sessions_select_admin_student_or_principal_school" on public.test_sessions;
create policy "test_sessions_select_admin_student_or_principal_school"
on public.test_sessions
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.students s
    where s.id = test_sessions.student_id
      and (s.user_id = auth.uid() or s.school_id = public.current_principal_school_id())
  )
);

drop policy if exists "student_abilities_select_admin_student_or_principal_school" on public.student_abilities;
create policy "student_abilities_select_admin_student_or_principal_school"
on public.student_abilities
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.students s
    where s.id = student_abilities.student_id
      and (s.user_id = auth.uid() or s.school_id = public.current_principal_school_id())
  )
);

drop policy if exists "student_interests_select_admin_student_or_principal_school" on public.student_interests;
create policy "student_interests_select_admin_student_or_principal_school"
on public.student_interests
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.students s
    where s.id = student_interests.student_id
      and (s.user_id = auth.uid() or s.school_id = public.current_principal_school_id())
  )
);

update public.principal_invitations
set status = 'expired'
where status = 'pending'
  and expires_at < now();
