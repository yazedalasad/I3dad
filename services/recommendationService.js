// File: services/recommendationService.js
/**
 * RECOMMENDATION SERVICE (FIXED)
 * =============================
 * Builds TOP-N degree recommendations for a student using:
 *  - student_abilities (theta_estimate OR accuracy fallback)
 *  - student_interests (interest_score)
 *  - degree_subject_weights (degree_id, subject_id, weight)
 *  - degrees
 *
 * Key fixes:
 * 1) If theta_estimate is NULL (common), we fallback to accuracy:
 *      accuracy_rate OR (correct_answers / total_questions_answered)
 * 2) Missing data is NOT treated as neutral 0.5 (which caused flat ~49%),
 *    instead we use slightly-low defaults (0.35) to avoid “everything looks average”.
 * 3) Score is normalized by sum of weights (safe even if weights aren’t perfect).
 */

import { supabase } from '../config/supabase';

/* ----------------------------- Helpers ----------------------------- */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// theta [-3..3] -> [0..1]
function normalizeTheta(theta) {
  const t = clamp(Number(theta) || 0, -3, 3);
  return (t + 3) / 6;
}

// accuracy [0..1] (or [0..100]) -> [0..1]
function normalizeAccuracy(acc) {
  const x = Number(acc);
  if (!Number.isFinite(x)) return null;
  if (x > 1) return clamp(x / 100, 0, 1); // if someone stored 75 instead of 0.75
  return clamp(x, 0, 1);
}

// interest [0..100] -> [0..1]
function normalizeInterest(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return null;
  return clamp(s / 100, 0, 1);
}

/**
 * Reliability penalty: if the student answered too few questions for a subject,
 * reduce affinity so we don't overfit tiny samples.
 */
function reliabilityFactor(totalQuestionsAnswered, minTrustedQuestions = 5) {
  const n = Number(totalQuestionsAnswered) || 0;
  if (n >= minTrustedQuestions) return 1.0;
  const t = clamp(n / minTrustedQuestions, 0, 1);
  return 0.7 + 0.3 * t; // 0 answers -> 0.70, grows to 1.0
}

/**
 * Ability signal priority:
 *  1) theta_estimate (IRT) if exists
 *  2) accuracy_rate if exists
 *  3) correct_answers/total_questions_answered if exists
 * Else: null
 */
function computeAbility01({
  theta_estimate,
  accuracy_rate,
  correct_answers,
  total_questions_answered
}) {
  if (theta_estimate !== null && theta_estimate !== undefined) {
    // theta can be 0 but still valid
    return normalizeTheta(theta_estimate);
  }

  const accNorm = normalizeAccuracy(accuracy_rate);
  if (accNorm !== null) return accNorm;

  const correct = Number(correct_answers);
  const total = Number(total_questions_answered);
  if (Number.isFinite(correct) && Number.isFinite(total) && total > 0) {
    return clamp(correct / total, 0, 1);
  }

  return null;
}

/**
 * Subject affinity = blend(ability, interest) * reliability
 */
function computeSubjectAffinity({
  ability01,
  interest01,
  total_questions_answered,
  abilityWeight = 0.6,
  interestWeight = 0.4,
  minTrustedQuestions = 5
}) {
  // If one signal missing, reduce to the available one
  const a = Number.isFinite(ability01) ? ability01 : null;
  const i = Number.isFinite(interest01) ? interest01 : null;

  // Default if everything missing (should be rare): slightly-low
  if (a === null && i === null) return 0.35;

  let base;
  if (a !== null && i !== null) {
    base = abilityWeight * a + interestWeight * i;
  } else if (a !== null) {
    base = a;
  } else {
    base = i;
  }

  const rel = reliabilityFactor(total_questions_answered, minTrustedQuestions);
  return clamp(base * rel, 0, 1);
}

/* -------------------------- Core Queries --------------------------- */

/**
 * Pull student signals (abilities + interests) and build affinity map.
 */
