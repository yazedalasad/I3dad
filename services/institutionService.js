import { supabase } from '../config/supabase';
import {
  buildCatalogProgramsForMajor,
  catalogInstitutionToRow,
  getMajorKey,
  isMissingSchema,
  localizeRecord,
  normalizeKey,
} from './academicCatalogHelpers';

const REGION_CITY_HINTS = {
  south: ['beer sheva', 'beersheba', 'rahat', 'laqiya', 'shaar hanegev', 'kiryat malakhi', 'arara', 'ksife', 'hura'],
  haifa: ['haifa', 'umm al-fahm', 'nazareth'],
  center: ['ramat gan', 'herzliya', 'ariel', 'holon', 'petah tikva'],
  tel_aviv: ['tel aviv', 'yafo'],
  jerusalem: ['jerusalem', 'al-quds'],
  north: ['safed', 'tiberias', 'acre'],
};

export async function getInstitutionsForMajor(majorId, studentLocation = {}, filters = {}) {
  const majorKey = getMajorKey(majorId);

  try {
    const programs = await fetchProgramsForMajor(majorId, majorKey);
    const filtered = applyProgramFilters(programs, filters);
    const sorted = sortProgramsForStudent(filtered, studentLocation);
    return { success: true, data: sorted, source: programs[0]?.source || 'database' };
  } catch (error) {
    if (!isMissingSchema(error)) return { success: false, error: error.message, data: [] };
    const fallback = sortProgramsForStudent(
      applyProgramFilters(buildCatalogProgramsForMajor(majorKey), filters),
      studentLocation
    );
    return { success: true, data: fallback, source: 'local_catalog' };
  }
}

export async function getInstitutionById(institutionId) {
  if (!institutionId) return null;
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .eq('id', institutionId)
    .maybeSingle();

  if (!error && data) return normalizeInstitution(data);
  return null;
}

export function normalizeInstitution(row) {
  if (!row) return null;
  return {
    ...row,
    type: row.type || row.institution_type || 'other',
    institution_type: row.institution_type || row.type || 'other',
    website_url: row.website_url || row.website || null,
    website: row.website || row.website_url || null,
    city_ar: row.city_ar || row.city || null,
    city_he: row.city_he || row.city_ar || row.city || null,
    city_en: row.city_en || row.city_ar || row.city || null,
    region: row.region || '',
    is_active: row.is_active !== false,
  };
}

export function getInstitutionDisplayName(institution, language) {
  return localizeRecord(institution, 'name', language) || institution?.name || '';
}

export function getInstitutionCity(institution, language) {
  return localizeRecord(institution, 'city', language) || institution?.city || '';
}

export function sortProgramsForStudent(programs = [], studentLocation = {}) {
  const location = normalizeStudentLocation(studentLocation);
  return [...programs].sort((left, right) => {
    const leftInstitution = left.institution || {};
    const rightInstitution = right.institution || {};
    const leftDistance = distanceKm(location, leftInstitution);
    const rightDistance = distanceKm(location, rightInstitution);

    if (Number.isFinite(leftDistance) || Number.isFinite(rightDistance)) {
      return (Number.isFinite(leftDistance) ? leftDistance : Infinity) - (Number.isFinite(rightDistance) ? rightDistance : Infinity);
    }

    const leftSameRegion = location.region && leftInstitution.region === location.region ? 1 : 0;
    const rightSameRegion = location.region && rightInstitution.region === location.region ? 1 : 0;
    if (leftSameRegion !== rightSameRegion) return rightSameRegion - leftSameRegion;

    const leftActive = left.is_active !== false && leftInstitution.is_active !== false ? 1 : 0;
    const rightActive = right.is_active !== false && rightInstitution.is_active !== false ? 1 : 0;
    if (leftActive !== rightActive) return rightActive - leftActive;

    const typeRank = { university: 0, academic_college: 1, college: 1, engineering_college: 1, practical_engineering: 2, open_university: 3, other: 4 };
    return (typeRank[leftInstitution.type] ?? 5) - (typeRank[rightInstitution.type] ?? 5);
  }).map((program) => {
    const distance = distanceKm(location, program.institution || {});
    return {
      ...program,
      distance_km: Number.isFinite(distance) ? Math.round(distance) : null,
      same_region: !!location.region && program.institution?.region === location.region,
    };
  });
}

