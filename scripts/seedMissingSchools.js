import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { israeliSchools } from '../data/israeliSchools.js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeArabicName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[ـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي');
}

function transliterateCityToHebrew(city) {
  const map = {
    'بئر السبع': 'באר שבע',
    'الرهط': 'רהט',
    'كسيفة': 'כסייפה',
    'حورة': 'חורה',
    'تل السبع': 'תל שבע',
    'عرعرة النقب': 'ערערה בנגב',
    'لقية': 'לקיה',
    'شقيب السلام': 'שגב שלום',
    'القصوم': 'אל קסום',
    'أبو قرينات': 'אבו קרינאת',
    'مولدة': 'מולדה',
    'أم بطين': 'אום בטין',
    'بير هداج': 'ביר הדאג׳',
    'ديمونا': 'דימונה',
    'عرعرة': 'ערערה',
    'أبو تلول': 'אבו תלול',
    'كحلة': 'כחלה',
    'وادي النعم': 'ואדי אל נעם',
  };

  return map[city] || city;
}

async function main() {
  const { data: existingRows, error: fetchError } = await supabase
    .from('schools')
    .select('name_ar')
    .order('name_ar');

  if (fetchError) {
    console.error('Failed to load existing schools:', fetchError.message);
    process.exit(1);
  }

  const existingNames = new Set(
    (existingRows || []).map((row) => normalizeArabicName(row.name_ar))
  );

  const missingSchools = israeliSchools.filter(
    (school) => !existingNames.has(normalizeArabicName(school.name))
  );

  if (!missingSchools.length) {
    console.log('No missing schools to insert.');
    return;
  }

  const payload = missingSchools.map((school) => ({
    name_ar: school.name,
    name_he: school.name,
    city_ar: school.city,
    city_he: transliterateCityToHebrew(school.city),
    school_type: school.type === 'ثانوية' ? 'high_school' : 'other',
    is_active: true,
  }));

  const { data: insertedRows, error: insertError } = await supabase
    .from('schools')
    .insert(payload)
    .select('id, name_ar');

  if (insertError) {
    console.error('Failed to insert missing schools:', insertError.message);
    process.exit(1);
  }

  console.log(`Inserted ${insertedRows?.length || 0} missing schools:`);
  for (const school of insertedRows || []) {
    console.log(`- ${school.name_ar}`);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error.message || error);
  process.exit(1);
});
