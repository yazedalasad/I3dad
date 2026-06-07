-- Prevent duplicate student identity numbers during public signup.
-- Exposes a safe RPC for anon/authenticated clients to check availability.

create unique index if not exists students_student_id_unique_idx
  on public.students (student_id)
  where student_id is not null and btrim(student_id) <> '';

create or replace function public.is_student_id_taken(p_student_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_id text;
begin
  normalized_id := regexp_replace(coalesce(p_student_id, ''), '\D', '', 'g');
  if char_length(normalized_id) <> 9 then
    return false;
  end if;

  return exists (
    select 1
    from public.students s
    where s.student_id = normalized_id
  );
end;
$$;

revoke all on function public.is_student_id_taken(text) from public;
grant execute on function public.is_student_id_taken(text) to anon, authenticated;
