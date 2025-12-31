// services/degreeMatchService.js
//
// Degree matching service (Ability 40% + Personality 40% + Interest 20%)
// Returns TOP degrees with explanations.
//
// UI goals:
// - No 100% displayed (cap top to maxDisplay, default 94)
// - Top results are closer (5–10%) not 1–4% and not too far
// - Keep meaningful separation overall
//
// Core behavior:
// - Moderate mismatch penalty
// - Soft spread/contrast (gamma ~1.35)

import { supabase } from '../config/supabase';
import { getStudentPersonalityProfile } from './personalityTestService';

/* ----------------------------- helpers ----------------------------- */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function clamp01(x) {
  return clamp(x, 0, 1);
}

function safeNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function round6(x) {
  return Math.round(Number(x) * 1e6) / 1e6;
}

function normalizeInterest(score0to100) {
  const s = safeNumber(score0to100, NaN);
  if (!Number.isFinite(s)) return null;
  return clamp(s / 100, 0, 1);
}

function normalizeTheta(theta, min = -3, max = 3) {
  const t = safeNumber(theta, NaN);
  if (!Number.isFinite(t)) return null;
  const x = (t - min) / (max - min);
  return clamp(x, 0, 1);
}

function normalizeAccuracy(acc) {
  if (acc === null || acc === undefined) return null;
  const a = safeNumber(acc, NaN);
  if (!Number.isFinite(a)) return null;

  if (a > 1.001) return clamp(a / 100, 0, 1);
  return clamp(a, 0, 1);
}

function reliabilityFactor(totalQuestionsAnswered, minTrustedQuestions = 5) {
  const n = safeNumber(totalQuestionsAnswered, 0);
  if (n >= minTrustedQuestions) return 1.0;
  const t = clamp(n / minTrustedQuestions, 0, 1);
  return 0.7 + 0.3 * t;
}

function computeAbility01({
  theta_estimate,
  accuracy_rate,
  correct_answers,
  total_questions_answered,
}) {
  if (theta_estimate !== null && theta_estimate !== undefined) {
    return normalizeTheta(theta_estimate);
  }

  const accNorm = normalizeAccuracy(accuracy_rate);
  if (accNorm !== null) return accNorm;

  const correct = safeNumber(correct_answers, NaN);
  const total = safeNumber(total_questions_answered, NaN);
  if (Number.isFinite(correct) && Number.isFinite(total) && total > 0) {
    return clamp(correct / total, 0, 1);
  }

  return null;
}

/* -------------------- personality smart getters -------------------- */

function getTraitCode(row) {
  const v =
    row?.trait_code ??
    row?.dimension_code ??
    row?.personality_code ??
    row?.code ??
    row?.trait ??
    null;

  if (!v) return null;
  const s = String(v).trim().toUpperCase();
  return ['O', 'C', 'E', 'A', 'N'].includes(s) ? s : null;
}

function getTraitTarget(row) {
  const v =
    row?.target_score ??
    row?.target ??
    row?.ideal_score ??
    row?.ideal ??
    row?.value ??
    row?.score ??
    null;

  const n = safeNumber(v, NaN);
  return Number.isFinite(n) ? clamp(n, 0, 100) : null;
}

function getTraitWeight(row) {
  const v = row?.weight ?? row?.importance ?? row?.coefficient ?? 1;
  const n = safeNumber(v, 1);
  return n > 0 ? n : 0;
}

function closeness01(studentScore0to100, target0to100) {
  const s = safeNumber(studentScore0to100, NaN);
  const t = safeNumber(target0to100, NaN);
  if (!Number.isFinite(s) || !Number.isFinite(t)) return null;
  const diff = Math.abs(s - t);
  return clamp(1 - diff / 100, 0, 1);
}

/* ----------------------- strictness / shaping ---------------------- */

function applyMismatchPenalty(final01, ability01, personality01, cfg = {}) {
  const {
    abilityMin = 0.47,
    personalityMin = 0.50,
    abilityStrength = 0.35,
    personalityStrength = 0.35,
    maxPenalty = 0.10,
  } = cfg;

  const a = Number.isFinite(ability01) ? ability01 : 0.35;
  const p = Number.isFinite(personality01) ? personality01 : 0.35;

  const aShort = Math.max(0, abilityMin - a);
  const pShort = Math.max(0, personalityMin - p);

  const penalty = Math.min(maxPenalty, abilityStrength * aShort + personalityStrength * pShort);
  return clamp01(final01 - penalty);
}

