/**
 * SEED SUBJECTS - Populate subjects table
 * 
 * Run this FIRST before generating questions
 * Populates the 10 Israeli Bagrut subjects
 */

import { supabase } from '../config/supabase.js';

const subjects = [
  // CORE SUBJECTS (Required for ALL degrees)
  {
    name_en: 'Mathematics',
    name_ar: 'رياضيات',
    name_he: 'מתמטיקה',
    code: 'MATH',
    point_level: 5,
    category: 'core',
    description_en: 'Essential for all sciences, engineering, business, and economics',
    description_ar: 'أساسي لجميع العلوم والهندسة والأعمال والاقتصاد',
    description_he: 'חיוני לכל המדעים, הנדסה, עסקים וכלכלה'
  },
  {
    name_en: 'English',
    name_ar: 'إنجليزية',
    name_he: 'אנגלית',
    code: 'ENG',
    point_level: 5,
    category: 'core',
    description_en: 'Required for ALL university degrees',
    description_ar: 'مطلوب لجميع الدرجات الجامعية',
    description_he: 'נדרש לכל התארים האוניברסיטאיים'
  },
  {
    name_en: 'Hebrew/Literacy',
    name_ar: 'عبرية/محو الأمية',
    name_he: 'הבעה עברית',
    code: 'HEB',
    point_level: 2,
    category: 'core',
    description_en: 'Hebrew grammar, writing, and comprehension',
    description_ar: 'قواعد اللغة العبرية والكتابة والفهم',
    description_he: 'דקדוק עברי, כתיבה והבנת הנקרא'
  },
  
  // HUMANITIES
  {
    name_en: 'History',
    name_ar: 'تاريخ',
    name_he: 'היסטוריה',
    code: 'HIST',
    point_level: 2,
    category: 'humanities',
    description_en: 'Required for Bagrut certificate',
    description_ar: 'مطلوب لشهادة البجروت',
    description_he: 'נדרש לתעודת בגרות'
  },
  {
    name_en: 'Literature',
    name_ar: 'أدب',
    name_he: 'ספרות',
    code: 'LIT',
    point_level: 2,
    category: 'humanities',
    description_en: 'Literary analysis and comprehension',
    description_ar: 'التحليل الأدبي والفهم',
    description_he: 'ניתוח ספרותי והבנה'
  },
  {
    name_en: 'Citizenship',
    name_ar: 'مواطنة',
    name_he: 'אזרחות',
    code: 'CIV',
    point_level: 2,
    category: 'humanities',
    description_en: 'Civics and government studies',
    description_ar: 'دراسات المدنية والحكومة',
    description_he: 'לימודי אזרחות וממשל'
  },
  
  // STEM SUBJECTS
  {
    name_en: 'Physics',
    name_ar: 'فيزياء',
    name_he: 'פיזיקה',
    code: 'PHYS',
    point_level: 5,
    category: 'stem',
    description_en: 'For science and engineering degrees',
    description_ar: 'للحصول على درجات علمية وهندسية',
    description_he: 'לתארים במדעים והנדסה'
  },
  {
    name_en: 'Chemistry',
    name_ar: 'كيمياء',
    name_he: 'כימיה',
    code: 'CHEM',
    point_level: 5,
    category: 'stem',
    description_en: 'For science and medical degrees',
    description_ar: 'للحصول على درجات علمية وطبية',
    description_he: 'לתארים במדעים ורפואה'
  },
  {
    name_en: 'Biology',
    name_ar: 'أحياء',
    name_he: 'ביולוגיה',
    code: 'BIO',
    point_level: 5,
    category: 'stem',
    description_en: 'For medical and biology degrees',
    description_ar: 'للحصول على درجات طبية وبيولوجية',
    description_he: 'לתארים ברפואה וביולוגיה'
  },
  {
    name_en: 'Computer Science',
    name_ar: 'علوم الحاسوب',
    name_he: 'מדעי המחשב',
    code: 'CS',
    point_level: 5,
    category: 'stem',
    description_en: 'For CS and technology degrees',
    description_ar: 'للحصول على درجات في علوم الحاسوب والتكنولوجيا',
    description_he: 'לתארים במדעי המחשב וטכנולוגיה'
  }
];

async function seedSubjects() {
  console.log('🌱 Seeding subjects...\n');

  try {
    // Check if subjects already exist
    const { data: existing, error: checkError } = await supabase
      .from('subjects')
      .select('code');

    if (checkError) {
      console.error('❌ Error checking existing subjects:', checkError.message);
      return;
    }

    if (existing && existing.length > 0) {
      console.log(`⚠️  Found ${existing.length} existing subjects`);
      console.log('   Skipping seed to avoid duplicates');
      console.log('   To re-seed, delete existing subjects first\n');
      return;
    }

    // Insert subjects
    console.log(`📚 Inserting ${subjects.length} subjects...\n`);

    for (const subject of subjects) {
      const { error } = await supabase
        .from('subjects')
        .insert(subject);

      if (error) {
        console.error(`❌ Error inserting ${subject.name_en}:`, error.message);
      } else {
        console.log(`✅ ${subject.name_en} (${subject.code}) - ${subject.category}`);
      }
    }

    console.log('\n🎉 Subjects seeded successfully!');
    console.log('\nNext steps:');
    console.log('1. Add psychometric exam PDFs to ./psychometric_exams folder');
    console.log('2. Set DEEPSEEK_API_KEY in .env file');
    console.log('3. Run: npm run generate-questions\n');

  } catch (error) {
    console.error('❌ Error seeding subjects:', error.message);
  }
}

// Run if called directly
seedSubjects()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export default seedSubjects;
