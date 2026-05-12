-- Adds bachelor paths that are meaningfully supported by strong Arabic language signals.
-- Safe to run more than once.

create extension if not exists pgcrypto;

do $$
declare
  arabic_id uuid;
  hebrew_id uuid;
  literature_id uuid;
begin
  insert into public.subjects (id, code, name_ar, name_he, name_en, point_level, category, is_active)
  values
    ('20000000-0000-0000-0000-000000000005', 'arabic', 'لغة عربية', 'ערבית', 'Arabic', 5, 'humanities', true),
    ('20000000-0000-0000-0000-000000000006', 'hebrew', 'لغة عبرية', 'עברית', 'Hebrew', 5, 'humanities', true),
    ('20000000-0000-0000-0000-000000000008', 'literature', 'أدب', 'ספרות', 'Literature', 5, 'humanities', true)
  on conflict (code) do update set
    name_ar = excluded.name_ar,
    name_he = excluded.name_he,
    name_en = excluded.name_en,
    is_active = true,
    updated_at = now();

  select id into arabic_id from public.subjects where code = 'arabic';
  select id into hebrew_id from public.subjects where code = 'hebrew';
  select id into literature_id from public.subjects where code = 'literature';

  insert into public.degrees
    (id, code, name_en, name_ar, name_he, category, is_active, created_at, weight_profile_id)
  values
    ('31000000-0000-0000-0000-000000000001', 'LIT_BA', 'B.A. Literature', 'أدب (بكالوريوس)', 'ספרות (B.A.)', 'bachelor', true, now(), 'e97f670e-5e16-4e51-9fbe-7d0be9be3728'),
    ('31000000-0000-0000-0000-000000000002', 'LING_BA', 'B.A. Linguistics', 'لسانيات (بكالوريوس)', 'בלשנות (B.A.)', 'bachelor', true, now(), 'e97f670e-5e16-4e51-9fbe-7d0be9be3728'),
    ('31000000-0000-0000-0000-000000000003', 'JOUR_BA', 'B.A. Journalism', 'صحافة (بكالوريوس)', 'עיתונאות (B.A.)', 'bachelor', true, now(), 'e97f670e-5e16-4e51-9fbe-7d0be9be3728'),
    ('31000000-0000-0000-0000-000000000004', 'CW_BA', 'B.A. Creative Writing', 'كتابة إبداعية (بكالوريوس)', 'כתיבה יוצרת (B.A.)', 'bachelor', true, now(), 'e97f670e-5e16-4e51-9fbe-7d0be9be3728'),
    ('31000000-0000-0000-0000-000000000005', 'LANG_BA', 'B.A. Language Studies', 'دراسات لغوية (بكالوريوس)', 'לימודי שפה (B.A.)', 'bachelor', true, now(), 'e97f670e-5e16-4e51-9fbe-7d0be9be3728'),
    ('31000000-0000-0000-0000-000000000006', 'ARABIC_EDU_BED', 'B.Ed. Arabic Education', 'تدريس اللغة العربية (بكالوريوس)', 'הוראת ערבית (B.Ed.)', 'bachelor', true, now(), 'd135d99a-fb7e-47b8-a30d-0c4ac6d71ff3'),
    ('31000000-0000-0000-0000-000000000007', 'MIDEAST_BA', 'B.A. Middle Eastern Studies', 'دراسات شرق أوسطية (بكالوريوس)', 'לימודי המזרח התיכון (B.A.)', 'bachelor', true, now(), 'e97f670e-5e16-4e51-9fbe-7d0be9be3728')
  on conflict (code) do update set
    name_en = excluded.name_en,
    name_ar = excluded.name_ar,
    name_he = excluded.name_he,
    category = excluded.category,
    is_active = true,
    weight_profile_id = excluded.weight_profile_id;

  delete from public.degree_subject_weights
  where degree_id in (
    select id
    from public.degrees
    where code in ('LIT_BA', 'LING_BA', 'JOUR_BA', 'CW_BA', 'LANG_BA', 'ARABIC_EDU_BED', 'MIDEAST_BA')
  );

  insert into public.degree_subject_weights (degree_id, subject_id, weight)
  select d.id, v.subject_id, v.weight
  from public.degrees d
  cross join lateral (
    values
      (arabic_id, 0.55),
      (literature_id, 0.30),
      (hebrew_id, 0.15)
  ) as v(subject_id, weight)
  where d.code in ('LIT_BA', 'CW_BA', 'ARABIC_EDU_BED')
    and v.subject_id is not null;

  insert into public.degree_subject_weights (degree_id, subject_id, weight)
  select d.id, v.subject_id, v.weight
  from public.degrees d
  cross join lateral (
    values
      (arabic_id, 0.50),
      (hebrew_id, 0.30),
      (literature_id, 0.20)
  ) as v(subject_id, weight)
  where d.code in ('LING_BA', 'LANG_BA', 'JOUR_BA', 'MIDEAST_BA')
    and v.subject_id is not null;
end $$;

select code, name_ar, name_he, category, is_active
from public.degrees
where code in ('arabic_language', 'translation', 'LIT_BA', 'LING_BA', 'JOUR_BA', 'CW_BA', 'LANG_BA', 'ARABIC_EDU_BED', 'MIDEAST_BA')
order by code;