function spreadScoresSoft(items, cfg = {}) {
  const { gamma = 1.35, keepRaw = true, epsilon = 1e-9 } = cfg;
  if (!Array.isArray(items) || items.length === 0) return items;

  const raw = items.map((x) => safeNumber(x.score, 0));
  const min = Math.min(...raw);
  const max = Math.max(...raw);
  const range = Math.max(epsilon, max - min);

  return items.map((it) => {
    const s = safeNumber(it.score, 0);
    const norm = clamp01((s - min) / range);
    const stretched = clamp01(Math.pow(norm, gamma));

    const out = { ...it, score: round6(stretched) };
    if (keepRaw) out.raw_score = round6(s);
    return out;
  });
}

/**
 * Display percent mapping:
 * - never show 100 (cap at maxDisplay, default 94)
 * - compress top a bit so top 3 are closer (typically 5–10% gaps)
 *
 * How it works:
 * - normalize scores within this student => 0..1
 * - apply powerTop (<1) to compress the top region
 * - map into [minDisplay..maxDisplay]
 * - hard cap at maxDisplay (so even #1 is maxDisplay, not 100)
 */
function applyCappedPercentWithTopCompression(items, cfg = {}) {
  const {
    minDisplay = 68,
    maxDisplay = 94, // <- no 100%
    powerTop = 0.75, // <- compress top (0.70..0.85 good range)
  } = cfg;

  if (!Array.isArray(items) || items.length === 0) return items;

  const scores = items.map((x) => safeNumber(x.score, 0));
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = Math.max(1e-9, max - min);

  return items.map((it) => {
    const s = safeNumber(it.score, 0);
    let norm = clamp01((s - min) / range); // 0..1

    // compress near top => top 3 closer
    norm = Math.pow(norm, powerTop);

    const display = minDisplay + norm * (maxDisplay - minDisplay);
    const capped = Math.min(maxDisplay, display);

    return {
      ...it,
      score_percent: Number(capped.toFixed(0)),
    };
  });
}

/* ----------------------------- core blocks ----------------------------- */

