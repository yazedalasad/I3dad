-- ============================================================
-- قصص النجاح / success_stories
-- يطابق شاشة: screens/SuccessStories/SuccessStoriesScreen.js
-- شغّل في Supabase SQL Editor (آمن للتشغيل أكثر من مرة).
-- ============================================================

create table if not exists public.success_stories (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  graduation_year integer,
  degree text,
  university text,
  field text,
  current_job text,
  story text,
  degree_ar text,
  degree_he text,
  university_ar text,
  university_he text,
  field_ar text,
  field_he text,
  current_job_ar text,
  current_job_he text,
  story_ar text,
  story_he text,
  video_url text,
  submitted_by_user_id uuid references auth.users(id) on delete set null,
  is_featured boolean not null default false,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.success_stories add column if not exists graduation_year integer;
alter table public.success_stories add column if not exists degree_ar text;
alter table public.success_stories add column if not exists degree_he text;
alter table public.success_stories add column if not exists university_ar text;
alter table public.success_stories add column if not exists university_he text;
alter table public.success_stories add column if not exists field_ar text;
alter table public.success_stories add column if not exists field_he text;
alter table public.success_stories add column if not exists current_job_ar text;
alter table public.success_stories add column if not exists current_job_he text;
alter table public.success_stories add column if not exists story_ar text;
alter table public.success_stories add column if not exists story_he text;
alter table public.success_stories add column if not exists video_url text;
alter table public.success_stories add column if not exists submitted_by_user_id uuid;

create index if not exists idx_success_stories_approved_created
  on public.success_stories (is_approved, created_at desc);

create index if not exists idx_success_stories_featured
  on public.success_stories (is_featured)
  where is_featured = true and is_approved = true;

create or replace function public.touch_success_stories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_success_stories_updated_at on public.success_stories;
create trigger trg_success_stories_updated_at
before update on public.success_stories
for each row
execute function public.touch_success_stories_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.success_stories enable row level security;

grant select on public.success_stories to anon, authenticated;
grant insert, update, delete on public.success_stories to authenticated;

drop policy if exists "success_stories_public_read_approved" on public.success_stories;
create policy "success_stories_public_read_approved"
on public.success_stories
for select
to anon, authenticated
using (is_approved = true);

drop policy if exists "success_stories_authenticated_insert_pending" on public.success_stories;
create policy "success_stories_authenticated_insert_pending"
on public.success_stories
for insert
to authenticated
with check (
  is_approved = false
  and coalesce(submitted_by_user_id, auth.uid()) = auth.uid()
);

drop policy if exists "success_stories_owner_read_own_pending" on public.success_stories;
create policy "success_stories_owner_read_own_pending"
on public.success_stories
for select
to authenticated
using (submitted_by_user_id = auth.uid());

drop policy if exists "success_stories_admin_all" on public.success_stories;
create policy "success_stories_admin_all"
on public.success_stories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- فحص سريع
-- ------------------------------------------------------------
-- select id, full_name, is_approved, is_featured, created_at
-- from public.success_stories
-- order by created_at desc;
