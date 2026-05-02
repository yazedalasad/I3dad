-- ============================================================
-- Seed current public.institutions table from data/majorCatalog.js
-- ============================================================
-- Matches current schema:
-- id, name_he, name_ar, name_en, type, website, is_active, created_at, updated_at
--
-- Run in Supabase SQL Editor after institutions_current_schema_policies.sql.

delete from public.institutions
where name_he = 'Unknown Institution'
  and name_ar is null
  and name_en is null;

insert into public.institutions (name_he, name_ar, name_en, type, website, is_active)
values
  ('אוניברסיטת בן-גוריון בנגב', 'جامعة بن غوريون في النقب', 'Ben-Gurion University of the Negev', 'university', 'https://www.bgu.ac.il', true),
  ('המכללה האקדמית להנדסה סמי שמעון', 'كلية سامي شمعون للهندسة', 'Sami Shamoon College of Engineering', 'engineering_college', 'https://www.sce.ac.il', true),
  ('המכללה האקדמית ספיר', 'كلية سابير الأكاديمية', 'Sapir Academic College', 'academic_college', 'https://www.sapir.ac.il', true),
  ('המכללה האקדמית לחינוך ע"ש קיי', 'كلية كي للتربية', 'Kaye Academic College of Education', 'education_college', 'https://kaye.ac.il', true),
  ('המכללה האקדמית אחוה', 'كلية أخفا الأكاديمية', 'Achva Academic College', 'education_college', 'https://new.achva.ac.il', true),
  ('האוניברסיטה הפתוחה', 'الجامعة المفتوحة في إسرائيل', 'The Open University of Israel', 'open_university', 'https://www.openu.ac.il', true),
  ('האוניברסיטה העברית בירושלים', 'الجامعة العبرية في القدس', 'Hebrew University of Jerusalem', 'university', 'https://new.huji.ac.il', true),
  ('אוניברסיטת תל אביב', 'جامعة تل أبيب', 'Tel Aviv University', 'university', 'https://www.tau.ac.il', true),
  ('הטכניון - מכון טכנולוגי לישראל', 'التخنيون - المعهد الإسرائيلي للتكنولوجيا', 'Technion - Israel Institute of Technology', 'university', 'https://www.technion.ac.il', true),
  ('אוניברסיטת בר-אילן', 'جامعة بار إيلان', 'Bar-Ilan University', 'university', 'https://www.biu.ac.il', true),
  ('אוניברסיטת חיפה', 'جامعة حيفا', 'University of Haifa', 'university', 'https://www.haifa.ac.il', true),
  ('אוניברסיטת אריאל', 'جامعة أريئيل', 'Ariel University', 'university', 'https://www.ariel.ac.il', true),
  ('אוניברסיטת רייכמן', 'جامعة رايخمان', 'Reichman University', 'university', 'https://www.runi.ac.il', true),
  ('המכון הטכנולוגי חולון', 'معهد حولون للتكنولوجيا', 'Holon Institute of Technology', 'engineering_college', 'https://www.hit.ac.il', true),
  ('המכללה האקדמית להנדסה אפקה', 'كلية أفيكا للهندسة', 'Afeka Academic College of Engineering', 'engineering_college', 'https://www.afeka.ac.il', true)
on conflict (name_he) do update
set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  type = excluded.type,
  website = excluded.website,
  is_active = excluded.is_active,
  updated_at = now();

select id, name_he, name_ar, name_en, type, website, is_active
from public.institutions
order by name_he;
