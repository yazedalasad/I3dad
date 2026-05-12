-- Fix identity numbers for seeded Laqiya demo students.
-- The first seed used values like LQ-1001 in students.student_id, while the
-- admin UI expects a 9 digit Israeli-style identity number.

update public.students
set
  student_id = demo.identity_number,
  identity_number = demo.identity_number,
  updated_at = now()
from (
  values
    ('40000000-0000-0000-0000-000000000001'::uuid, '326000001'),
    ('40000000-0000-0000-0000-000000000002'::uuid, '326000002'),
    ('40000000-0000-0000-0000-000000000003'::uuid, '326000003'),
    ('40000000-0000-0000-0000-000000000004'::uuid, '326000004'),
    ('40000000-0000-0000-0000-000000000005'::uuid, '326000005'),
    ('40000000-0000-0000-0000-000000000006'::uuid, '326000006')
) as demo(student_uuid, identity_number)
where students.id = demo.student_uuid
  and (
    students.identity_number is distinct from demo.identity_number
    or students.student_id is distinct from demo.identity_number
  );

select
  full_name,
  email,
  student_id,
  identity_number
from public.students
where id in (
  '40000000-0000-0000-0000-000000000001'::uuid,
  '40000000-0000-0000-0000-000000000002'::uuid,
  '40000000-0000-0000-0000-000000000003'::uuid,
  '40000000-0000-0000-0000-000000000004'::uuid,
  '40000000-0000-0000-0000-000000000005'::uuid,
  '40000000-0000-0000-0000-000000000006'::uuid
)
order by grade, full_name;
