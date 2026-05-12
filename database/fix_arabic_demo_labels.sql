-- Fix Arabic/Hebrew labels that were inserted with broken encoding in demo data.
-- Safe to run more than once.

update public.schools
set name_he = 'בית הספר התיכון לקיה',
    city_ar = 'اللقية',
    city_he = 'לקיה',
    region = 'النقب',
    is_active = true,
    updated_at = now()
where name_ar = 'مدرسة اللقية الثانوية';

update public.schools
set is_active = false,
    updated_at = now()
where name_ar = 'Ù…Ø¯Ø±Ø³Ø© Ø§Ù„Ù„Ù‚ÙŠØ© Ø§Ù„Ø«Ø§Ù†ÙˆÙŠØ©'
   or city_ar = 'Ø§Ù„Ù„Ù‚ÙŠØ©';

update public.subjects
set name_ar = fixed.name_ar,
    name_he = fixed.name_he,
    name_en = fixed.name_en,
    updated_at = now()
from (
  values
    ('physics', 'فيزياء', 'פיזיקה', 'Physics'),
    ('math', 'رياضيات', 'מתמטיקה', 'Math'),
    ('biology', 'أحياء', 'ביולוגיה', 'Biology'),
    ('chemistry', 'كيمياء', 'כימיה', 'Chemistry'),
    ('arabic', 'لغة عربية', 'ערבית', 'Arabic'),
    ('hebrew', 'لغة عبرية', 'עברית', 'Hebrew'),
    ('computer_science', 'علوم الحاسوب', 'מדעי המחשב', 'Computer Science'),
    ('literature', 'أدب', 'ספרות', 'Literature')
) as fixed(code, name_ar, name_he, name_en)
where public.subjects.code = fixed.code;

update public.degrees
set name_ar = fixed.name_ar,
    name_he = fixed.name_he,
    name_en = fixed.name_en
from (
  values
    ('medicine', 'طب', 'רפואה', 'Medicine'),
    ('medical_laboratory_science', 'مختبرات طبية', 'מדעי המעבדה הרפואית', 'Medical Laboratory Science'),
    ('arabic_language', 'لغة عربية', 'ערבית', 'Arabic Language'),
    ('translation', 'ترجمة', 'תרגום', 'Translation'),
    ('EE_BSC', 'الهندسة الكهربائية (بكالوريوس)', 'הנדסת חשמל (B.Sc.)', 'B.Sc. Electrical Engineering'),
    ('CS_BSC', 'علوم الحاسوب (بكالوريوس)', 'מדעי המחשב (B.Sc.)', 'B.Sc. Computer Science'),
    ('CE_BSC', 'الهندسة المدنية (بكالوريوس)', 'הנדסה אזרחית (B.Sc.)', 'B.Sc. Civil Engineering'),
    ('NURS_BN', 'تمريض (بكالوريوس)', 'סיעוד (B.N.)', 'B.N. Nursing'),
    ('ARCH_BARCH', 'هندسة معمارية (بكالوريوس)', 'אדריכלות (B.Arch.)', 'B.Arch. Architecture'),
    ('ME_BSC', 'الهندسة الميكانيكية (بكالوريوس)', 'הנדסת מכונות (B.Sc.)', 'B.Sc. Mechanical Engineering'),
    ('DATA_BSC', 'علوم البيانات (بكالوريوس)', 'מדעי הנתונים (B.Sc.)', 'B.Sc. Data Science'),
    ('EDU_BED', 'تربية (بكالوريوس)', 'חינוך (B.Ed.)', 'B.Ed. Education'),
    ('PHYS_BSC', 'فيزياء (بكالوريوس)', 'פיזיקה (B.Sc.)', 'B.Sc. Physics'),
    ('BIOTECH_BSC', 'تكنولوجيا حيوية (بكالوريوس)', 'ביוטכנולוגיה (B.Sc.)', 'B.Sc. Biotechnology'),
    ('LAW_LLB', 'قانون (بكالوريوس)', 'משפטים (LL.B.)', 'LL.B. Law'),
    ('COM_BA', 'اتصال (بكالوريوس)', 'תקשורת (B.A.)', 'B.A. Communication')
) as fixed(code, name_ar, name_he, name_en)
where public.degrees.code = fixed.code;

update public.students
set first_name = fixed.first_name,
    last_name = fixed.last_name,
    full_name = fixed.first_name || ' ' || fixed.last_name,
    school_name = 'مدرسة اللقية الثانوية',
    updated_at = now()
from (
  values
    ('40000000-0000-0000-0000-000000000001'::uuid, 'ياسر', 'الصانع'),
    ('40000000-0000-0000-0000-000000000002'::uuid, 'سارة', 'الأسد'),
    ('40000000-0000-0000-0000-000000000003'::uuid, 'محمد', 'أبو بدر'),
    ('40000000-0000-0000-0000-000000000004'::uuid, 'ريم', 'الصانع'),
    ('40000000-0000-0000-0000-000000000005'::uuid, 'أحمد', 'الأسد'),
    ('40000000-0000-0000-0000-000000000006'::uuid, 'نور', 'أبو بدر')
) as fixed(id, first_name, last_name)
where public.students.id = fixed.id;

update public.user_profiles
set full_name = fixed.full_name,
    display_name = fixed.full_name,
    updated_at = now()
from (
  values
    ('50000000-0000-0000-0000-000000000001'::uuid, 'ياسر الصانع'),
    ('50000000-0000-0000-0000-000000000002'::uuid, 'سارة الأسد'),
    ('50000000-0000-0000-0000-000000000003'::uuid, 'محمد أبو بدر'),
    ('50000000-0000-0000-0000-000000000004'::uuid, 'ريم الصانع'),
    ('50000000-0000-0000-0000-000000000005'::uuid, 'أحمد الأسد'),
    ('50000000-0000-0000-0000-000000000006'::uuid, 'نور أبو بدر')
) as fixed(user_id, full_name)
where public.user_profiles.user_id = fixed.user_id;

select code, name_ar
from public.degrees
where code in ('medicine', 'medical_laboratory_science', 'arabic_language', 'translation', 'EE_BSC', 'CS_BSC', 'CE_BSC', 'NURS_BN', 'COM_BA', 'LAW_LLB', 'EDU_BED')
order by code;
