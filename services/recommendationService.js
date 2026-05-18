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
import { supabase } from '../config/supabase';

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

function createUuid() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function uuidOrNull(value) {
  const text = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

async function loadSubjectMap() {
  const { data, error } = await supabase.from('subjects').select('id, code, name_ar, name_he, name_en').eq('is_active', true);
  if (error) return new Map();
  const map = new Map();
  (data || []).forEach((subject) => {
    [subject.code, subject.name_ar, subject.name_he, subject.name_en].filter(Boolean).forEach((key) => {
      map.set(normalizeKey(key), subject.id);
    });
  });
  return map;
}

function subjectIdForRecommendation(recommendation, subjectMap) {
  const candidates = [
    ...(recommendation.related_subjects || []),
    recommendation.major_key,
    recommendation.code,
    recommendation.category,
  ];
  for (const candidate of candidates) {
    const id = subjectMap.get(normalizeKey(candidate));
    if (id) return id;
  }
  return subjectMap.values().next().value || null;
}

async function persistRecommendations(studentId, recommendations = []) {
  try {
    const subjectMap = await loadSubjectMap();
    await supabase.from('student_recommendations').delete().eq('student_id', studentId);
    if (!recommendations.length) return;

    const rows = recommendations
      .map((recommendation, index) => {
        const subjectId = subjectIdForRecommendation(recommendation, subjectMap);
        if (!subjectId) return null;
        return {
          id: createUuid(),
          student_id: studentId,
          subject_id: subjectId,
          rank: index + 1,
          recommendation_score: recommendation.match_score ?? recommendation.score_percent ?? recommendation.match_percentage ?? 0,
          match_score: recommendation.match_score ?? recommendation.score_percent ?? recommendation.match_percentage ?? 0,
          confidence_score: recommendation.confidence_score ?? 0,
          explanation: recommendation.explanation || '',
          data_sources_used: recommendation.data_sources_used || [],
          recommended_major_id: uuidOrNull(recommendation.major_id || recommendation.degree_id),
          recommended_major_key: recommendation.major_key || recommendation.code || null,
          reason_ar: recommendation.name_ar ? recommendation.explanation : null,
          reason_he: recommendation.name_he ? recommendation.explanation : null,
          reason_en: recommendation.name_en ? recommendation.explanation : null,
          status: 'active',
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    if (rows.length) {
      await supabase.from('student_recommendations').insert(rows);
    }
  } catch (_error) {
    // Persistence is useful for reports/admin, but recommendations should still render live.
  }
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
      match_score: deg.match_score ?? deg.score_percent ?? deg.match_percentage ?? toPercent(deg.score),
      match_percentage: deg.match_percentage ?? deg.score_percent ?? toPercent(deg.score),
      base_score: deg.base_score ?? null,
      confidence_score: deg.confidence_score ?? 0,
      game_signal_bonus: deg.game_signal_bonus ?? 0,
      confidence_level: deg.confidence_level,
      confidence_reason: deg.confidence_reason,
      missing_steps: deg.missing_steps || [],
      is_preliminary: !!deg.is_preliminary,
      explanation: deg.explanation,
      top_reasons: deg.top_reasons || [],
      usedWeights: deg.usedWeights,
      data_sources_used: deg.data_sources_used || [],
      related_subjects: deg.related_subjects || [],

      // explanation / breakdown from new service
      breakdown: deg.breakdown ?? null,
    }));

    if (options.persist !== false) {
      persistRecommendations(studentId, mapped).catch(() => {});
    }

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

export async function regenerateRecommendations(studentId, options = {}) {
  if (!studentId) {
    return { success: false, error: 'studentId is required', data: [] };
  }

  return recommendTopDegrees(studentId, {
    ...options,
    persist: true,
    limit: options.limit || 5,
  });
}

export async function getRecommendedMajorsWithInstitutions(studentId, options = {}) {
  try {
    const data = await getEngineRecommendationsWithInstitutions(studentId, options);
    if (options.persist !== false) {
      persistRecommendations(studentId, data).catch(() => {});
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message, data: [] };
  }
}

export default {
  recommendTopDegrees,
  recommendTopDegreesAfterSession,
  regenerateRecommendations,
  getRecommendedMajorsWithInstitutions,
};
