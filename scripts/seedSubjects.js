/**
 * SEED SUBJECTS - Simple ES Module
 */

import { supabase } from '../config/supabase.js';

console.log('✅ Using Supabase:', process.env.SUPABASE_URL || 'Environment variable not set');
console.log('🌱 Seeding subjects...');

const subjects = [
  { name_en: 'Technology', name_ar: 'تكنولوجي', name_he: 'טכנולוגי', code: 'TECH', point_level: 21, category: 'stem' },
  { name_en: 'Science', name_ar: 'علمي', name_he: 'מדעי', code: 'SCI', point_level: 17, category: 'stem' },
  { name_en: 'Social Sciences', name_ar: 'اجتماعية', name_he: 'חברתית', code: 'SOC', point_level: 9, category: 'humanities' },
  { name_en: 'Creative Arts', name_ar: 'إبداعي', name_he: 'יצירתי', code: 'ART', point_level: 12, category: 'humanities' },
  { name_en: 'Business', name_ar: 'تجاري', name_he: 'עסקי', code: 'BUS', point_level: 14, category: 'core' },
  { name_en: 'Practical Studies', name_ar: 'عملي', name_he: 'מעשי', code: 'PRAC', point_level: 7, category: 'core' }
];

try {
  // Clear existing
  console.log('🗑️  Clearing existing subjects...');
  await supabase.from('subjects').delete().neq('id', 0);
  
  // Insert new
  console.log(`\n📚 Inserting ${subjects.length} subjects...\n`);
  
  for (const subject of subjects) {
    const { error } = await supabase.from('subjects').insert(subject);
    if (error) {
      console.error(`❌ ${subject.name_en}: ${error.message}`);
    } else {
      console.log(`✅ ${subject.name_en} (${subject.code}) - ${subject.point_level} points`);
    }
  }
  
  console.log('\n🎉 Done!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
