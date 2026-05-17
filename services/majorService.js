import { supabase } from '../config/supabase';
import { majorCatalog } from '../data/majorCatalog';
import {
  catalogMajorToRow,
  getMajorKey,
  isMissingSchema,
  localizeRecord,
  normalizeKey,
} from './academicCatalogHelpers';

export async function getMajors(options = {}) {
  const onlyActive = options.onlyActive !== false;
  const tables = [
    { table: 'majors', select: '*' },
    { table: 'academic_fields', select: '*' },
    { table: 'degrees', select: 'id, code, name_ar, name_he, name_en, category, is_active' },
  ];

  for (const candidate of tables) {
    let query = supabase.from(candidate.table).select(candidate.select);
    if (onlyActive) query = query.eq('is_active', true);
    const { data, error } = await query.limit(500);

    if (!error && Array.isArray(data) && data.length) {
      return {
        success: true,
        data: data.map((row) => normalizeMajorRow(row)),
        source: candidate.table,
      };
    }

    if (error && !isMissingSchema(error)) {
      return { success: false, error: error.message, data: fallbackMajors() };
    }
  }

  return { success: true, data: fallbackMajors(), source: 'local_catalog' };
}

export async function getMajorByIdOrKey(value) {
  const majors = await getMajors();
  const key = getMajorKey(value);
  const normalized = normalizeKey(value);
  const match = (majors.data || []).find((major) =>
    [major.id, major.key, major.code, major.name_ar, major.name_he, major.name_en]
      .filter(Boolean)
      .some((candidate) => normalizeKey(candidate) === normalized || normalizeKey(candidate) === key)
  );
  return match || null;
}

export async function adminCreateMajor(payload) {
  const validation = validateMajorPayload(payload);
  if (!validation.valid) return { success: false, error: { message: validation.message } };

  const row = buildMajorPayload(payload);
  const { data, error } = await supabase
    .from('majors')
    .insert([row])
    .select('*')
    .maybeSingle();

  if (error) return { success: false, error };
  return { success: true, row: normalizeMajorRow(data) };
}

export async function adminUpdateMajor(id, payload) {
  const validation = validateMajorPayload(payload);
  if (!validation.valid) return { success: false, error: { message: validation.message } };

  const row = {
    ...buildMajorPayload(payload),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('majors')
    .update(row)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) return { success: false, error };
  return { success: true, row: normalizeMajorRow(data) };
}

export function normalizeMajorRow(row) {
  const key = row.key || row.code || getMajorKey(row.name_en || row.name_ar || row.name_he || row.id);
  return {
    ...row,
    id: row.id || key,
    key,
    code: row.code || key,
    name_ar: row.name_ar || row.title_ar || row.name || key,
    name_he: row.name_he || row.title_he || row.name_ar || row.name || key,
    name_en: row.name_en || row.title_en || row.name_ar || row.name || key,
    category: row.category || 'academic',
    description_ar: row.description_ar || null,
    description_he: row.description_he || null,
    description_en: row.description_en || null,
    is_active: row.is_active !== false,
  };
}

export function getMajorDisplayName(major, language) {
  return localizeRecord(major, 'name', language) || major?.key || '';
}

function fallbackMajors() {
  return majorCatalog.map(catalogMajorToRow);
}

function buildMajorPayload(payload) {
  const nameAr = String(payload.name_ar || payload.nameAr || '').trim();
  const nameHe = String(payload.name_he || payload.nameHe || nameAr).trim();
  const nameEn = String(payload.name_en || payload.nameEn || nameAr).trim();
  const key = normalizeKey(payload.key || payload.code || nameEn || nameAr);

  return {
    key,
    code: key,
    name_ar: nameAr,
    name_he: nameHe,
    name_en: nameEn,
    category: payload.category || 'academic',
    description_ar: payload.description_ar || payload.descriptionAr || null,
    description_he: payload.description_he || payload.descriptionHe || null,
    description_en: payload.description_en || payload.descriptionEn || null,
    is_active: payload.is_active !== false,
  };
}

function validateMajorPayload(payload) {
  if (!String(payload.name_ar || payload.nameAr || '').trim()) return { valid: false, message: 'Arabic major name is required.' };
  if (!String(payload.name_he || payload.nameHe || payload.name_ar || payload.nameAr || '').trim()) return { valid: false, message: 'Hebrew major name is required.' };
  if (!String(payload.name_en || payload.nameEn || payload.name_ar || payload.nameAr || '').trim()) return { valid: false, message: 'English major name is required.' };
  return { valid: true };
}

export default {
  getMajors,
  getMajorByIdOrKey,
  getMajorDisplayName,
  adminCreateMajor,
  adminUpdateMajor,
};