async function fetchProgramsForMajor(majorId, majorKey) {
  const queries = [
    () => {
      let query = supabase.from('institution_programs').select('*, institutions(*)').eq('is_active', true);
      query = isUuid(majorId)
        ? query.or(`major_id.eq.${majorId},major_key.eq.${majorKey}`)
        : query.eq('major_key', majorKey);
      return query;
    },
    () => {
      let query = supabase.from('programs').select('*, institutions(*)').eq('is_active', true);
      query = isUuid(majorId)
        ? query.or(`major_id.eq.${majorId},major_key.eq.${majorKey},degree_code.eq.${majorKey},code.eq.${majorKey}`)
        : query.or(`major_key.eq.${majorKey},degree_code.eq.${majorKey},code.eq.${majorKey}`);
      return query;
    },
  ];

  for (const run of queries) {
    const { data, error } = await run();
    if (!error && Array.isArray(data) && data.length) return data.map(normalizeProgram);
    if (error && !isMissingSchema(error)) throw error;
  }

  return buildCatalogProgramsForMajor(majorKey);
}

function normalizeProgram(row) {
  const institution = normalizeInstitution(row.institutions || row.institution || row);
  return {
    ...row,
    institution,
    institution_id: row.institution_id || institution?.id,
    major_id: row.major_id || row.major_key || row.degree_id || row.degree_code,
    major_key: row.major_key || row.degree_code || row.code || row.major_id,
    program_name_ar: row.program_name_ar || row.name_ar || row.title_ar || row.name || '',
    program_name_he: row.program_name_he || row.name_he || row.title_he || row.program_name_ar || row.name || '',
    program_name_en: row.program_name_en || row.name_en || row.title_en || row.program_name_ar || row.name || '',
    degree_type: row.degree_type || row.degree || 'bachelor',
    study_duration: row.study_duration || row.duration || null,
    language_of_study: row.language_of_study || row.language || null,
    admission_requirements_ar: row.admission_requirements_ar || row.admission_notes_ar || null,
    admission_requirements_he: row.admission_requirements_he || row.admission_notes_he || null,
    admission_requirements_en: row.admission_requirements_en || row.admission_notes_en || null,
    program_url: row.program_url || row.website_url || row.website || institution?.website_url || null,
    is_active: row.is_active !== false,
  };
}

function applyProgramFilters(programs, filters = {}) {
  return programs.filter((program) => {
    const institution = program.institution || {};
    if (filters.region && institution.region !== filters.region) return false;
    if (filters.institutionType && institution.type !== filters.institutionType && institution.institution_type !== filters.institutionType) return false;
    if (filters.degreeType && program.degree_type !== filters.degreeType) return false;
    if (filters.languageOfStudy && !String(program.language_of_study || '').toLowerCase().includes(String(filters.languageOfStudy).toLowerCase())) return false;
    if (filters.city) {
      const city = normalizeKey(`${institution.city_ar || ''} ${institution.city_he || ''} ${institution.city_en || ''}`);
      if (!city.includes(normalizeKey(filters.city))) return false;
    }
    return true;
  });
}

function normalizeStudentLocation(location = {}) {
  const city = String(location.city || location.city_ar || location.city_he || location.school_city || location.school_name || '').trim();
  const region = location.region || inferRegionFromCity(city);
  return {
    city,
    region,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
  };
}

function inferRegionFromCity(city) {
  const normalized = String(city || '').toLowerCase();
  return Object.entries(REGION_CITY_HINTS).find(([, cities]) => cities.some((item) => normalized.includes(item)))?.[0] || '';
}

function distanceKm(location, institution) {
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return NaN;
  const lat2 = Number(institution.latitude);
  const lon2 = Number(institution.longitude);
  if (!Number.isFinite(lat2) || !Number.isFinite(lon2)) return NaN;

  const radius = 6371;
  const dLat = toRad(lat2 - location.latitude);
  const dLon = toRad(lon2 - location.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(location.latitude)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export { catalogInstitutionToRow };

export default {
  getInstitutionsForMajor,
  getInstitutionById,
  getInstitutionDisplayName,
  getInstitutionCity,
};
