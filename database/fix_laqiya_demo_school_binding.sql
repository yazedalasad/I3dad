-- Fix Laqiya demo rows that were seeded under a mojibake/corrupted school name.
--
-- Run this once after the demo seed if the principal analytics shows only one
-- student. It moves the six demo students and their school-scoped rows to the
-- real Laqiya school that the principal is connected to.

do $$
declare
  target_school_id uuid;
  corrupted_school_id uuid;
  demo_student_ids uuid[] := array[
    '40000000-0000-0000-0000-000000000001'::uuid,
    '40000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000003'::uuid,
    '40000000-0000-0000-0000-000000000004'::uuid,
    '40000000-0000-0000-0000-000000000005'::uuid,
    '40000000-0000-0000-0000-000000000006'::uuid
  ];
  demo_user_ids uuid[] := array[
    '50000000-0000-0000-0000-000000000001'::uuid,
    '50000000-0000-0000-0000-000000000002'::uuid,
    '50000000-0000-0000-0000-000000000003'::uuid,
    '50000000-0000-0000-0000-000000000004'::uuid,
    '50000000-0000-0000-0000-000000000005'::uuid,
    '50000000-0000-0000-0000-000000000006'::uuid
  ];
begin
  select id
  into target_school_id
  from public.schools
  where name_ar = 'مدرسة اللقية الثانوية'
     or city_ar = 'اللقية'
  order by
    case when name_ar = 'مدرسة اللقية الثانوية' then 0 else 1 end,
    created_at
  limit 1;

  if target_school_id is null then
    select school_id
    into target_school_id
    from public.principals
    where school_name = 'مدرسة اللقية الثانوية'
       or full_name ilike '%محمود%'
    order by updated_at desc nulls last, created_at desc
    limit 1;
  end if;

  if target_school_id is null then
    insert into public.schools (name_ar, name_he, city_ar, city_he, region, school_type, is_active)
    values ('مدرسة اللقية الثانوية', 'בית הספר התיכון לקיה', 'اللقية', 'לקיה', 'النقب', 'high_school', true)
    returning id into target_school_id;
  else
    update public.schools
    set name_ar = 'مدرسة اللقية الثانوية',
        name_he = 'בית הספר התיכון לקיה',
        city_ar = 'اللقية',
        city_he = 'לקיה',
        region = 'النقب',
        school_type = 'high_school',
        is_active = true,
        updated_at = now()
    where id = target_school_id;
  end if;

  select id
  into corrupted_school_id
  from public.schools
  where name_ar = 'Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©'
  limit 1;

  update public.students
  set school_id = target_school_id,
      school_name = 'مدرسة اللقية الثانوية',
      preferred_language = coalesce(preferred_language, 'ar'),
      is_active = true,
      updated_at = now()
  where id = any(demo_student_ids)
     or user_id = any(demo_user_ids)
     or email like '%.demo@i3dad.test';

  update public.user_profiles
  set school_id = target_school_id,
      role = 'student'::app_role,
      preferred_language = coalesce(preferred_language, 'ar'),
      is_active = true,
      updated_at = now()
  where user_id = any(demo_user_ids);

  update public.test_sessions
  set school_id = target_school_id,
      updated_at = now()
  where student_id = any(demo_student_ids)
     or metadata->>'seed' = 'laqiya_demo';

  update public.principal_invitations
  set school_id = target_school_id,
      school_name = 'مدرسة اللقية الثانوية'
  where school_name in ('مدرسة اللقية الثانوية', 'Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©');

  if corrupted_school_id is not null and corrupted_school_id <> target_school_id then
    update public.principals
    set school_id = target_school_id,
        school_name = 'مدرسة اللقية الثانوية',
        updated_at = now()
    where school_id = corrupted_school_id
      and school_name = 'Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©';

    update public.schools
    set is_active = false,
        updated_at = now()
    where id = corrupted_school_id
      and not exists (select 1 from public.students where school_id = corrupted_school_id)
      and not exists (select 1 from public.principals where school_id = corrupted_school_id);
  end if;
end $$;

select
  sc.id as school_id,
  sc.name_ar,
  count(st.id) filter (where st.id::text like '40000000-0000-0000-0000-%') as demo_students,
  count(st.id) as total_students
from public.schools sc
left join public.students st on st.school_id = sc.id
where sc.name_ar = 'مدرسة اللقية الثانوية'
group by sc.id, sc.name_ar;
