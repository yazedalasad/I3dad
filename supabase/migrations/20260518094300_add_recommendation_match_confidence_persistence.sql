alter table public.student_recommendations
  add column if not exists match_score numeric,
  add column if not exists confidence_score numeric,
  add column if not exists explanation text,
  add column if not exists data_sources_used jsonb not null default '[]'::jsonb,
  add column if not exists recommended_major_id uuid references public.majors(id) on delete set null,
  add column if not exists recommended_major_key text;

alter table public.student_recommendations enable row level security;

grant select, insert, update, delete on public.student_recommendations to authenticated;

drop policy if exists "students_insert_own_recommendations" on public.student_recommendations;
create policy "students_insert_own_recommendations"
on public.student_recommendations
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1 from public.students s
    where s.id = student_recommendations.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_update_own_recommendations" on public.student_recommendations;
create policy "students_update_own_recommendations"
on public.student_recommendations
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.students s
    where s.id = student_recommendations.student_id
      and s.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.students s
    where s.id = student_recommendations.student_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "students_delete_own_recommendations" on public.student_recommendations;
create policy "students_delete_own_recommendations"
on public.student_recommendations
for delete
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.students s
    where s.id = student_recommendations.student_id
      and s.user_id = auth.uid()
  )
);

create index if not exists idx_student_recommendations_student_rank
  on public.student_recommendations(student_id, rank);
create index if not exists idx_student_recommendations_major_key
  on public.student_recommendations(recommended_major_key);
