import { supabase } from '../config/supabase';

const BONUS_MIN = -5;
const BONUS_MAX = 16;

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function safeNum(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeGameKey(value) {
  return String(value || '').trim().toLowerCase().replace(/-/g, '_');
}

function titleCase(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const GAME_DISPLAY_LABELS = {
  arabic_poet_puzzle: 'Word Treasures',
  physics_lab: 'Physics Lab',
  physics_bridge_game: 'Physics Bridge',
  doctor_soroka: 'Doctor Soroka',
};

function gameDisplayLabel(gameKey) {
  const normalized = normalizeGameKey(gameKey);
  return GAME_DISPLAY_LABELS[normalized] || titleCase(normalized);
}

const DEGREE_CODE_ALIASES = {
  electrical_engineering: 'EE_BSC',
  electronics_engineering: 'EE_BSC',
  computer_engineering: 'SE_BSC',
  computer_science: 'CS_BSC',
  civil_engineering: 'CE_BSC',
  structural_engineering: 'CE_BSC',
  mechanical_engineering: 'ME_BSC',
  industrial_engineering: 'IE_BSC',
  engineering_management: 'IE_BSC',
  engineering: 'IE_BSC',
  architecture: 'ARCH_BARCH',
  industrial_design: 'DES_BDES',
  product_design: 'DES_BDES',
  business_management: 'BUS_BA',
  data_science: 'DATA_BSC',
  physics: 'PHYS_BSC',
  research_science: 'PHYS_BSC',
  robotics: 'ME_BSC',
  renewable_energy: 'PHYS_BSC',
  education: 'EDU_BED',
  law: 'LAW_LLB',
  media: 'COM_BA',
  nursing: 'NURS_BN',
  medical_sciences: 'medical_laboratory_science',
  life_sciences: 'BIO_BSC',
  biology: 'BIO_BSC',
  chemistry: 'CHEM_BSC',
  biotechnology: 'BIOTECH_BSC',
  social_work: 'SOCW_BSW',
  occupational_therapy: 'OT_BOT',
  emergency_medicine: 'medicine',
  paramedic_studies: 'NURS_BN',
  physiotherapy: 'PT_BPT',
  pharmacy: 'medical_laboratory_science',
};

export const GAME_TOPIC_MAPPINGS = {
  physics_bridge_game: {
    alias: ['physics_bridge', 'physics-bridge-game'],
    topics: {
      bridge_stability: {
        skill_tags: ['spatial_reasoning', 'force_distribution', 'engineering_planning'],
        related_subjects: ['physics', 'math'],
        related_degrees: ['civil_engineering', 'structural_engineering', 'architecture'],
        signal_weight: 1,
      },
      material_efficiency: {
        skill_tags: ['optimization', 'budget_thinking', 'engineering_planning'],
        related_subjects: ['math', 'physics'],
        related_degrees: ['industrial_engineering', 'civil_engineering', 'product_design'],
        signal_weight: 0.92,
      },
      force_distribution: {
        skill_tags: ['physics_reasoning', 'mechanical_reasoning', 'problem_solving'],
        related_subjects: ['physics', 'math'],
        related_degrees: ['mechanical_engineering', 'civil_engineering', 'physics'],
        signal_weight: 1,
      },
      creative_design: {
        skill_tags: ['creativity', 'spatial_reasoning', 'visual_planning'],
        related_subjects: ['art', 'physics', 'math'],
        related_degrees: ['architecture', 'industrial_design', 'civil_engineering'],
        signal_weight: 0.86,
      },
      budget_challenge: {
        skill_tags: ['planning', 'optimization', 'cost_control'],
        related_subjects: ['math'],
        related_degrees: ['industrial_engineering', 'engineering_management', 'business_management'],
        signal_weight: 0.8,
      },
    },
  },
  physics_lab: {
    alias: ['physics-lab'],
    topics: {
      motion_acceleration: {
        skill_tags: ['physics_reasoning', 'scientific_modeling', 'math_logic'],
        related_subjects: ['physics', 'math'],
        related_degrees: ['physics', 'mechanical_engineering', 'robotics'],
        signal_weight: 1,
      },
      distance_formula: {
        skill_tags: ['distance_calculation', 'math_logic', 'scientific_prediction'],
        related_subjects: ['physics', 'math'],
        related_degrees: ['physics', 'mechanical_engineering', 'data_science'],
        signal_weight: 1,
      },
      energy_work: {
        skill_tags: ['energy_reasoning', 'applied_physics', 'problem_solving'],
        related_subjects: ['physics', 'math'],
        related_degrees: ['mechanical_engineering', 'renewable_energy', 'physics'],
        signal_weight: 0.92,
      },
      data_reading: {
        skill_tags: ['graph_reading', 'data_analysis', 'logical_reasoning'],
        related_subjects: ['math', 'physics', 'computer_science'],
        related_degrees: ['data_science', 'computer_science', 'engineering'],
        signal_weight: 0.9,
      },
      scientific_prediction: {
        skill_tags: ['hypothesis_testing', 'scientific_reasoning', 'modeling'],
        related_subjects: ['physics', 'chemistry', 'math'],
        related_degrees: ['physics', 'research_science', 'engineering'],
        signal_weight: 0.86,
      },
    },
  },
  doctor_soroka: {
    alias: ['doctor-soroka'],
    topics: {
      diagnosis: {
        skill_tags: ['medical_reasoning', 'clinical_reading', 'decision_making'],
        related_subjects: ['biology', 'chemistry', 'hebrew'],
        related_degrees: ['medicine', 'nursing', 'medical_sciences'],
        signal_weight: 1,
      },
      lab_results_reading: {
        skill_tags: ['data_reading', 'biology_reasoning', 'chemistry_reasoning'],
        related_subjects: ['biology', 'chemistry'],
        related_degrees: ['medical_laboratory_science', 'biotechnology', 'chemistry', 'life_sciences'],
        signal_weight: 0.96,
      },
      patient_communication: {
        skill_tags: ['empathy', 'communication', 'hebrew_comprehension'],
        related_subjects: ['hebrew', 'biology'],
        related_degrees: ['nursing', 'social_work', 'education', 'occupational_therapy'],
        signal_weight: 0.86,
      },
      emergency_decision: {
        skill_tags: ['fast_decision', 'pressure_handling', 'medical_reasoning'],
        related_subjects: ['biology'],
        related_degrees: ['emergency_medicine', 'nursing', 'paramedic_studies'],
        signal_weight: 0.9,
      },
      anatomy_biology: {
        skill_tags: ['biology_knowledge', 'body_systems', 'memory'],
        related_subjects: ['biology'],
        related_degrees: ['biology', 'medicine', 'pharmacy', 'physiotherapy'],
        signal_weight: 0.92,
      },
    },
  },
  arabic_poet_puzzle: {
    alias: ['arabic-poet-puzzle'],
    topics: {
      vocabulary_meaning: {
        skill_tags: ['arabic_vocabulary', 'semantic_understanding'],
        related_subjects: ['arabic', 'literature'],
        related_degrees: ['arabic_language', 'translation', 'LIT_BA', 'LING_BA'],
        signal_weight: 1,
      },
      context_understanding: {
        skill_tags: ['reading_comprehension', 'semantic_reasoning', 'interpretation'],
        related_subjects: ['arabic', 'hebrew'],
        related_degrees: ['COM_BA', 'LAW_LLB', 'EDU_BED', 'translation', 'MIDEAST_BA'],
        signal_weight: 0.95,
      },
      fast_memory: {
        skill_tags: ['memory', 'focus', 'fast_recall'],
        related_subjects: ['arabic'],
        related_degrees: ['EDU_BED', 'ARABIC_EDU_BED', 'PSY_BA', 'LANG_BA'],
        signal_weight: 0.82,
      },
      story_expression: {
        skill_tags: ['writing', 'creativity', 'expression'],
        related_subjects: ['arabic', 'literature'],
        related_degrees: ['COM_BA', 'JOUR_BA', 'CW_BA', 'EDU_BED', 'ARABIC_EDU_BED'],
        signal_weight: 0.9,
      },
      word_logic: {
        skill_tags: ['linguistic_logic', 'pattern_recognition', 'semantic_analysis'],
        related_subjects: ['arabic', 'languages'],
        related_degrees: ['LING_BA', 'translation', 'EDU_BED', 'ARABIC_EDU_BED'],
        signal_weight: 0.9,
      },
    },
  },
};

function getMapping(gameId) {
  const key = normalizeGameKey(gameId);
  if (GAME_TOPIC_MAPPINGS[key]) return { gameKey: key, mapping: GAME_TOPIC_MAPPINGS[key] };
  const match = Object.entries(GAME_TOPIC_MAPPINGS).find(([, config]) =>
    (config.alias || []).map(normalizeGameKey).includes(key)
  );
  return match ? { gameKey: match[0], mapping: match[1] } : { gameKey: key, mapping: null };
}

function isMissingSchema(error) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || error?.code === '42703' || /does not exist|schema cache|could not find/i.test(message);
}

async function getActiveGameIds() {
  const { data, error } = await supabase.from('games').select('id, status');
  if (error) {
    if (isMissingSchema(error)) return null;
    throw error;
  }
  if (!data?.length) return null;
  return new Set((data || []).filter((row) => String(row.status || 'active') === 'active').map((row) => normalizeGameKey(row.id)));
}

async function getSessionActionStats(sessionId) {
  const { data, error } = await supabase
    .from('game_action_logs')
    .select('is_optimal, time_to_choose_ms, action_type, created_at')
    .eq('game_session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingSchema(error)) return { actions: [], total: 0, optimal: 0 };
    throw error;
  }

  const actions = data || [];
  const total = actions.length;
  const optimal = actions.filter((item) => item.is_optimal === true).length;
  const times = actions.map((item) => safeNum(item.time_to_choose_ms, NaN)).filter(Number.isFinite);
  const avgMs = times.length ? times.reduce((sum, value) => sum + value, 0) / times.length : null;
  return { actions, total, optimal, avgMs };
}

function deriveScores(session, stats) {
  const trust = safeNum(session?.trust_score, 0);
  const medical = safeNum(session?.medical_reasoning_score, 0);
  const hebrew = safeNum(session?.hebrew_score, 0);
  const engagement = clamp(safeNum(session?.engagement_score, 0));
  const interest = clamp(safeNum(session?.interest_signal, engagement));

  const fallbackAccuracy = clamp(Math.max(trust, medical, hebrew, interest));
  const actionAccuracy = stats.total ? clamp((stats.optimal / stats.total) * 100) : fallbackAccuracy;
  const accuracyScore = clamp(actionAccuracy);

  let timeEfficiencyScore = 70;
  if (stats.avgMs !== null) {
    const seconds = stats.avgMs / 1000;
    if (seconds < 2 && accuracyScore < 60) timeEfficiencyScore = 48;
    else if (seconds < 4) timeEfficiencyScore = accuracyScore >= 70 ? 82 : 62;
    else if (seconds <= 45) timeEfficiencyScore = 88;
    else if (seconds <= 90) timeEfficiencyScore = accuracyScore >= 70 ? 78 : 65;
    else timeEfficiencyScore = accuracyScore >= 70 ? 70 : 55;
  }

  const completionScore = String(session?.status) === 'completed' ? 100 : 40;
  const persistenceScore = clamp(Math.min(stats.total, 12) * 6 + completionScore * 0.25 + engagement * 0.25);
  const improvementScore = clamp(accuracyScore * 0.7 + persistenceScore * 0.3);
  const replayBonus = clamp(Math.min(safeNum(session?.metadata?.replayCount, 0), 3) * 8);
  const slowButSuccessBonus = stats.avgMs !== null && stats.avgMs > 45000 && accuracyScore >= 70 ? 18 : 0;
  const rushingPenalty = stats.avgMs !== null && stats.avgMs < 3500 && accuracyScore < 60 ? 18 : 0;
  const guessingSignal = rushingPenalty > 0 ? clamp(100 - accuracyScore) : 0;
  const deepThinkingSignal = slowButSuccessBonus > 0 ? clamp(accuracyScore + 10) : 0;

  const topicAbilitySignal = clamp(
    accuracyScore * 0.5 +
      improvementScore * 0.2 +
      timeEfficiencyScore * 0.15 +
      completionScore * 0.15 -
      rushingPenalty
  );

  const topicInterestSignal = clamp(
    engagement * 0.35 +
      persistenceScore * 0.25 +
      completionScore * 0.2 +
      replayBonus * 0.1 +
      slowButSuccessBonus * 0.1
  );

  return {
    accuracy_score: Math.round(accuracyScore),
    time_efficiency_score: Math.round(timeEfficiencyScore),
    persistence_score: Math.round(persistenceScore),
    improvement_score: Math.round(improvementScore),
    engagement_score: Math.round(engagement),
    completion_score: completionScore,
    replay_bonus: replayBonus,
    slow_but_success_bonus: slowButSuccessBonus,
    rushing_penalty: rushingPenalty,
    guessing_signal: guessingSignal,
    deep_thinking_signal: deepThinkingSignal,
    ability_signal: Math.round(topicAbilitySignal),
    interest_signal: Math.round(topicInterestSignal),
  };
}

function buildReason(topicKey, topic, degreeCodes) {
  const topicName = titleCase(topicKey);
  const degrees = degreeCodes.map(titleCase).join(', ');
  const skills = topic.skill_tags.slice(0, 2).map(titleCase).join(' و ');
  return {
    ar: `أداؤك في موضوع ${topicName} داخل اللعبة أظهر ${skills}، لذلك زادت ملاءمتك لمسارات مثل ${degrees}.`,
    he: `הביצועים שלך בנושא ${topicName} במשחק חיזקו מיומנויות כמו ${skills}, ולכן עלתה ההתאמה למסלולים כמו ${degrees}.`,
    en: `Your performance in ${topicName} showed ${skills}, increasing fit for paths such as ${degrees}.`,
  };
}

async function getDegreeMapByCode() {
  const { data, error } = await supabase.from('degrees').select('id, code, name_ar, name_he, name_en').eq('is_active', true);
  if (error) {
    if (isMissingSchema(error)) return new Map();
    throw error;
  }
  const map = new Map();
  (data || []).forEach((degree) => {
    if (degree.code) map.set(normalizeGameKey(degree.code), degree);
  });
  Object.entries(DEGREE_CODE_ALIASES).forEach(([aliasCode, canonicalCode]) => {
    const canonicalDegree = map.get(normalizeGameKey(canonicalCode));
    if (canonicalDegree) map.set(normalizeGameKey(aliasCode), canonicalDegree);
  });
  return map;
}

export async function processCompletedGameSession(sessionOrId) {
  const session =
    typeof sessionOrId === 'string'
      ? (await supabase.from('game_sessions').select('*').eq('id', sessionOrId).maybeSingle()).data
      : sessionOrId;

  if (!session?.id || !session?.student_id || session.status !== 'completed') {
    return { success: true, skipped: true, reason: 'not_completed' };
  }

  const { gameKey, mapping } = getMapping(session.game_id);
  if (!mapping) return { success: true, skipped: true, reason: 'unmapped_game' };

  try {
    const activeGameIds = await getActiveGameIds();
    if (activeGameIds && !activeGameIds.has(gameKey) && !activeGameIds.has(normalizeGameKey(session.game_id))) {
      return { success: true, skipped: true, reason: 'inactive_game' };
    }

    const [stats, degreeMap] = await Promise.all([getSessionActionStats(session.id), getDegreeMapByCode()]);
    const baseScores = deriveScores(session, stats);
    const now = new Date().toISOString();
    const skillRows = [];
    const interestRows = [];
    const careerRows = [];
    const missingDegrees = [];

    Object.entries(mapping.topics).forEach(([topicKey, topic]) => {
      const topicMod = topicKey.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 9;
      const abilitySignal = clamp(baseScores.ability_signal + topicMod - 4);
      const interestSignal = clamp(baseScores.interest_signal + Math.round(topic.signal_weight * 4) - 2);
      const relatedDegreeCodes = topic.related_degrees || [];
      const reason = buildReason(topicKey, topic, relatedDegreeCodes);
      const metadata = {
        game_key: gameKey,
        topic_key: topicKey,
        related_degrees: relatedDegreeCodes,
        skill_tags: topic.skill_tags,
        related_subjects: topic.related_subjects,
        ability_signal: abilitySignal,
        interest_signal: interestSignal,
        reason_ar: reason.ar,
        reason_he: reason.he,
        reason_en: reason.en,
        scores: baseScores,
        action_count: stats.total,
      };

      (topic.skill_tags || []).forEach((skillTag) => {
        skillRows.push({
          student_id: session.student_id,
          game_session_id: session.id,
          game_key: gameKey,
          topic_key: topicKey,
          skill_tag: skillTag,
          ability_signal: abilitySignal,
          interest_signal: interestSignal,
          signal_strength: Math.round((abilitySignal + interestSignal) / 2),
          metadata,
          updated_at: now,
        });
      });

      (topic.related_subjects || []).forEach((subject) => {
        interestRows.push({
          student_id: session.student_id,
          game_session_id: session.id,
          game_key: gameKey,
          topic_key: topicKey,
          related_subject: subject,
          ability_signal: abilitySignal,
          interest_signal: interestSignal,
          signal_weight: topic.signal_weight,
          metadata,
          updated_at: now,
        });
      });

      relatedDegreeCodes.forEach((degreeCode) => {
        const degree = degreeMap.get(normalizeGameKey(degreeCode));
        if (!degree) missingDegrees.push(degreeCode);
        careerRows.push({
          student_id: session.student_id,
          game_session_id: session.id,
          game_key: gameKey,
          topic_key: topicKey,
          degree_code: degreeCode,
          degree_id: degree?.id || null,
          ability_signal: abilitySignal,
          interest_signal: interestSignal,
          signal_weight: topic.signal_weight,
          career_signal: Math.round((abilitySignal + interestSignal) * topic.signal_weight),
          metadata: { ...metadata, missing_degree: !degree },
          updated_at: now,
        });
      });
    });

    const writes = [];
    if (skillRows.length) {
      writes.push(
        supabase
          .from('student_game_skills')
          .upsert(skillRows, { onConflict: 'student_id,game_session_id,topic_key,skill_tag' })
      );
    }
    if (interestRows.length) {
      writes.push(
        supabase
          .from('student_game_interests')
          .upsert(interestRows, { onConflict: 'student_id,game_session_id,topic_key,related_subject' })
      );
    }
    if (careerRows.length) {
      writes.push(
        supabase
          .from('student_career_signals')
          .upsert(careerRows, { onConflict: 'student_id,game_session_id,topic_key,degree_code' })
      );
    }

    const results = await Promise.all(writes);
    const writeError = results.find((result) => result.error)?.error;
    if (writeError) throw writeError;

    if (missingDegrees.length) {
      console.warn('Missing degree codes for game career signals:', [...new Set(missingDegrees)]);
    }

    return {
      success: true,
      gameKey,
      topics: Object.keys(mapping.topics).length,
      careerSignals: careerRows.length,
      missingDegrees: [...new Set(missingDegrees)],
    };
  } catch (error) {
    if (isMissingSchema(error)) return { success: false, skipped: true, error: error.message, missingSchema: true };
    return { success: false, error: error.message };
  }
}

export async function refreshStudentGameCareerSignals(studentId) {
  if (!studentId) return { success: false, error: 'studentId is required' };

  try {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    const results = [];
    for (const session of data || []) {
      results.push(await processCompletedGameSession(session));
    }
    return { success: true, processed: results.filter((item) => item.success && !item.skipped).length, results };
  } catch (error) {
    if (isMissingSchema(error)) return { success: false, missingSchema: true, error: error.message };
    return { success: false, error: error.message };
  }
}

export async function getStudentGameCareerSignalSummary(studentId, { limit = 6 } = {}) {
  if (!studentId) return { skills: [], topics: [], degrees: [], explanations: [] };

  try {
    await refreshStudentGameCareerSignals(studentId).catch(() => null);

    const [skillsRes, careerRes] = await Promise.all([
      supabase
        .from('student_game_skills')
        .select('skill_tag, signal_strength, ability_signal, interest_signal, metadata')
        .eq('student_id', studentId)
        .order('signal_strength', { ascending: false })
        .limit(100),
      supabase
        .from('student_career_signals')
        .select('degree_id, degree_code, career_signal, ability_signal, interest_signal, metadata, degrees(name_ar, name_he, name_en, code)')
        .eq('student_id', studentId)
        .not('degree_id', 'is', null)
        .order('career_signal', { ascending: false })
        .limit(150),
    ]);

    if (skillsRes.error) throw skillsRes.error;
    if (careerRes.error) throw careerRes.error;

    const skillMap = new Map();
    const skillByGameMap = new Map();
    (skillsRes.data || []).forEach((row) => {
      const current = skillMap.get(row.skill_tag) || { skill_tag: row.skill_tag, score: 0, count: 0 };
      skillMap.set(row.skill_tag, {
        ...current,
        score: current.score + safeNum(row.signal_strength),
        count: current.count + 1,
      });

      const gameKey = row.metadata?.game_key || 'game';
      const gameSkillKey = `${gameKey}:${row.skill_tag}`;
      const gameCurrent = skillByGameMap.get(gameSkillKey) || {
        game_key: gameKey,
        skill_tag: row.skill_tag,
        score: 0,
        count: 0,
      };
      skillByGameMap.set(gameSkillKey, {
        ...gameCurrent,
        score: gameCurrent.score + safeNum(row.signal_strength),
        count: gameCurrent.count + 1,
      });
    });

    const topicMap = new Map();
    const degreeMap = new Map();
    const explanationByGame = new Map();

    (careerRes.data || []).forEach((row) => {
      const topicKey = row.metadata?.topic_key || row.topic_key;
      const gameKey = row.metadata?.game_key || 'game';
      if (topicKey) {
        const current = topicMap.get(topicKey) || { topic_key: topicKey, score: 0, count: 0, metadata: row.metadata };
        topicMap.set(topicKey, {
          ...current,
          score: current.score + safeNum(row.career_signal),
          count: current.count + 1,
        });
      }

      const degreeKey = row.degree_id || row.degree_code;
      const current = degreeMap.get(degreeKey) || { ...row, score: 0, count: 0 };
      degreeMap.set(degreeKey, {
        ...current,
        score: current.score + safeNum(row.career_signal),
        count: current.count + 1,
      });

      if (row.metadata?.reason_ar) {
        const current = explanationByGame.get(gameKey);
        if (!current || safeNum(row.career_signal) > safeNum(current.career_signal)) {
          explanationByGame.set(gameKey, {
            ...row.metadata,
            game_key: gameKey,
            career_signal: row.career_signal,
          });
        }
      }
    });

    const perGameSkills = [...skillByGameMap.values()]
      .map((item) => ({
        ...item,
        key: `${item.game_key}:${item.skill_tag}`,
        label: `${gameDisplayLabel(item.game_key)}: ${titleCase(item.skill_tag)}`,
        score: Math.round(item.score / Math.max(1, item.count)),
      }))
      .sort((a, b) => b.score - a.score);

    const topSkillByGame = [];
    const seenGames = new Set();
    perGameSkills.forEach((item) => {
      if (!seenGames.has(item.game_key)) {
        seenGames.add(item.game_key);
        topSkillByGame.push(item);
      }
    });

    const globalSkills = [...skillMap.values()]
      .map((item) => ({ ...item, key: `global:${item.skill_tag}`, label: titleCase(item.skill_tag), score: Math.round(item.score / Math.max(1, item.count)) }))
      .sort((a, b) => b.score - a.score);

    const skills = [...topSkillByGame];
    globalSkills.forEach((item) => {
      if (!skills.some((skill) => skill.skill_tag === item.skill_tag)) {
        skills.push(item);
      }
    });

    const explanations = [...explanationByGame.values()]
      .sort((a, b) => safeNum(b.career_signal) - safeNum(a.career_signal))
      .slice(0, limit);

    return {
      skills: skills.slice(0, limit),
      topics: [...topicMap.values()]
        .map((item) => ({ ...item, label: titleCase(item.topic_key), score: Math.round(item.score / Math.max(1, item.count)) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit),
      degrees: [...degreeMap.values()]
        .map((item) => ({
          degree_id: item.degree_id,
          degree_code: item.degree_code,
          name_ar: item.degrees?.name_ar,
          name_he: item.degrees?.name_he,
          name_en: item.degrees?.name_en,
          score: Math.round(item.score / Math.max(1, item.count)),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit),
      explanations,
    };
  } catch (error) {
    if (isMissingSchema(error)) return { skills: [], topics: [], degrees: [], explanations: [], missingSchema: true };
    return { skills: [], topics: [], degrees: [], explanations: [], error: error.message };
  }
}

export async function getGameCareerBonusByDegree(studentId) {
  if (!studentId) return new Map();

  try {
    await refreshStudentGameCareerSignals(studentId);

    const { data, error } = await supabase
      .from('student_career_signals')
      .select('degree_id, game_session_id, career_signal, ability_signal, interest_signal, metadata')
      .eq('student_id', studentId)
      .not('degree_id', 'is', null);

    if (error) throw error;

    const grouped = new Map();
    (data || []).forEach((row) => {
      if (!row.degree_id) return;
      const current = grouped.get(row.degree_id) || { signals: [], explanations: [], sessions: new Set() };
      current.signals.push(safeNum(row.career_signal));
      if (row.game_session_id) current.sessions.add(row.game_session_id);
      if (row.metadata?.reason_ar) current.explanations.push(row.metadata);
      grouped.set(row.degree_id, current);
    });

    const bonusMap = new Map();
    grouped.forEach((group, degreeId) => {
      const average = group.signals.reduce((sum, value) => sum + value, 0) / Math.max(1, group.signals.length);
      const completedSessionCount = group.sessions?.size || 1;
      const difficultyMultiplier = group.explanations.some((item) => item?.game_key === 'arabic_poet_puzzle') ? 1.18 : 1;
      const strengthBonus = ((average - 95) / 8) * difficultyMultiplier;
      const playDepthBonus = Math.min(
        4,
        Math.max(0, completedSessionCount - 1) * 1.1 + Math.log1p(completedSessionCount) * 0.9
      );
      const bonus = clamp(strengthBonus + playDepthBonus, BONUS_MIN, BONUS_MAX);
      bonusMap.set(degreeId, {
        bonusPercent: Math.round(bonus * 10) / 10,
        averageSignal: Math.round(average),
        completedSessionCount,
        explanations: group.explanations.slice(0, 3),
      });
    });
    return bonusMap;
  } catch (error) {
    if (!isMissingSchema(error)) console.warn('Failed to load game career bonus:', error.message);
    return new Map();
  }
}

export function applyGameBonusToScore01(score01, bonusPercent = 0) {
  return clamp(safeNum(score01, 0) * 100 + clamp(bonusPercent, BONUS_MIN, BONUS_MAX), 0, 100) / 100;
}

export default {
  GAME_TOPIC_MAPPINGS,
  processCompletedGameSession,
  refreshStudentGameCareerSignals,
  getStudentGameCareerSignalSummary,
  getGameCareerBonusByDegree,
  applyGameBonusToScore01,
};
