-- Add Amal multi-disciplinary school in Al-Sayed (Negev) for signup and principal linking.
insert into public.schools (name_ar, name_he, city_ar, city_he, region, school_type, is_active)
values (
  'المدرسة المتعددة المجالات عمَل السيّد',
  'רב תחומי עמל אלסייד',
  'السيّد',
  'אל סייד',
  'النقب',
  'high_school',
  true
)
on conflict (name_ar) do update set
  name_he = excluded.name_he,
  city_ar = excluded.city_ar,
  city_he = excluded.city_he,
  region = excluded.region,
  school_type = excluded.school_type,
  is_active = true,
  updated_at = now();

select id, name_ar, name_he, city_ar, city_he, region, is_active
from public.schools
where name_ar = 'المدرسة المتعددة المجالات عمَل السيّد';
