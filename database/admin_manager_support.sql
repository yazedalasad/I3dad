-- ============================================================
-- I3dad / إعداد / איעדאד
-- Admin Manager Support SQL
--
-- انسخ هذا الملف وشغله في Supabase SQL Editor.
--
-- ماذا يجهز؟
-- 1) يجهز جدول طلبات/دعوات مديري المدارس principal_registration_requests.
-- 2) يضيف أعمدة ناقصة في principals بدون كسر البيانات.
-- 3) يضبط RLS لصفحة إدارة المدراء.
-- 4) ينشئ دالة SQL تربط مستخدم Auth موجود كمدير مدرسة عن طريق الإيميل.
--
-- مهم:
-- - إرسال دعوة إيميل حقيقية يحتاج Edge Function create-principal.
-- - هذا الملف يكفي إذا المستخدم موجود مسبقًا في Authentication وتريد ربطه كمدير.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Admin helper
-- ------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or exists (
      select 1
      from auth.users u
      where u.id = auth.uid()
        and lower(u.email) = lower('yazedassad@gmail.com')
    );
$$;

-- ثبت صلاحية الأدمن في metadata حتى لو user_profiles فيه دور قديم.
update auth.users
set
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
  updated_at = now()
where lower(email) = lower('yazedassad@gmail.com');

-- ------------------------------------------------------------
-- 2) Principals columns
-- ------------------------------------------------------------

alter table public.principals
  add column if not exists preferred_language text default 'ar',
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists last_sign_in_at timestamptz;

-- ------------------------------------------------------------
-- 3) Principal registration / invite requests
-- ------------------------------------------------------------

create table if not exists public.principal_registration_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  school_name text not null,
  school_id uuid references public.schools(id) on delete set null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'invited', 'completed', 'cancelled', 'failed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_principal_requests_email
  on public.principal_registration_requests(lower(email));

create index if not exists idx_principal_requests_school
  on public.principal_registration_requests(school_id);

create index if not exists idx_principal_requests_status
  on public.principal_registration_requests(status);

-- ------------------------------------------------------------
-- 4) Audit table if missing
-- ------------------------------------------------------------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  page text,
  ip_address text,
  status text not null default 'success' check (status in ('success', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5) RLS
-- ------------------------------------------------------------

alter table public.principals enable row level security;
alter table public.schools enable row level security;
alter table public.principal_registration_requests enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "admin_manage_principals" on public.principals;
create policy "admin_manage_principals"
on public.principals
for all
to authenticated
using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

drop policy if exists "admin_manage_principal_requests" on public.principal_registration_requests;
create policy "admin_manage_principal_requests"
on public.principal_registration_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_read_schools_for_manager_form" on public.schools;
create policy "admin_read_schools_for_manager_form"
on public.schools
for select
to authenticated
using (true);

drop policy if exists "admin_manage_audit_logs_for_manager_form" on public.audit_logs;
create policy "admin_manage_audit_logs_for_manager_form"
on public.audit_logs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- 6) Link existing Auth user as school manager
-- ------------------------------------------------------------
-- الاستخدام:
--
-- select public.admin_link_existing_user_as_principal(
--   'manager@gmail.com',
--   'اسم المدير',
--   '0500000000',
--   'اسم المدرسة',
--   null
-- );
--
-- إذا عندك school_id حقيقي ضعه بدل null.
-- هذه الدالة لا تنشئ مستخدم Auth جديد، فقط تربط مستخدم موجود.

create or replace function public.admin_link_existing_user_as_principal(
  manager_email text,
  manager_full_name text default null,
  manager_phone text default null,
  manager_school_name text default 'Pending setup',
  manager_school_id uuid default null
)
returns table (
  principal_id uuid,
  principal_user_id uuid,
  principal_email text,
  linked boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user auth.users%rowtype;
  principal_row public.principals%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select *
  into target_user
  from auth.users
  where lower(email) = lower(manager_email)
  limit 1;

  if target_user.id is null then
    raise exception 'No auth user found for email %. Create the user in Authentication first, or use the Edge Function invite flow.', manager_email;
  end if;

  update auth.users
  set
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"principal"}'::jsonb,
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) ||
      jsonb_build_object(
        'role', 'principal',
        'full_name', coalesce(nullif(manager_full_name, ''), manager_email),
        'fullName', coalesce(nullif(manager_full_name, ''), manager_email),
        'phone', manager_phone,
        'school_name', coalesce(nullif(manager_school_name, ''), 'Pending setup'),
        'schoolName', coalesce(nullif(manager_school_name, ''), 'Pending setup'),
        'school_id', manager_school_id,
        'schoolId', manager_school_id
      ),
    updated_at = now()
  where id = target_user.id;

  insert into public.principals (
    user_id,
    full_name,
    school_name,
    phone,
    school_id,
    gmail,
    is_active,
    created_at,
    updated_at
  )
  values (
    target_user.id,
    coalesce(nullif(manager_full_name, ''), manager_email),
    coalesce(nullif(manager_school_name, ''), 'Pending setup'),
    manager_phone,
    manager_school_id,
    manager_email,
    true,
    now(),
    now()
  )
  on conflict (user_id)
  do update set
    full_name = excluded.full_name,
    school_name = excluded.school_name,
    phone = excluded.phone,
    school_id = excluded.school_id,
    gmail = excluded.gmail,
    is_active = true,
    updated_at = now()
  returning * into principal_row;

  insert into public.principal_registration_requests (
    full_name,
    email,
    phone,
    school_name,
    school_id,
    notes,
    status,
    created_by
  )
  values (
    coalesce(nullif(manager_full_name, ''), manager_email),
    manager_email,
    manager_phone,
    coalesce(nullif(manager_school_name, ''), 'Pending setup'),
    manager_school_id,
    'Linked from SQL admin_link_existing_user_as_principal',
    'completed',
    auth.uid()
  );

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'admin',
    'principal_linked_from_sql',
    'principals',
    principal_row.id::text,
    jsonb_build_object('email', manager_email, 'school_id', manager_school_id)
  );

  principal_id := principal_row.id;
  principal_user_id := principal_row.user_id;
  principal_email := manager_email;
  linked := true;
  return next;
end;
$$;

-- ------------------------------------------------------------
-- 7) Quick checks
-- ------------------------------------------------------------

select public.is_admin() as current_user_is_admin;

select
  id,
  full_name,
  gmail,
  school_name,
  school_id,
  is_active,
  created_at
from public.principals
order by created_at desc
limit 20;
