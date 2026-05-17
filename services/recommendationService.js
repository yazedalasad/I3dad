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

import {
  getRecommendedMajors,
  getRecommendedMajorsWithInstitutions as getEngineRecommendationsWithInstitutions,
} from '../src/services/recommendationEngine';

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
    const language = options.language ?? 'en';
    const limit = Number(options.limit || 5);
    const result = await getRecommendedMajors(studentId, { ...options, language, limit });

    // Map to a UI-friendly format + localized degree name
    const mapped = (result || []).slice(0, limit).map((deg) => ({
      degree_id: deg.degree_id,
      major_id: deg.major_id || deg.degree_id,
      major_key: deg.major_key,
      code: deg.code,
      category: deg.category ?? null,

      // ✅ localized display name
      name: pickDegreeName(deg, language),

      // keep originals too
      name_en: deg.name_en ?? null,
      name_he: deg.name_he ?? null,
      name_ar: deg.name_ar ?? null,

      // score
      score: Number((deg.score ?? 0).toFixed(6)),
      score_percent: Number((deg.score_percent ?? deg.match_percentage ?? toPercent(deg.score)).toFixed(2)),
      match_percentage: deg.match_percentage ?? deg.score_percent ?? toPercent(deg.score),
      base_score: deg.base_score ?? null,
      game_signal_bonus: deg.game_signal_bonus ?? 0,
      confidence_level: deg.confidence_level,
      confidence_reason: deg.confidence_reason,
      missing_steps: deg.missing_steps || [],
      is_preliminary: !!deg.is_preliminary,
      explanation: deg.explanation,
      top_reasons: deg.top_reasons || [],
      usedWeights: deg.usedWeights,

      // explanation / breakdown from new service
      breakdown: deg.breakdown ?? null,
    }));

    return {
      success: true,
      data: mapped,
      usedWeights: mapped[0]?.usedWeights ?? null,
      evidence: mapped[0]?.breakdown?.evidence ?? null,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function recommendTopDegreesAfterSession(studentId, options = {}) {
  return recommendTopDegrees(studentId, options);
}

export async function getRecommendedMajorsWithInstitutions(studentId, options = {}) {
  try {
    const data = await getEngineRecommendationsWithInstitutions(studentId, options);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
}

export default {
  recommendTopDegrees,
  recommendTopDegreesAfterSession,
  getRecommendedMajorsWithInstitutions,
};
