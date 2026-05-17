-- ============================================================
-- Institution-major matching for i3dad / إعداد
-- ============================================================
-- This migration keeps the existing institutions table when present and
-- adds the many-to-many program link used by recommendations.

create extension if not exists pgcrypto;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name_ar text,
  name_he text not null,
  name_en text,
  type text not null default 'other'
    check (type in ('university', 'college', 'academic_college', 'engineering_college', 'education_college', 'open_university', 'practical_engineering', 'other')),
  city_ar text,
  city_he text,
  city_en text,
  region text,
  website_url text,
  website text,
  latitude numeric,
  longitude numeric,
  description_ar text,
  description_he text,
  description_en text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.majors (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  code text unique,
  name_ar text not null,
  name_he text,
  name_en text,
  category text,
  description_ar text,
  description_he text,
  description_en text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institution_programs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  major_id uuid references public.majors(id) on delete set null,
  major_key text,
  program_name_ar text not null,
  program_name_he text,
  program_name_en text,
  degree_type text not null default 'bachelor'
    check (degree_type in ('bachelor', 'practical_engineer', 'certificate', 'other')),
  study_duration text,
  language_of_study text,
  admission_requirements_ar text,
  admission_requirements_he text,
  admission_requirements_en text,
  program_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institution_programs_url_check
    check (program_url is null or program_url ~* '^https?://.+\..+'),
  constraint institution_programs_major_required
    check (major_id is not null or nullif(major_key, '') is not null)
);

create index if not exists idx_institution_programs_institution_id
  on public.institution_programs(institution_id);

create index if not exists idx_institution_programs_major_id
  on public.institution_programs(major_id);

create index if not exists idx_institution_programs_major_key
  on public.institution_programs(major_key);

create unique index if not exists idx_institution_programs_unique_active
  on public.institution_programs(
    institution_id,
    coalesce(major_id::text, major_key),
    degree_type,
    coalesce(nullif(lower(program_name_en), ''), nullif(lower(program_name_he), ''), lower(program_name_ar))
  )
  where is_active is true;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_institutions_updated_at on public.institutions;
create trigger set_institutions_updated_at
before update on public.institutions
for each row execute function public.set_updated_at();

drop trigger if exists set_majors_updated_at on public.majors;
create trigger set_majors_updated_at
before update on public.majors
for each row execute function public.set_updated_at();

drop trigger if exists set_institution_programs_updated_at on public.institution_programs;
create trigger set_institution_programs_updated_at
before update on public.institution_programs
for each row execute function public.set_updated_at();

alter table public.institutions enable row level security;
alter table public.majors enable row level security;
alter table public.institution_programs enable row level security;

grant select on public.institutions to anon, authenticated;
grant select on public.majors to anon, authenticated;
grant select on public.institution_programs to anon, authenticated;
grant insert, update, delete on public.institutions to authenticated;
grant insert, update, delete on public.majors to authenticated;
grant insert, update, delete on public.institution_programs to authenticated;

drop policy if exists "institutions_read_active" on public.institutions;
create policy "institutions_read_active"
on public.institutions
for select
to anon, authenticated
using (is_active is true or public.is_admin());

drop policy if exists "majors_read_active" on public.majors;
create policy "majors_read_active"
on public.majors
for select
to anon, authenticated
using (is_active is true or public.is_admin());

drop policy if exists "institution_programs_read_active" on public.institution_programs;
create policy "institution_programs_read_active"
on public.institution_programs
for select
to anon, authenticated
using (is_active is true or public.is_admin());

drop policy if exists "institutions_admin_write" on public.institutions;
create policy "institutions_admin_write"
on public.institutions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "majors_admin_write" on public.majors;
create policy "majors_admin_write"
on public.majors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "institution_programs_admin_write" on public.institution_programs;
create policy "institution_programs_admin_write"
on public.institution_programs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
