// File: services/recommendationService.js
/**
 * RECOMMENDATION SERVICE (UPDATED)
 * ================================
 * Uses the new matching engine that combines:
 *  - Ability 50%
 *  - Personality 30%
 *  - Interest 20%
 *
 * Returns TOP 5 degrees + localized name for UI (ar/he/en).
 */

import degreeMatchService from './degreeMatchService';
import { supabase } from '../config/supabase';
import { getMajorKey } from './academicCatalogHelpers';
import { getInstitutionsForMajor } from './institutionService';

/* ----------------------------- Helpers ----------------------------- */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeLang(lang) {
  const l = String(lang || '').toLowerCase().trim();
  if (l.startsWith('ar')) return 'ar';
  if (l.startsWith('he') || l.startsWith('iw')) return 'he';
  return 'en';
}

function pickDegreeName(deg, lang) {
  const L = safeLang(lang);

  // Prefer requested language, then fallback chain
  if (L === 'ar') return deg.name_ar || deg.name_en || deg.name_he || deg.code;
  if (L === 'he') return deg.name_he || deg.name_en || deg.name_ar || deg.code;
  return deg.name_en || deg.name_he || deg.name_ar || deg.code;
}

function toPercent(score01) {
  const s = Number(score01);
  if (!Number.isFinite(s)) return 0;
  return clamp(s * 100, 0, 100);
}

/* ------------------------ Public API ------------------------------- */

export async function recommendTopDegrees(studentId, options = {}) {
  try {
    // ✅ Always top 5
    const limit = 5;

    // Language for UI (pass i18n.language from frontend)
    const language = options.language ?? 'en';

    // ✅ Your chosen weights
    const weights = { ability: 0.4, personality: 0.4, interest: 0.2 };

    // Pass-through tuning (optional)
    const minTrustedQuestions = Number(options.minTrustedQuestions ?? 5);
    const onlyActiveDegrees = options.onlyActiveDegrees ?? true;

    // Call the new service
    const result = await degreeMatchService.recommendTopDegreesWithPersonality(
      studentId,
      {
        limit,
        weights,
        minTrustedQuestions,
        onlyActiveDegrees,
      }
    );

    if (!result?.success) return result;

    // Map to a UI-friendly format + localized degree name
    const mapped = (result.data || []).slice(0, limit).map((deg) => ({
      degree_id: deg.degree_id,
      code: deg.code,
      category: deg.category ?? null,

      // ✅ localized display name
      name: pickDegreeName(deg, language),

      // keep originals too
      name_en: deg.name_en ?? null,
      name_he: deg.name_he ?? null,
      name_ar: deg.name_ar ?? null,

      // score
      score: Number((deg.score ?? 0).toFixed(6)), // 0..1
      score_percent: Number((deg.score_percent ?? toPercent(deg.score)).toFixed(2)), // 0..100
      base_score: deg.base_score ?? null,
      game_signal_bonus: deg.game_signal_bonus ?? 0,

      // explanation / breakdown from new service
      breakdown: deg.breakdown ?? null,
    }));

    return {
      success: true,
      data: mapped,
      usedWeights: result.usedWeights ?? weights,
      hasPersonalityProfile: result.hasPersonalityProfile ?? null,
      evidence: result.evidence ?? null,
    };
  } catch (error) {
    console.error('recommendTopDegrees error:', error);
    return { success: false, error: error.message };
  }
}

export async function recommendTopDegreesAfterSession(studentId, options = {}) {
  return recommendTopDegrees(studentId, options);
}

export async function getRecommendedMajorsWithInstitutions(studentId, options = {}) {
  const result = await recommendTopDegrees(studentId, options);
  if (!result?.success) return result;

  const studentLocation = options.studentLocation || await getStudentLocation(studentId);
  const recommendations = await Promise.all(
    (result.data || []).map(async (major) => {
      const majorKey = getMajorKey(major.code || major.name_en || major.name || major.degree_id);
      const institutionsResult = await getInstitutionsForMajor(
        major.degree_id || majorKey,
        studentLocation,
        options.filters || {}
      );

      const fallbackResult = institutionsResult.data?.length
        ? institutionsResult
        : await getInstitutionsForMajor(majorKey, studentLocation, options.filters || {});

      return {
        ...major,
        major_id: major.degree_id,
        major_key: majorKey,
        institutions: fallbackResult.data || [],
        institutionsError: fallbackResult.success ? null : fallbackResult.error,
      };
    })
  );

  return {
    ...result,
    data: recommendations,
  };
}

async function getStudentLocation(studentId) {
  if (!studentId) return {};
  const { data, error } = await supabase
    .from('students')
    .select('city, city_ar, city_he, region, school_name, school_id, latitude, longitude, schools(city_ar, city_he, region)')
    .eq('id', studentId)
    .maybeSingle();

  if (error || !data) return {};
  return {
    city: data.city || data.city_ar || data.city_he || data.schools?.city_ar || data.schools?.city_he || data.school_name,
    region: data.region || data.schools?.region,
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

export default {
  recommendTopDegrees,
  recommendTopDegreesAfterSession,
  getRecommendedMajorsWithInstitutions,
};
