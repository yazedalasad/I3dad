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

function uniqueByNormalizedName(rows, pickName) {
  const map = new Map();

  for (const row of rows) {
    const originalName = pickName(row);
    const normalizedName = normalizeArabicName(originalName);
    if (!normalizedName || map.has(normalizedName)) continue;
    map.set(normalizedName, originalName);
  }

  return map;
}

async function main() {
  console.log('Comparing local israeliSchools.js with public.schools ...');

  const { data, error } = await supabase
    .from('schools')
    .select('id, name_ar, city_ar, is_active')
    .order('name_ar');

  if (error) {
    console.error('Failed to load schools from Supabase:', error.message);
    process.exit(1);
  }

  const dbSchools = data || [];
  const fileMap = uniqueByNormalizedName(israeliSchools, (school) => school.name);
  const dbMap = uniqueByNormalizedName(dbSchools, (school) => school.name_ar);

  const fileOnly = [];
  const dbOnly = [];
  let matched = 0;

  for (const [normalizedName, originalName] of fileMap.entries()) {
    if (dbMap.has(normalizedName)) matched += 1;
    else fileOnly.push(originalName);
  }

  for (const [normalizedName, originalName] of dbMap.entries()) {
    if (!fileMap.has(normalizedName)) dbOnly.push(originalName);
  }

  console.log('');
  console.log(`File schools count: ${fileMap.size}`);
  console.log(`Database schools count: ${dbMap.size}`);
  console.log(`Matched schools count: ${matched}`);
  console.log(`Missing from database: ${fileOnly.length}`);
  console.log(`Extra in database: ${dbOnly.length}`);

  if (fileOnly.length) {
    console.log('');
    console.log('Schools found in israeliSchools.js but missing in public.schools:');
    for (const name of fileOnly) console.log(`- ${name}`);
  }

  if (dbOnly.length) {
    console.log('');
    console.log('Schools found in public.schools but not in israeliSchools.js:');
    for (const name of dbOnly) console.log(`- ${name}`);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error.message || error);
  process.exit(1);
});
