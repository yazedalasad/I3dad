import { supabase } from '../config/supabase';
import {
  buildCatalogProgramsForInstitution,
  buildCatalogProgramsForMajor,
  getMajorKey,
  isMissingSchema,
} from './academicCatalogHelpers';
import { sortProgramsForStudent } from './institutionService';

export async function getProgramsByInstitution(institutionId) {
  if (!institutionId) return { success: true, data: [] };

  const queries = [
    () => supabase
      .from('institution_programs')
      .select('*, institutions(*), majors(*)')
      .eq('institution_id', institutionId)
      .eq('is_active', true),
    () => supabase
      .from('programs')
      .select('*, institutions(*)')
      .eq('institution_id', institutionId)
      .eq('is_active', true),
  ];

  for (const run of queries) {
    const { data, error } = await run();
    if (!error && Array.isArray(data) && data.length) {
      return { success: true, data: data.map(normalizeProgramLink), source: 'database' };
    }
    if (error && !isMissingSchema(error)) return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: buildCatalogProgramsForInstitution(institutionId), source: 'local_catalog' };
}

export async function getProgramsByMajor(majorId, studentLocation = {}, filters = {}) {
  const majorKey = getMajorKey(majorId);
  let query = supabase
    .from('institution_programs')
    .select('*, institutions(*), majors(*)')
    .eq('is_active', true);
  query = isUuid(majorId)
    ? query.or(`major_id.eq.${majorId},major_key.eq.${majorKey}`)
    : query.eq('major_key', majorKey);

  const { data, error } = await query;

  if (!error && Array.isArray(data) && data.length) {
    return {
      success: true,
      data: sortProgramsForStudent(data.map(normalizeProgramLink), studentLocation).filter((program) => matchesFilters(program, filters)),
      source: 'database',
    };
  }

  if (error && !isMissingSchema(error)) return { success: false, error: error.message, data: [] };

  return {
    success: true,
    data: sortProgramsForStudent(buildCatalogProgramsForMajor(majorKey), studentLocation).filter((program) => matchesFilters(program, filters)),
    source: 'local_catalog',
  };
}

export async function getAllProgramLinks() {
  const { data, error } = await supabase
    .from('institution_programs')
    .select('*, institutions(*), majors(*)')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (!error) return { success: true, data: (data || []).map(normalizeProgramLink), source: 'database' };
  if (!isMissingSchema(error)) return { success: false, error: error.message, data: [] };
  return { success: true, data: [], source: 'database_missing' };
}

export async function adminCreateProgramLink(payload) {
  const validation = await validateProgramPayload(payload);
  if (!validation.valid) return { success: false, error: { message: validation.message } };

  const row = buildProgramPayload(payload);
  const duplicate = await findDuplicateProgram(row);
  if (duplicate) {
    return { success: false, error: { message: 'Active program already exists for this institution, major, and degree type.' } };
  }

  const { data, error } = await supabase
    .from('institution_programs')
    .insert([row])
    .select('*, institutions(*), majors(*)')
    .maybeSingle();

  if (error) return { success: false, error };
  return { success: true, row: normalizeProgramLink(data) };
}

export async function adminUpdateProgramLink(id, payload) {
  const validation = await validateProgramPayload(payload);
  if (!validation.valid) return { success: false, error: { message: validation.message } };

  const row = {
    ...buildProgramPayload(payload),
    updated_at: new Date().toISOString(),
  };
  const duplicate = await findDuplicateProgram(row, id);
  if (duplicate) {
    return { success: false, error: { message: 'Active program already exists for this institution, major, and degree type.' } };
  }

  const { data, error } = await supabase
    .from('institution_programs')
    .update(row)
    .eq('id', id)
    .select('*, institutions(*), majors(*)')
    .maybeSingle();

  if (error) return { success: false, error };
  return { success: true, row: normalizeProgramLink(data) };
}

