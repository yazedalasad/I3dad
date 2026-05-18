import { supabase } from '../../config/supabase';
import {
  buildCatalogProgramsForMajor,
  getMajorKey,
  isMissingSchema,
  localizeRecord,
  normalizeKey,
} from '../../services/academicCatalogHelpers';
import { findMajorProfile, normalizeMajorKey } from '../data/majorProfiles';

function safeNum(value, fallback = NaN) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeLang(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(studentLocation = {}, institution = {}) {
  const lat1 = safeNum(studentLocation.latitude);
  const lon1 = safeNum(studentLocation.longitude);
  const lat2 = safeNum(institution.latitude);
  const lon2 = safeNum(institution.longitude);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
  const radius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function normalizeProgram(row = {}) {
  const institution = row.institutions || row.institution || {};
  return {
    ...row,
    institution,
    institution_id: row.institution_id || institution.id,
    major_id: row.major_id || row.major_key || row.degree_code || row.code,
    major_key: row.major_key || row.degree_code || row.code || row.major_id,
    program_name_ar: row.program_name_ar || row.name_ar || row.title_ar || row.name || '',
    program_name_he: row.program_name_he || row.name_he || row.title_he || row.program_name_ar || row.name || '',
    program_name_en: row.program_name_en || row.name_en || row.title_en || row.program_name_en || row.name || '',
    degree_type: row.degree_type || row.degree || 'bachelor',
    study_duration: row.study_duration || row.duration || '',
    language_of_study: row.language_of_study || row.language || '',
    admission_requirements_ar: row.admission_requirements_ar || row.admission_notes_ar || '',
    admission_requirements_he: row.admission_requirements_he || row.admission_notes_he || '',
    admission_requirements_en: row.admission_requirements_en || row.admission_notes_en || '',
    program_url: row.program_url || row.website_url || row.website || institution.website_url || institution.website || '',
    is_active: row.is_active !== false,
  };
}

function typeRank(type) {
  const ranks = {
    university: 0,
    academic_college: 1,
    college: 1,
    engineering_college: 1,
    education_college: 2,
    practical_engineering: 2,
    open_university: 3,
    other: 4,
  };
  return ranks[type] ?? 5;
}

function languageMatches(program, studentLanguage) {
  const language = normalizeLang(studentLanguage);
  const text = normalizeKey(program.language_of_study);
  if (!text) return false;
  if (language === 'ar') return text.includes('arab') || text.includes('عرب') || text.includes('arabic');
  if (language === 'he') return text.includes('hebrew') || text.includes('עבר') || text.includes('he');
  return text.includes('english') || text.includes('en');
}

function uniqueValues(values = []) {
  return [...new Set(values.map((value) => normalizeMajorKey(value)).filter(Boolean))];
}

function candidateMajorKeys(majorId, options = {}) {
  const profile = findMajorProfile(options.majorKey) ||
    findMajorProfile(options.code) ||
    findMajorProfile(options.name_en) ||
    findMajorProfile(options.name_ar) ||
    findMajorProfile(options.name_he) ||
    findMajorProfile(majorId);
  return uniqueValues([
    options.majorKey,
    options.code,
    options.name_en,
    options.name_ar,
    options.name_he,
    getMajorKey(majorId),
    profile?.key,
    ...(profile?.aliases || []),
  ]);
}

function programMatchesCandidate(program = {}, candidates = []) {
  if (!candidates.length) return true;
  const programKeys = uniqueValues([
    program.major_key,
    program.degree_code,
    program.code,
    program.majors?.key,
    program.majors?.code,
    program.majors?.name_ar,
    program.majors?.name_he,
    program.majors?.name_en,
    program.program_name_ar,
    program.program_name_he,
    program.program_name_en,
  ]);
  return programKeys.some((key) => candidates.includes(key));
}

export function sortInstitutionPrograms(programs = [], studentLocation = {}, studentRegion = studentLocation.region) {
  const language = studentLocation.languagePreference || studentLocation.language || 'ar';
  return [...programs].map((program) => {
    const institution = program.institution || {};
    const distance = distanceKm(studentLocation, institution);
    return {
      ...program,
      distance_km: distance,
      same_region: !!studentRegion && institution.region === studentRegion,
      language_match: languageMatches(program, language),
      active_match: program.is_active !== false && institution.is_active !== false,
    };
  }).sort((left, right) => {
    if (left.same_region !== right.same_region) return left.same_region ? -1 : 1;
    if (left.distance_km !== null || right.distance_km !== null) {
      return (left.distance_km ?? Infinity) - (right.distance_km ?? Infinity);
    }
    if (left.active_match !== right.active_match) return left.active_match ? -1 : 1;
    const leftType = left.institution?.type || left.institution?.institution_type || 'other';
    const rightType = right.institution?.type || right.institution?.institution_type || 'other';
    if (typeRank(leftType) !== typeRank(rightType)) return typeRank(leftType) - typeRank(rightType);
    if (left.language_match !== right.language_match) return left.language_match ? -1 : 1;
    return 0;
  });
}

export function formatInstitutionCard(program, language = 'ar') {
  const lang = normalizeLang(language);
  const institution = program.institution || {};
  const name = localizeRecord(institution, 'name', lang) || institution.name || '';
  const city = localizeRecord(institution, 'city', lang) || institution.city || '';
  const programName = localizeRecord(program, 'program_name', lang) || program.program_name_en || program.major_key || '';
  const admission = localizeRecord(program, 'admission_requirements', lang);
  const why = {
    ar: program.same_region
      ? 'تظهر هذه المؤسسة لأنها في نفس منطقتك وتقدم برنامجًا نشطًا لهذا التخصص.'
      : 'تظهر هذه المؤسسة لأنها تقدم برنامجًا مرتبطًا بهذا التخصص.',
    he: program.same_region
      ? 'מוסד זה מוצג כי הוא נמצא באזור שלך ומציע מסלול פעיל בתחום.'
      : 'מוסד זה מוצג כי הוא מציע מסלול המקושר לתחום.',
    en: program.same_region
      ? 'Shown because it is in your region and offers an active linked program.'
      : 'Shown because it offers a program linked to this major.',
  };

  return {
    ...program,
    institution_name: name,
    city,
    region: institution.region || '',
    program_name: programName,
    admission_requirements: admission,
    website_url: program.program_url || institution.website_url || institution.website || '',
    why_shown: why[lang],
  };
}

export async function getProgramsByInstitution(institutionId) {
  if (!institutionId) return [];
  const { data, error } = await supabase
    .from('institution_programs')
    .select('*, institutions(*), majors(*)')
    .eq('institution_id', institutionId)
    .eq('is_active', true);
  if (error) {
    if (isMissingSchema(error)) return [];
    throw error;
  }
  return (data || []).map(normalizeProgram);
}

export async function getInstitutionsForMajor(majorId, studentLocation = {}, options = {}) {
  const majorKey = options.majorKey || getMajorKey(majorId);
  const candidates = candidateMajorKeys(majorId, options);
  let rows = [];
  try {
    let query = supabase
      .from('institution_programs')
      .select('*, institutions(*), majors(*)')
      .eq('is_active', true);
    if (isUuid(majorId)) {
      query = query.or(`major_id.eq.${majorId},major_key.in.(${candidates.join(',')})`);
    } else if (candidates.length) {
      query = query.in('major_key', candidates);
    } else {
      query = query.eq('major_key', majorKey);
    }
    const { data, error } = await query;
    if (error) throw error;
    rows = data || [];
  } catch (error) {
    if (!isMissingSchema(error)) throw error;
    rows = buildCatalogProgramsForMajor(majorKey);
  }

  rows = rows.filter((program) => programMatchesCandidate(program, candidates));
  if (!rows.length) rows = buildCatalogProgramsForMajor(majorKey);
  return sortInstitutionPrograms(rows.map(normalizeProgram), studentLocation, studentLocation.region)
    .map((program) => formatInstitutionCard(program, options.language || studentLocation.languagePreference || 'ar'));
}

export default {
  getInstitutionsForMajor,
  getProgramsByInstitution,
  sortInstitutionPrograms,
  formatInstitutionCard,
};
