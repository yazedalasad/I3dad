-- Allow the signup form to read active schools before the user has an account.
-- Run this in the Supabase SQL editor.

alter table public.schools enable row level security;

grant select on public.schools to anon, authenticated;

drop policy if exists "public_read_active_schools_for_signup" on public.schools;
create policy "public_read_active_schools_for_signup"
on public.schools
for select
to anon, authenticated
using (is_active = true);