function buildProgramPayload(payload) {
  const rawMajorId = payload.major_id || payload.majorId || null;
  const majorId = isUuid(rawMajorId) ? rawMajorId : null;
  const majorKey = payload.major_key || payload.majorKey || getMajorKey(rawMajorId || payload.program_name_en);
  return {
    institution_id: payload.institution_id || payload.institutionId,
    major_id: majorId,
    major_key: majorKey,
    program_name_ar: String(payload.program_name_ar || payload.programNameAr || payload.program_name_en || '').trim(),
    program_name_he: String(payload.program_name_he || payload.programNameHe || payload.program_name_ar || payload.program_name_en || '').trim(),
    program_name_en: String(payload.program_name_en || payload.programNameEn || payload.program_name_ar || '').trim(),
    degree_type: payload.degree_type || payload.degreeType || 'bachelor',
    study_duration: payload.study_duration || payload.studyDuration || null,
    language_of_study: payload.language_of_study || payload.languageOfStudy || null,
    admission_requirements_ar: payload.admission_requirements_ar || payload.admissionRequirementsAr || null,
    admission_requirements_he: payload.admission_requirements_he || payload.admissionRequirementsHe || null,
    admission_requirements_en: payload.admission_requirements_en || payload.admissionRequirementsEn || null,
    program_url: payload.program_url || payload.programUrl || null,
    is_active: payload.is_active !== false,
  };
}

async function validateProgramPayload(payload) {
  const institutionId = payload.institution_id || payload.institutionId;
  const rawMajorId = payload.major_id || payload.majorId;
  const majorId = isUuid(rawMajorId) ? rawMajorId : null;
  if (!institutionId) return { valid: false, message: 'institution_id is required.' };
  if (!majorId && !rawMajorId && !payload.major_key && !payload.majorKey) return { valid: false, message: 'major_id is required.' };
  if (!String(payload.program_name_ar || payload.programNameAr || payload.program_name_en || '').trim()) {
    return { valid: false, message: 'Program name is required.' };
  }

  const programUrl = String(payload.program_url || payload.programUrl || '').trim();
  if (programUrl && !/^https?:\/\/.+\..+/.test(programUrl)) {
    return { valid: false, message: 'program_url must be a valid URL.' };
  }

  const [institution, major] = await Promise.all([
    supabase.from('institutions').select('id').eq('id', institutionId).maybeSingle(),
    majorId ? supabase.from('majors').select('id').eq('id', majorId).maybeSingle() : Promise.resolve({ data: true, error: null }),
  ]);

  if (institution.error || !institution.data) return { valid: false, message: 'institution_id does not exist.' };
  if (majorId && major.error && !isMissingSchema(major.error)) return { valid: false, message: 'major_id does not exist.' };
  if (majorId && major.error && isMissingSchema(major.error)) return { valid: true };
  if (majorId && !major.data) return { valid: false, message: 'major_id does not exist.' };
  return { valid: true };
}

async function findDuplicateProgram(row, excludeId = null) {
  let query = supabase
    .from('institution_programs')
    .select('id, program_name_ar, program_name_he, program_name_en')
    .eq('institution_id', row.institution_id)
    .eq('degree_type', row.degree_type)
    .eq('is_active', true);

  if (row.major_id) query = query.eq('major_id', row.major_id);
  else query = query.eq('major_key', row.major_key);
  if (excludeId) query = query.neq('id', excludeId);

  const { data, error } = await query.limit(20);
  if (error) return false;

  const name = normalizeName(row.program_name_en || row.program_name_ar || row.program_name_he);
  return (data || []).some((item) => {
    const itemName = normalizeName(item.program_name_en || item.program_name_ar || item.program_name_he);
    return !itemName || itemName === name;
  });
}

function normalizeProgramLink(row) {
  const institution = row.institutions || row.institution || null;
  const major = row.majors || row.major || null;
  return {
    ...row,
    institution,
    major,
    major_key: row.major_key || major?.key || major?.code || row.major_id,
    program_url: row.program_url || row.website || institution?.website_url || institution?.website || null,
    is_active: row.is_active !== false,
  };
}

function matchesFilters(program, filters = {}) {
  if (filters.region && program.institution?.region !== filters.region) return false;
  if (filters.institutionType && program.institution?.type !== filters.institutionType && program.institution?.institution_type !== filters.institutionType) return false;
  if (filters.degreeType && program.degree_type !== filters.degreeType) return false;
  if (filters.languageOfStudy && !String(program.language_of_study || '').toLowerCase().includes(String(filters.languageOfStudy).toLowerCase())) return false;
  if (filters.city) {
    const city = `${program.institution?.city_ar || ''} ${program.institution?.city_he || ''} ${program.institution?.city_en || ''}`.toLowerCase();
    if (!city.includes(String(filters.city).toLowerCase())) return false;
  }
  return true;
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export default {
  getProgramsByInstitution,
  getProgramsByMajor,
  getAllProgramLinks,
  adminCreateProgramLink,
  adminUpdateProgramLink,
};
