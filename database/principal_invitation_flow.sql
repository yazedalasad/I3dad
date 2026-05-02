-- ============================================================
-- Secure principal invitation + onboarding flow
-- ============================================================
-- Run in Supabase SQL Editor.

create table if not exists public.principal_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  phone text,
  school_id uuid references public.schools(id),
  school_name text,
  role text not null default 'principal' check (role in ('principal', 'school_admin')),
  preferred_language text not null default 'ar' check (preferred_language in ('ar', 'he')),
  invitation_token text unique not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  notes text
);

alter table public.principals
  add column if not exists email text,
  add column if not exists role text not null default 'principal';

alter table public.principals
  drop constraint if exists principals_role_check;

alter table public.principals
  add constraint principals_role_check
  check (role in ('principal', 'school_admin'));

create index if not exists idx_principal_invitations_email_school
  on public.principal_invitations (lower(email), school_id);

create index if not exists idx_principal_invitations_status
  on public.principal_invitations (status, expires_at);

create index if not exists idx_principal_invitations_token
  on public.principal_invitations (invitation_token);

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
set search_path = public
as $$
  select p.school_id
  from public.principals p
  where p.user_id = auth.uid()
    and p.is_active = true
  limit 1;
$$;

alter table public.principal_invitations enable row level security;
alter table public.principals enable row level security;
alter table public.students enable row level security;

grant select, insert, update, delete on public.principal_invitations to authenticated;
grant select, insert, update on public.principals to authenticated;
grant select on public.students to authenticated;

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

drop policy if exists "principals_admin_all" on public.principals;
create policy "principals_admin_all"
on public.principals
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'students'
      and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.students', policy_name);
  end loop;
end $$;

create policy "students_select_own_admin_or_principal_school"
on public.students
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or (
    school_id is not null
    and school_id = public.current_principal_school_id()
  )
);

do $$
begin
  if to_regclass('public.reports') is not null then
    execute 'alter table public.reports enable row level security';
    execute 'grant select on public.reports to authenticated';
    execute 'drop policy if exists "reports_select_admin_or_principal_school" on public.reports';
    execute '
      create policy "reports_select_admin_or_principal_school"
      on public.reports
      for select
      to authenticated
      using (
        public.is_admin()
        or (
          school_id is not null
          and school_id = public.current_principal_school_id()
        )
      )
    ';
  end if;
end $$;

-- Optional maintenance: expire old pending invitations.
update public.principal_invitations
set status = 'expired'
where status = 'pending'
  and expires_at < now();