async function buildStudentSignalsBySubject(studentId, options = {}) {
  const { minTrustedQuestions = 5 } = options;

  const { data: abilities, error: aErr } = await supabase
    .from('student_abilities')
    .select(`
      subject_id,
      theta_estimate,
      total_questions_answered,
      correct_answers,
      accuracy_rate
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

  const abilityBySubjectId = new Map();
  const interestBySubjectId = new Map();
  const metaBySubjectId = new Map();

  for (const aRow of abilities || []) {
    const interestRow = interestMap.get(aRow.subject_id);

    const rawAbility01 = computeAbility01({
      theta_estimate: aRow.theta_estimate,
      accuracy_rate: aRow.accuracy_rate,
      correct_answers: aRow.correct_answers,
      total_questions_answered: aRow.total_questions_answered,
    });

    const rel = reliabilityFactor(aRow.total_questions_answered, minTrustedQuestions);

    const ability01 = Number.isFinite(rawAbility01) ? rawAbility01 : 0.35;
    abilityBySubjectId.set(aRow.subject_id, clamp01(ability01 * rel));

    const rawInterest01 = normalizeInterest(interestRow?.interest_score);
    const interest01 = Number.isFinite(rawInterest01) ? rawInterest01 : 0.35;
    interestBySubjectId.set(aRow.subject_id, clamp01(interest01 * rel));

    metaBySubjectId.set(aRow.subject_id, {
      total_questions_answered: safeNumber(aRow.total_questions_answered, 0),
      reliability: round6(rel),
    });
  }

  return { abilityBySubjectId, interestBySubjectId, metaBySubjectId };
}

function computeDegreeSubjectScore({
  degreeSubjectWeights,
  signalBySubjectId,
  subjectsMap,
  fallbackSignal = 0.35,
}) {
  const weights = degreeSubjectWeights || [];
  if (!weights.length) return { score01: fallbackSignal, contributions: [] };

  let sum = 0;
  let wsum = 0;
  const contributions = [];

  for (const wRow of weights) {
    const w = safeNumber(wRow.weight, 0);
    if (w <= 0) continue;

    const signal = signalBySubjectId.get(wRow.subject_id);
    const s = Number.isFinite(signal) ? signal : fallbackSignal;

    sum += w * s;
    wsum += w;

    const subj = subjectsMap.get(wRow.subject_id);
    contributions.push({
      subject_id: wRow.subject_id,
      subject_name_en: subj?.name_en ?? null,
      subject_name_he: subj?.name_he ?? null,
      subject_name_ar: subj?.name_ar ?? null,
      weight: Number(round6(w)),
      signal: Number(round6(s)),
      contribution: Number(round6(w * s)),
    });
  }

  if (wsum <= 0) return { score01: fallbackSignal, contributions: [] };

  contributions.sort((a, b) => b.contribution - a.contribution);

  return {
    score01: clamp01(sum / wsum),
    contributions,
  };
}

function computeDegreePersonalityScore({
  degreePersonalityRows,
  studentTraits0to100,
  fallbackScore01 = 0.35,
}) {
  const rows = degreePersonalityRows || [];
  if (!rows.length || !studentTraits0to100) {
    return { score01: fallbackScore01, contributions: [] };
  }

  let sum = 0;
  let wsum = 0;
  const contributions = [];

  for (const r of rows) {
    const trait = getTraitCode(r);
    if (!trait) continue;

    const target = getTraitTarget(r);
    if (target === null) continue;

    const w = getTraitWeight(r);
    if (w <= 0) continue;

    const studentVal = studentTraits0to100[trait];
    const close = closeness01(studentVal, target);
    if (close === null) continue;

    sum += w * close;
    wsum += w;

    contributions.push({
      trait,
      student: safeNumber(studentVal, 0),
      target,
      weight: Number(round6(w)),
      closeness: Number(round6(close)),
      contribution: Number(round6(w * close)),
    });
  }

  if (wsum <= 0) return { score01: fallbackScore01, contributions: [] };

  contributions.sort((a, b) => b.contribution - a.contribution);

  return {
    score01: clamp01(sum / wsum),
    contributions,
  };
}

/* ----------------------------- main API ----------------------------- */

export async function recommendTopDegreesWithPersonality(studentId, options = {}) {
  try {
    if (!studentId) throw new Error('studentId is required');

    const {
      limit = 5,
      weights = { ability: 0.4, personality: 0.4, interest: 0.2 },
      minTrustedQuestions = 5,
      onlyActiveDegrees = true,

      strict = {
        mismatch: {
          abilityMin: 0.47,
          personalityMin: 0.50,
          abilityStrength: 0.35,
          personalityStrength: 0.35,
          maxPenalty: 0.10,
        },
        spread: {
          gamma: 1.35,
        },
        display: {
          minDisplay: 68,
          maxDisplay: 94, // never 100
          powerTop: 0.75, // top 3 closer (tune 0.70..0.85)
        },
      },
    } = options;

    // Normalize weights
    const wa = safeNumber(weights.ability, 0.4);
    const wp = safeNumber(weights.personality, 0.4);
    const wi = safeNumber(weights.interest, 0.2);
    const wsum = wa + wp + wi || 1;

    const W = {
      ability: wa / wsum,
      personality: wp / wsum,
      interest: wi / wsum,
    };

    // 1) Fetch degrees + subject weights
    let degreeQuery = supabase
      .from('degrees')
      .select(`
        id,
        code,
        name_en,
        name_ar,
        name_he,
        category,
        is_active,
        degree_subject_weights (
          subject_id,
          weight
        )
      `);

    if (onlyActiveDegrees) degreeQuery = degreeQuery.eq('is_active', true);

    const { data: degrees, error: dErr } = await degreeQuery;
    if (dErr) throw dErr;

    // 2) Fetch all personality weights
    const { data: dpwRows, error: pErr } = await supabase
      .from('degree_personality_weights')
      .select('*');

    if (pErr) throw pErr;

    const personalityByDegreeId = new Map();
    (dpwRows || []).forEach((r) => {
      const did = r.degree_id;
      if (!did) return;
      if (!personalityByDegreeId.has(did)) personalityByDegreeId.set(did, []);
      personalityByDegreeId.get(did).push(r);
    });

    // 3) Subjects map
    const { data: subjects, error: sErr } = await supabase
      .from('subjects')
      .select('id, name_en, name_ar, name_he');

    if (sErr) throw sErr;

    const subjectsMap = new Map();
    (subjects || []).forEach((s) => subjectsMap.set(s.id, s));

    // 4) Student signals
    const { abilityBySubjectId, interestBySubjectId, metaBySubjectId } =
      await buildStudentSignalsBySubject(studentId, { minTrustedQuestions });

    // 5) Student personality
    let studentTraits0to100 = null;
    const personalityRes = await getStudentPersonalityProfile(studentId);
    if (personalityRes?.success && personalityRes.profile) {
      const p = personalityRes.profile;
      studentTraits0to100 = {
        O: clamp(safeNumber(p.openness, 0), 0, 100),
        C: clamp(safeNumber(p.conscientiousness, 0), 0, 100),
        E: clamp(safeNumber(p.extraversion, 0), 0, 100),
        A: clamp(safeNumber(p.agreeableness, 0), 0, 100),
        N: clamp(safeNumber(p.neuroticism, 0), 0, 100),
      };
    }

    // 6) Score degrees
    const scored = [];

    for (const d of degrees || []) {
      const subjWeights = d.degree_subject_weights || [];
      if (!subjWeights.length) continue;

      const abilityPart = computeDegreeSubjectScore({
        degreeSubjectWeights: subjWeights,
        signalBySubjectId: abilityBySubjectId,
        subjectsMap,
        fallbackSignal: 0.35,
      });

      const interestPart = computeDegreeSubjectScore({
        degreeSubjectWeights: subjWeights,
        signalBySubjectId: interestBySubjectId,
        subjectsMap,
        fallbackSignal: 0.35,
      });

      const dpw = personalityByDegreeId.get(d.id) || [];
      const personalityPart = computeDegreePersonalityScore({
        degreePersonalityRows: dpw,
        studentTraits0to100,
        fallbackScore01: 0.35,
      });

      let finalScore01 =
        W.ability * abilityPart.score01 +
        W.personality * personalityPart.score01 +
        W.interest * interestPart.score01;

      finalScore01 = applyMismatchPenalty(
        finalScore01,
        abilityPart.score01,
        personalityPart.score01,
        strict?.mismatch
      );

      scored.push({
        degree_id: d.id,
        code: d.code,
        name_en: d.name_en,
        name_ar: d.name_ar,
        name_he: d.name_he,
        category: d.category,
        score: round6(finalScore01),

        breakdown: {
          ability: {
            weight: Number(W.ability.toFixed(4)),
            score: round6(abilityPart.score01),
            top_subjects: abilityPart.contributions.slice(0, 3),
          },
          interest: {
            weight: Number(W.interest.toFixed(4)),
            score: round6(interestPart.score01),
            top_subjects: interestPart.contributions.slice(0, 3),
          },
          personality: {
            weight: Number(W.personality.toFixed(4)),
            score: round6(personalityPart.score01),
            top_traits: personalityPart.contributions.slice(0, 3),
            student_traits: studentTraits0to100,
          },
          meta: {
            subjects: abilityPart.contributions.slice(0, 4).map((c) => {
              const meta = metaBySubjectId.get(c.subject_id);
              return {
                subject_id: c.subject_id,
                reliability: meta?.reliability ?? null,
                total_questions_answered: meta?.total_questions_answered ?? null,
              };
            }),
          },
        },
      });
    }

    // Soft spread (more separation, not extreme)
    let post = spreadScoresSoft(scored, strict?.spread);

    // Sort
    post.sort((a, b) => b.score - a.score);

    // Display percent (no 100, top compressed)
    post = applyCappedPercentWithTopCompression(post, strict?.display);

    return {
      success: true,
      data: post.slice(0, clamp(limit, 1, 20)),
      usedWeights: W,
      hasPersonalityProfile: !!studentTraits0to100,
      strictUsed: {
        mismatch: strict?.mismatch ?? null,
        spread: strict?.spread ?? null,
        display: strict?.display ?? null,
      },
    };
  } catch (error) {
    console.error('recommendTopDegreesWithPersonality error:', error);
    return { success: false, error: error.message };
  }
}

export default {
  recommendTopDegreesWithPersonality,
};
