import { institutionsCatalog, localizeField, majorCatalog } from '../data/majorCatalog';

export function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

export function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function localizeRecord(record, field, language) {
  const lang = normalizeLanguage(language);
  return record?.[`${field}_${lang}`] || record?.[`${field}_en`] || record?.[`${field}_ar`] || record?.[`${field}_he`] || '';
}

export function getMajorKey(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const normalized = normalizeKey(text);
  const match = majorCatalog.find((major) => {
    const candidates = [
      major.key,
      major.title?.ar,
      major.title?.he,
      major.title?.en,
    ].filter(Boolean);
    return candidates.some((candidate) => normalizeKey(candidate) === normalized);
  });
  return match?.key || normalized;
}

export function catalogMajorToRow(major) {
  return {
    id: major.key,
    key: major.key,
    code: major.key,
    name_ar: major.title?.ar || major.title?.en || major.key,
    name_he: major.title?.he || major.title?.en || major.key,
    name_en: major.title?.en || major.title?.ar || major.key,
    category: major.category || major.miniTaskKey || 'academic',
    description_ar: major.summary?.ar || null,
    description_he: major.summary?.he || null,
    description_en: major.summary?.en || null,
    is_active: true,
    source: 'local_catalog',
  };
}

export function catalogInstitutionToRow(institution) {
  return {
    id: institution.code,
    code: institution.code,
    name_ar: institution.title?.ar || institution.name,
    name_he: institution.title?.he || institution.name,
    name_en: institution.title?.en || institution.name,
    type: institution.typeKey || institution.type || 'other',
    institution_type: institution.typeKey || institution.type || 'other',
    city_ar: institution.cityLabel?.ar || institution.city,
    city_he: institution.cityLabel?.he || institution.city,
    city_en: institution.cityLabel?.en || institution.city,
    region: institution.region || '',
    website_url: institution.website || null,
    website: institution.website || null,
    latitude: institution.latitude || null,
    longitude: institution.longitude || null,
    description_ar: institution.summary?.ar || null,
    description_he: institution.summary?.he || null,
    description_en: institution.summary?.en || null,
    is_active: true,
    source: 'local_catalog',
  };
}

export function buildCatalogProgramsForMajor(majorIdOrKey) {
  const majorKey = getMajorKey(majorIdOrKey);
  const major = majorCatalog.find((item) => item.key === majorKey);
  if (!major) return [];

  return institutionsCatalog
    .filter((institution) => (institution.majors || []).includes(majorKey))
    .map((institution) => ({
      id: `catalog-${institution.code}-${majorKey}`,
      institution_id: institution.code,
      major_id: majorKey,
      major_key: majorKey,
      program_name_ar: localizeField(major.title, 'ar'),
      program_name_he: localizeField(major.title, 'he'),
      program_name_en: localizeField(major.title, 'en'),
      degree_type: 'bachelor',
      study_duration: null,
      language_of_study: (institution.languages || []).join(', '),
      admission_requirements_ar: institution.admission?.ar || null,
      admission_requirements_he: institution.admission?.he || null,
      admission_requirements_en: institution.admission?.en || null,
      program_url: institution.website || null,
      is_active: true,
      source: 'local_catalog',
      major: catalogMajorToRow(major),
      institution: catalogInstitutionToRow(institution),
    }));
}

export function buildCatalogProgramsForInstitution(institutionIdOrCode) {
  const key = normalizeKey(institutionIdOrCode);
  const institution = institutionsCatalog.find((item) =>
    [item.code, item.name, item.title?.ar, item.title?.he, item.title?.en]
      .filter(Boolean)
      .some((value) => normalizeKey(value) === key)
  );
  if (!institution) return [];

  return (institution.majors || [])
    .map((majorKey) => buildCatalogProgramsForMajor(majorKey).find((program) => program.institution_id === institution.code))
    .filter(Boolean);
}

export function isMissingSchema(error) {
  const message = String(error?.message || error?.details || '');
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    message.includes('does not exist') ||
    message.includes('Could not find') ||
    message.includes('schema cache')
  );
}
