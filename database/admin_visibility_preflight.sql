-- Run this first if an admin view fails because a students column is missing.
-- Current schema uses students.student_id as the 9-digit identity number.

alter table public.students
  add column if not exists class_section text;

update public.students
set class_section = 'alef'
where class_section is null or btrim(class_section) = '';

alter table public.students
  alter column class_section set default 'alef';

alter table public.students
  alter column class_section set not null;

alter table public.students
  add column if not exists preferred_language text default 'ar';

alter table public.students
  add column if not exists is_active boolean not null default true;

alter table public.students
  add column if not exists last_sign_in_at timestamptz;

alter table public.students
  drop constraint if exists students_class_section_check;

alter table public.students
  add constraint students_class_section_check
  check (class_section in ('alef', 'bet', 'gimel', 'dalet'));

alter table public.students
  drop constraint if exists students_student_id_9_digits_check;

-- Do not add a hard 9-digit constraint here yet. Some existing rows still have
-- old UUID-like student_id values, and a constraint would block editing grade or
-- class_section on those rows. Clean the data first, then add/validate the
-- constraint manually if needed.