async function buildStudentAffinity(studentId, options = {}) {
  const {
    abilityWeight = 0.6,
    interestWeight = 0.4,
    minTrustedQuestions = 5
  } = options;

  // ✅ Pull fields needed for theta OR accuracy fallback
  const { data: abilities, error: aErr } = await supabase
    .from('student_abilities')
    .select(`
      subject_id,
      theta_estimate,
      total_questions_answered,
      correct_answers,
      accuracy_rate,
      confidence_level
    `)
    .eq('student_id', studentId);

  if (aErr) throw aErr;

  const { data: interests, error: iErr } = await supabase
    .from('student_interests')
    .select('subject_id, interest_score')
    .eq('student_id', studentId);

  if (iErr) throw iErr;

  const interestMap = new Map();
  (interests || []).forEach((r) => interestMap.set(r.subject_id, r));

  const affinityBySubjectId = new Map();
  const rawBySubjectId = new Map();

  for (const aRow of abilities || []) {
    const iRow = interestMap.get(aRow.subject_id);

    // ✅ interest fallback: missing interest should not be neutral 50
    const interest01 =
      normalizeInterest(iRow?.interest_score) ?? 0.35;

    const ability01 = computeAbility01({
      theta_estimate: aRow.theta_estimate,
      accuracy_rate: aRow.accuracy_rate,
      correct_answers: aRow.correct_answers,
      total_questions_answered: aRow.total_questions_answered
    });

    const affinity = computeSubjectAffinity({
      ability01,
      interest01,
      total_questions_answered: aRow.total_questions_answered,
      abilityWeight,
      interestWeight,
      minTrustedQuestions
    });

    affinityBySubjectId.set(aRow.subject_id, affinity);
    rawBySubjectId.set(aRow.subject_id, {
      subject_id: aRow.subject_id,
      ability01: ability01 ?? null,
      interest01,
      affinity,
      total_questions_answered: aRow.total_questions_answered ?? 0,
      correct_answers: aRow.correct_answers ?? null,
      accuracy_rate: aRow.accuracy_rate ?? null,
      theta_estimate: aRow.theta_estimate ?? null,
      confidence_level: aRow.confidence_level ?? null
    });
  }

  return { affinityBySubjectId, rawBySubjectId };
}

/**
 * Fetch degrees with their subject weights.
 */
async function fetchDegreesWithWeights() {
  const { data, error } = await supabase
    .from('degrees')
    .select(`
      id,
      code,
      name_he,
      name_en,
      is_active,
      degree_subject_weights (
        subject_id,
        weight
      )
    `)
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
}

/**
 * Fetch subjects for explanations.
 */
async function fetchSubjectsMap() {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name_en, name_he, name_ar');

  if (error) throw error;

  const map = new Map();
  (data || []).forEach((s) => map.set(s.id, s));
  return map;
}

/* ------------------------ Public API ------------------------------- */

export async function recommendTopDegrees(studentId, options = {}) {
  try {
    const limit = Number(options.limit ?? 5);
    const abilityWeight = Number(options.abilityWeight ?? 0.6);
    const interestWeight = Number(options.interestWeight ?? 0.4);
    const minTrustedQuestions = Number(options.minTrustedQuestions ?? 5);

    // 1) Build student affinities
    const { affinityBySubjectId } = await buildStudentAffinity(studentId, {
      abilityWeight,
      interestWeight,
      minTrustedQuestions
    });

    if (affinityBySubjectId.size === 0) {
      return { success: false, error: 'NO_ABILITY_DATA_FOR_STUDENT' };
    }

    // 2) Fetch degrees + weights + subjects
    const [degrees, subjectsMap] = await Promise.all([
      fetchDegreesWithWeights(),
      fetchSubjectsMap()
    ]);

    // 3) Score degrees
    const scored = [];

    for (const d of degrees) {
      const weights = d.degree_subject_weights || [];
      if (!weights.length) continue;

      let sum = 0;
      let weightSum = 0;

      const contributions = [];

      for (const w of weights) {
        const weight = Number(w.weight) || 0;
        if (weight <= 0) continue;

        // ✅ missing affinity should NOT be 0.5 (causes flat averages)
        const affinity = affinityBySubjectId.get(w.subject_id);
        const a = Number.isFinite(affinity) ? affinity : 0.35;

        const contribution = weight * a;

        sum += contribution;
        weightSum += weight;

        const subject = subjectsMap.get(w.subject_id);

        contributions.push({
          subject_id: w.subject_id,
          subject_name_en: subject?.name_en ?? null,
          subject_name_he: subject?.name_he ?? null,
          subject_name_ar: subject?.name_ar ?? null,
          contribution: Number(contribution.toFixed(6)),
          weight: Number(weight.toFixed(6)),
          affinity: Number(a.toFixed(6))
        });
      }

      if (weightSum <= 0) continue;

      // ✅ Normalize to 0..1 regardless of weight scale
      const normalizedScore = sum / weightSum;

      contributions.sort((x, y) => y.contribution - x.contribution);

      scored.push({
        degree_id: d.id,
        code: d.code,
        name_he: d.name_he,
        name_en: d.name_en,
        score: Number(normalizedScore.toFixed(6)),
        explanation: {
          top_subjects: contributions.slice(0, 3)
        }
      });
    }

    scored.sort((a, b) => b.score - a.score);

    return {
      success: true,
      data: scored.slice(0, clamp(limit, 1, 20))
    };
  } catch (error) {
    console.error('recommendTopDegrees error:', error);
    return { success: false, error: error.message };
  }
}

export async function recommendTopDegreesAfterSession(studentId, options = {}) {
  // Assumes abilities/interests were updated when the session finished
  return recommendTopDegrees(studentId, options);
}
