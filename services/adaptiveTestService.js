import { supabase } from '../config/supabase';
import { buildBehaviorSignals } from '../features/games/shared/utils/gameAnalytics';
import { getNextDiverseQuestion } from '../src/services/questionSelectionService';
import { recommendTopDegreesAfterSession } from './recommendationService';

/* -------------------------------------------------- */
/* CONFIG                                              */
/* -------------------------------------------------- */

// ✅ Recommended defaults (can be overridden from UI)
const DEFAULT_MIN_Q = 5;
const DEFAULT_MAX_Q = 7;

// Stop rule thresholds
const CONFIDENCE_STOP_AT = 75; // 0..100
const SE_STOP_AT = 0.20;

const QUESTION_POOL_LIMIT = 200;

/**
 * ✅ FAST difficulty ramp (DB difficulty scale is -3..3)
 * You asked: 1 -> 2 -> 4 -> 8 -> 10 (fast increase)
 * Since DB uses -3..3, we implement a fast ramp like:
 *  Q1: -1.0
 *  Q2:  0.0
 *  Q3:  1.2
 *  Q4:  2.2
 *  Q5:  2.8
 *  Q6:  3.0
 *  Q7:  3.0
 *
 * Then we adapt it using performance:
 *  - Correct => increase faster
 *  - Wrong   => decrease a bit (to avoid frustration)
 */
const FAST_RAMP_TARGETS = [-1.0, 0.0, 1.2, 2.2, 2.8, 3.0, 3.0];

// How much to push/pull difficulty after each answer
const DIFF_STEP_UP = 0.45;
const DIFF_STEP_DOWN = 0.75;

// Safety bounds (matches your DB constraint)
const DIFF_MIN = -3.0;
const DIFF_MAX = 3.0;

// How tight we pick around target initially (widen if pool is small)
const DIFF_BAND_START = 0.35;
const DIFF_BAND_WIDEN = [0.75, 1.25, 2.0, 3.0];

// Optional: prevent “too hard too soon” before reaching minQ
const HOLD_HARD_CAP_UNTIL_MINQ = true;
const HARD_CAP_BEFORE_MINQ = 2.2;

/* -------------------------------------------------- */
/* HELPERS                                             */
/* -------------------------------------------------- */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeLang(language) {
  const lang = String(language || 'ar').toLowerCase();
  return lang === 'he' ? 'he' : 'ar';
}

function ensureArray(x) {
  return Array.isArray(x) ? x : [];
}

function paceBucket(seconds) {
  const value = safeNum(seconds, 0);
  if (value <= 0) return 'unknown';
  if (value <= 8) return 'fast';
  if (value <= 35) return 'steady';
  if (value <= 60) return 'slow';
  return 'very_slow';
}

function questionAnalysisMeta(question = {}) {
  return {
    questionId: question.id || null,
    subjectId: question.subject_id || null,
    difficulty: safeNum(question.difficulty, null),
    cognitiveLevel: question.cognitive_level || null,
    questionType: question.question_type || null,
    targetLanguage: question.target_language || null,
  };
}

function appendLimited(list, value, limit = 40) {
  return [...ensureArray(list), value].slice(-limit);
}

function buildNextSubjectAnalysisMeta({ state, question, isCorrect, timeTakenSeconds, nextAnswered, nextCorrect }) {
  const previousAnalysis = state.analysis || {};
  const pace = paceBucket(timeTakenSeconds);
  const previousPattern = ensureArray(previousAnalysis.answerPattern);
  const previousPaceCounts = previousAnalysis.paceCounts || {};
  const currentCorrectStreak = isCorrect ? safeNum(previousAnalysis.correctStreak, 0) + 1 : 0;
  const currentWrongStreak = isCorrect ? 0 : safeNum(previousAnalysis.wrongStreak, 0) + 1;
  const responseTimes = appendLimited(previousAnalysis.responseTimesSeconds, safeNum(timeTakenSeconds, 0));
  const avgResponseSeconds = responseTimes.length
    ? Math.round(responseTimes.reduce((sum, value) => sum + safeNum(value, 0), 0) / responseTimes.length)
    : 0;

  return {
    ...previousAnalysis,
    lastQuestion: questionAnalysisMeta(question),
    lastPace: pace,
    avgResponseSeconds,
    responseTimesSeconds: responseTimes,
    answerPattern: appendLimited(previousPattern, isCorrect ? 'correct' : 'wrong'),
    difficultyTrail: appendLimited(previousAnalysis.difficultyTrail, safeNum(question.difficulty, null)),
    paceCounts: {
      ...previousPaceCounts,
      [pace]: safeNum(previousPaceCounts[pace], 0) + 1,
    },
    correctStreak: currentCorrectStreak,
    wrongStreak: currentWrongStreak,
    recoveryAfterMistake:
      isCorrect && previousPattern[previousPattern.length - 1] === 'wrong'
        ? safeNum(previousAnalysis.recoveryAfterMistake, 0) + 1
        : safeNum(previousAnalysis.recoveryAfterMistake, 0),
    accuracy: nextAnswered ? Math.round((nextCorrect / nextAnswered) * 100) : 0,
  };
}

function buildExamActionsFromResponses(responses = []) {
  return (responses || []).map((response, index) => ({
    sceneId: response?.questions?.subject_id || response?.subject_id || null,
    choiceId: response?.question_id || `question_${index + 1}`,
    actionType: 'answer',
    timeToChooseMs: Math.max(0, safeNum(response?.time_taken_seconds, 0)) * 1000,
    isOptimal: response?.is_correct === true,
  }));
}

async function buildExamBehaviorSummary({ sessionId, totalTimeSpentSeconds, skippedCount = 0 }) {
  const { data: responses, error } = await supabase
    .from('student_responses')
    .select('question_id, is_correct, time_taken_seconds, questions(subject_id,difficulty,cognitive_level,question_type)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const answerRows = responses || [];
  const totalAnswers = answerRows.length;
  const correctAnswers = answerRows.filter((response) => response?.is_correct === true).length;
  const actions = buildExamActionsFromResponses(answerRows);
  const totalTimeMs = Math.max(0, safeNum(totalTimeSpentSeconds, 0)) * 1000;
  const activeTimeSeconds = answerRows.reduce(
    (sum, response) => sum + Math.max(0, safeNum(response?.time_taken_seconds, 0)),
    0
  );
  const idleTimeSeconds = Math.max(0, Math.floor(safeNum(totalTimeSpentSeconds, 0) - activeTimeSeconds));
  const completionRate =
    totalAnswers + safeNum(skippedCount, 0) > 0
      ? totalAnswers / Math.max(1, totalAnswers + safeNum(skippedCount, 0))
      : 1;

  const behavior = buildBehaviorSignals({
    actions,
    totalAnswers,
    correctAnswers,
    totalTimeMs,
    completionRate,
  });
  const subjectBreakdown = {};
  answerRows.forEach((response) => {
    const subjectId = response?.questions?.subject_id;
    if (!subjectId) return;

    const bucket = subjectBreakdown[subjectId] || {
      subjectId,
      answered: 0,
      correct: 0,
      totalTimeSeconds: 0,
      difficultyTrail: [],
      cognitiveLevels: {},
      questionTypes: {},
      paceCounts: {},
    };
    const seconds = Math.max(0, safeNum(response?.time_taken_seconds, 0));
    const pace = paceBucket(seconds);
    const cognitiveLevel = response?.questions?.cognitive_level || 'unknown';
    const questionType = response?.questions?.question_type || 'unknown';

    bucket.answered += 1;
    bucket.correct += response?.is_correct === true ? 1 : 0;
    bucket.totalTimeSeconds += seconds;
    bucket.difficultyTrail = appendLimited(bucket.difficultyTrail, safeNum(response?.questions?.difficulty, null));
    bucket.cognitiveLevels[cognitiveLevel] = safeNum(bucket.cognitiveLevels[cognitiveLevel], 0) + 1;
    bucket.questionTypes[questionType] = safeNum(bucket.questionTypes[questionType], 0) + 1;
    bucket.paceCounts[pace] = safeNum(bucket.paceCounts[pace], 0) + 1;
    subjectBreakdown[subjectId] = bucket;
  });

  Object.values(subjectBreakdown).forEach((subject) => {
    subject.accuracy = subject.answered ? Math.round((subject.correct / subject.answered) * 100) : 0;
    subject.avgTimeSeconds = subject.answered ? Math.round(subject.totalTimeSeconds / subject.answered) : 0;
  });

  return {
    behavior,
    subjectBreakdown,
    totalAnswers,
    correctAnswers,
    activeTimeSeconds: Math.floor(activeTimeSeconds),
    idleTimeSeconds,
    engagementScore: behavior.engagement,
    understandingScore: behavior.understanding,
    interestSignal: behavior.interest,
  };
}

function resolveMinMax({ minQuestionsPerSubject, maxQuestionsPerSubject, questionsPerSubject }) {
  const legacy = safeNum(questionsPerSubject, NaN);

  const minQ = Number.isFinite(safeNum(minQuestionsPerSubject, NaN))
    ? safeNum(minQuestionsPerSubject, DEFAULT_MIN_Q)
    : Number.isFinite(legacy)
      ? legacy
      : DEFAULT_MIN_Q;

  const maxQ = Number.isFinite(safeNum(maxQuestionsPerSubject, NaN))
    ? safeNum(maxQuestionsPerSubject, DEFAULT_MAX_Q)
    : Number.isFinite(legacy)
      ? legacy
      : DEFAULT_MAX_Q;

  return {
    minQ: clamp(Math.floor(minQ), 1, 50),
    maxQ: clamp(Math.floor(Math.max(maxQ, minQ)), 1, 50),
  };
}

/**
 * Confidence model:
 * p = correct/n
 * se = sqrt(p(1-p)/n)
 * confidence = 100 * (1 - 2*se)
 */
function computeSubjectStats(correct, answered) {
  const n = Math.max(0, safeNum(answered, 0));
  const c = Math.max(0, safeNum(correct, 0));

  if (n <= 0) return { accuracy: 0, standardError: 1, confidence: 0 };

  const p = clamp(c / n, 0, 1);
  const se = Math.sqrt((p * (1 - p)) / Math.max(1, n));
  const confidence = clamp(Math.round((1 - 2 * se) * 100), 0, 100);

  return {
    accuracy: Math.round(p * 100),
    standardError: Number(se.toFixed(4)),
    confidence,
  };
}

function shouldStop({ answered, correct, minQ, maxQ }) {
  const stats = computeSubjectStats(correct, answered);

  const reachedMin = answered >= minQ;
  const reachedMax = answered >= maxQ;

  // ✅ Never stop before minQ
  const confidentEnough =
    reachedMin && (stats.confidence >= CONFIDENCE_STOP_AT || stats.standardError <= SE_STOP_AT);

  return {
    isComplete: reachedMax || confidentEnough,
    stats,
  };
}

/* -------------------------------------------------- */
/* DIFFICULTY LOGIC (FAST RAMP + ADAPT)                */
/* -------------------------------------------------- */

function baseTargetForIndex(answeredCount) {
  // answeredCount is how many already answered in THIS subject
  const idx = clamp(Math.floor(answeredCount), 0, FAST_RAMP_TARGETS.length - 1);
  return FAST_RAMP_TARGETS[idx];
}

/**
 * Use metadata to adapt targetDifficulty dynamically.
 * We store in per-subject metadata:
 *   lastTargetDifficulty
 *   lastAnswerCorrect
 *   lastPickedDifficulty
 */
function computeTargetDifficulty({
  answeredCount,
  minQ,
  lastTargetDifficulty,
  lastAnswerCorrect,
  useHardCapBeforeMinQ,
}) {
  const base = baseTargetForIndex(answeredCount);

  // If no previous target, start from base
  let target = Number.isFinite(safeNum(lastTargetDifficulty, NaN)) ? safeNum(lastTargetDifficulty, base) : base;

  // Push/pull based on last answer
  if (lastAnswerCorrect === true) target += DIFF_STEP_UP;
  if (lastAnswerCorrect === false) target -= DIFF_STEP_DOWN;

  // Blend with base so it doesn't drift too far
  target = 0.6 * base + 0.4 * target;

  // Optional cap before reaching minQ (avoids jumping to 3.0 too early)
  if (useHardCapBeforeMinQ && answeredCount < minQ) {
    target = Math.min(target, HARD_CAP_BEFORE_MINQ);
  }

  return clamp(Number(target.toFixed(2)), DIFF_MIN, DIFF_MAX);
}

function filterByDifficulty(list, minD, maxD) {
  return (list || []).filter((q) => {
    const d = safeNum(q.difficulty, NaN);
    if (!Number.isFinite(d)) return false;
    return d >= minD && d <= maxD;
  });
}

function pickClosestToTarget(list, target) {
  if (!list.length) return null;
  let best = list[0];
  let bestDist = Math.abs(safeNum(best.difficulty, 0) - target);
  for (let i = 1; i < list.length; i++) {
    const d = Math.abs(safeNum(list[i].difficulty, 0) - target);
    if (d < bestDist) {
      best = list[i];
      bestDist = d;
    }
  }
  return best;
}

function pickQuestionFastRamp({
  available,
  answeredCount,
  minQ,
  lastTargetDifficulty,
  lastAnswerCorrect,
}) {
  if (!available.length) return null;

  const target = computeTargetDifficulty({
    answeredCount,
    minQ,
    lastTargetDifficulty,
    lastAnswerCorrect,
    useHardCapBeforeMinQ: HOLD_HARD_CAP_UNTIL_MINQ,
  });

  // Try tight band first
  let band = filterByDifficulty(available, target - DIFF_BAND_START, target + DIFF_BAND_START);

  // Widen if needed
  if (band.length === 0) {
    for (const w of DIFF_BAND_WIDEN) {
      band = filterByDifficulty(available, target - w, target + w);
      if (band.length) break;
    }
  }

  const list = band.length ? band : available;

  // Prefer closest to target (feels like real adaptivity)
  const picked = pickClosestToTarget(list, target) || list[Math.floor(Math.random() * list.length)];

  return { question: picked, targetDifficulty: target };
}

/* -------------------------------------------------- */
/* HEARTBEAT                                           */
/* -------------------------------------------------- */

export async function recordHeartbeat({ sessionId, studentId, eventType = 'heartbeat', metadata = {} }) {
  try {
    await supabase.from('session_heartbeats').insert({
      session_id: sessionId,
      student_id: studentId,
      event_type: eventType,
      meta: metadata,
      client_ts: new Date().toISOString(),
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

/* -------------------------------------------------- */
/* START TOTAL EXAM                                    */
/* -------------------------------------------------- */

export async function startComprehensiveAssessment({
  studentId,
  subjectIds,
  language = 'ar',
  minQuestionsPerSubject,
  maxQuestionsPerSubject,
  questionsPerSubject = 2, // legacy
  subjectNames = null,
}) {
  try {
    if (!studentId) return { success: false, error: 'MISSING_STUDENT_ID' };
    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      return { success: false, error: 'NO_SUBJECT_IDS' };
    }

    const lang = normalizeLang(language);
    const { minQ, maxQ } = resolveMinMax({
      minQuestionsPerSubject,
      maxQuestionsPerSubject,
      questionsPerSubject,
    });

    const { data: subjects, error: subjErr } = await supabase
      .from('subjects')
      .select('id, is_active')
      .in('id', subjectIds);

    if (subjErr) return { success: false, error: 'SUBJECTS_QUERY_ERROR: ' + subjErr.message };

    const activeSubjectIds = (subjects || []).filter((s) => s.is_active).map((s) => s.id);
    if (!activeSubjectIds.length) return { success: false, error: 'NO_ACTIVE_SUBJECTS' };

    const totalQuestions = activeSubjectIds.length * maxQ;

    const { data: session, error: sessionErr } = await supabase
      .from('test_sessions')
      .insert({
        student_id: studentId,
        session_type: 'full_assessment',
        language: lang,
        target_questions: totalQuestions,
        status: 'in_progress',
        metadata: {
          examType: 'total_exam',
          subjectIds: activeSubjectIds,
          subjectNames,
          minQuestionsPerSubject: minQ,
          maxQuestionsPerSubject: maxQ,
          questionsPerSubject: safeNum(questionsPerSubject, minQ), // legacy
          startedAt: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (sessionErr) return { success: false, error: 'SESSION_CREATION_FAILED: ' + sessionErr.message };

    const subjectRows = activeSubjectIds.map((sid) => ({
      session_id: session.id,
      student_id: studentId,
      subject_id: sid,
      target_questions: maxQ,
      questions_answered: 0,
      correct_answers: 0,
      is_complete: false,
      metadata: {
        usedQuestionIds: [],
        minQuestions: minQ,
        maxQuestions: maxQ,
        confidence: 0,
        standardError: 1,
        accuracy: 0,
        // ✅ difficulty control metadata
        lastPickedDifficulty: null,
        lastPickedQuestionId: null,
        lastTargetDifficulty: null,
        lastAnswerCorrect: null,
      },
    }));

    const { error: insertErr } = await supabase.from('test_session_subjects').insert(subjectRows);
    if (insertErr) {
      await supabase.from('test_sessions').update({ status: 'abandoned' }).eq('id', session.id);
      return { success: false, error: 'SUBJECT_STATE_CREATE_FAILED: ' + insertErr.message };
    }

    const subjectStates = {};
    activeSubjectIds.forEach((sid) => {
      subjectStates[sid] = {
        targetQuestions: maxQ,
        minQuestions: minQ,
        maxQuestions: maxQ,
        questionsAnswered: 0,
        correctAnswers: 0,
        isComplete: false,
        confidence: 0,
        standardError: 1,
        accuracy: 0,
        usedQuestionIds: [],
      };
    });

    await recordHeartbeat({
      sessionId: session.id,
      studentId,
      eventType: 'start',
      metadata: { subjectCount: activeSubjectIds.length, minQ, maxQ, language: lang },
    });

    return {
      success: true,
      sessionId: session.id,
      studentId,
      subjectIds: activeSubjectIds,
      subjectStates,
    };
  } catch (e) {
    return { success: false, error: 'UNEXPECTED_ERROR: ' + (e?.message || String(e)) };
  }
}

/* -------------------------------------------------- */
/* LOAD STATE FROM DB                                  */
/* -------------------------------------------------- */

export async function loadSubjectStatesFromDb({ sessionId }) {
  try {
    const { data: rows, error } = await supabase
      .from('test_session_subjects')
      .select('subject_id, target_questions, questions_answered, correct_answers, is_complete, metadata')
      .eq('session_id', sessionId);

    if (error) return { success: false, error: error.message };

    const subjectStates = {};
    (rows || []).forEach((r) => {
      const meta = r.metadata || {};
      subjectStates[r.subject_id] = {
        targetQuestions: safeNum(r.target_questions, safeNum(meta.maxQuestions, DEFAULT_MAX_Q)),
        minQuestions: safeNum(meta.minQuestions, DEFAULT_MIN_Q),
        maxQuestions: safeNum(meta.maxQuestions, safeNum(r.target_questions, DEFAULT_MAX_Q)),
        questionsAnswered: safeNum(r.questions_answered, 0),
        correctAnswers: safeNum(r.correct_answers, 0),
        isComplete: !!r.is_complete,
        accuracy: safeNum(meta.accuracy, 0),
        standardError: safeNum(meta.standardError, 1),
        confidence: safeNum(meta.confidence, 0),
        usedQuestionIds: ensureArray(meta.usedQuestionIds),
        // bring along difficulty control meta (for selection)
        lastPickedDifficulty: meta.lastPickedDifficulty ?? null,
        lastPickedQuestionId: meta.lastPickedQuestionId ?? null,
        lastTargetDifficulty: meta.lastTargetDifficulty ?? null,
        lastAnswerCorrect: meta.lastAnswerCorrect ?? null,
        analysis: meta.analysis || {},
      };
    });

    return { success: true, subjectStates };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

/* -------------------------------------------------- */
/* GET NEXT QUESTION                                   */
/* -------------------------------------------------- */

async function fetchQuestionCandidates({ subjectId, language }) {
  const lang = normalizeLang(language);

  let q = supabase
    .from('questions')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .limit(QUESTION_POOL_LIMIT);

  q = q.or(`target_language.eq.${lang},target_language.eq.both`);

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };

  return { success: true, questions: data || [] };
}

export async function getComprehensiveQuestion(sessionId, subjectStatesFromUi = null) {
  try {
    const { data: session, error: sErr } = await supabase
      .from('test_sessions')
      .select('id, student_id, status, language, metadata')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) return { success: false, error: 'SESSION_NOT_FOUND' };
    if (session.status !== 'in_progress') return { success: false, error: 'SESSION_NOT_IN_PROGRESS' };

    const dbStateRes = await loadSubjectStatesFromDb({ sessionId });
    const subjectStates = dbStateRes.success ? dbStateRes.subjectStates : (subjectStatesFromUi || {});

    const subjectIds = session.metadata?.subjectIds || Object.keys(subjectStates || {});
    if (!subjectIds.length) return { success: false, error: 'NO_SUBJECTS_IN_SESSION' };

    for (const sid of subjectIds) {
      const state = subjectStates?.[sid];
      if (!state) continue;

      const maxQ = safeNum(state.maxQuestions, DEFAULT_MAX_Q);
      const minQ = safeNum(state.minQuestions, DEFAULT_MIN_Q);
      const answered = safeNum(state.questionsAnswered, 0);
      if (state.isComplete || answered >= maxQ) continue;

      const used = new Set(ensureArray(state.usedQuestionIds));

      const poolRes = await fetchQuestionCandidates({ subjectId: sid, language: session.language });
      if (!poolRes.success) return { success: false, error: 'QUESTIONS_QUERY_ERROR: ' + poolRes.error };

      const available = (poolRes.questions || []).filter((q) => !used.has(q.id));
      if (!available.length) {
        await supabase
          .from('test_session_subjects')
          .update({ is_complete: true, completed_at: new Date().toISOString() })
          .eq('session_id', sessionId)
          .eq('subject_id', sid);
        continue;
      }

      const pick = pickQuestionFastRamp({
        available,
        answeredCount: answered,
        minQ,
        lastTargetDifficulty: state.lastTargetDifficulty,
        lastAnswerCorrect: state.lastAnswerCorrect,
      });

      const diversePick = await getNextDiverseQuestion({
        studentId: session.student_id,
        sessionId,
        subjectId: sid,
        difficultyTarget: pick?.targetDifficulty,
        language: session.language,
        usedQuestionIds: [...used],
        candidates: available,
      });

      const question = diversePick?.question || pick?.question;
      if (!question) return { success: false, error: 'NO_QUESTION_SELECTED' };

      const nextUsed = [...used, question.id];

      const { error: updErr } = await supabase
        .from('test_session_subjects')
        .update({
          metadata: {
            ...(state.metadata || {}),
            usedQuestionIds: nextUsed,
            minQuestions: minQ,
            maxQuestions: maxQ,
            accuracy: safeNum(state.accuracy, 0),
            standardError: safeNum(state.standardError, 1),
            confidence: safeNum(state.confidence, 0),
            lastPickedDifficulty: safeNum(question.difficulty, null),
            lastPickedQuestionId: question.id,
            lastTargetDifficulty: pick.targetDifficulty,
            diversity: diversePick?.selectionMeta || null,
            // keep previous value until an answer is submitted
            lastAnswerCorrect: state.lastAnswerCorrect ?? null,
          },
        })
        .eq('session_id', sessionId)
        .eq('subject_id', sid);

      if (updErr) return { success: false, error: 'USED_IDS_UPDATE_FAILED: ' + updErr.message };

      recordHeartbeat({
        sessionId,
        studentId: session.student_id,
        eventType: 'question_presented',
        metadata: {
          ...questionAnalysisMeta(question),
          targetDifficulty: pick.targetDifficulty,
          diversity: diversePick?.selectionMeta || null,
          answeredCount: answered,
          minQuestions: minQ,
          maxQuestions: maxQ,
        },
      }).catch(() => {});

      return { success: true, question, subjectId: sid, subjectStates };
    }

    return { success: false, error: 'ALL_SUBJECTS_COMPLETE' };
  } catch (e) {
    return { success: false, error: 'UNEXPECTED_ERROR: ' + (e?.message || String(e)) };
  }
}

export async function getNextQuestion({ sessionId, subjectStates }) {
  return getComprehensiveQuestion(sessionId, subjectStates);
}

/* -------------------------------------------------- */
/* SUBMIT ANSWER                                       */
/* -------------------------------------------------- */

export async function submitComprehensiveAnswer({
  sessionId,
  studentId,
  question,
  selectedAnswer,
  timeTakenSeconds,
  subjectStatesFromUi,
  questionOrder,
}) {
  try {
    if (!sessionId || !studentId || !question?.id) {
      return { success: false, error: 'MISSING_REQUIRED_FIELDS' };
    }

    const stateRes = await loadSubjectStatesFromDb({ sessionId });
    if (!stateRes.success) return { success: false, error: 'LOAD_STATE_FAILED: ' + stateRes.error };

    const subjectStates = stateRes.subjectStates;
    const subjectId = question.subject_id;

    const state = subjectStates?.[subjectId] || subjectStatesFromUi?.[subjectId];
    if (!state) return { success: false, error: 'SUBJECT_STATE_MISSING' };

    const isCorrect = selectedAnswer === question.correct_answer;

    const nextAnswered = safeNum(state.questionsAnswered, 0) + 1;
    const nextCorrect = safeNum(state.correctAnswers, 0) + (isCorrect ? 1 : 0);

    const minQ = safeNum(state.minQuestions, DEFAULT_MIN_Q);
    const maxQ = safeNum(state.maxQuestions, DEFAULT_MAX_Q);

    const stop = shouldStop({
      answered: nextAnswered,
      correct: nextCorrect,
      minQ,
      maxQ,
    });
    const nextAnalysis = buildNextSubjectAnalysisMeta({
      state,
      question,
      isCorrect,
      timeTakenSeconds,
      nextAnswered,
      nextCorrect,
    });

    const nextState = {
      ...state,
      questionsAnswered: nextAnswered,
      correctAnswers: nextCorrect,
      isComplete: stop.isComplete,
      accuracy: stop.stats.accuracy,
      standardError: stop.stats.standardError,
      confidence: stop.stats.confidence,
      // used by next question selection
      lastAnswerCorrect: isCorrect,
      analysis: nextAnalysis,
    };

    // Insert response
    const { error: respErr } = await supabase.from('student_responses').insert({
      session_id: sessionId,
      question_id: question.id,
      student_id: studentId,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      time_taken_seconds: Math.max(0, Math.floor(safeNum(timeTakenSeconds, 0))),
      question_order: Math.max(1, Math.floor(safeNum(questionOrder, nextAnswered))),
      created_at: new Date().toISOString(),
    });

    if (respErr) return { success: false, error: 'RESPONSE_INSERT_FAILED: ' + respErr.message };

    // Update per-subject row (✅ store lastAnswerCorrect for fast ramp adaptivity)
    const { error: subjErr } = await supabase
      .from('test_session_subjects')
      .update({
        questions_answered: nextAnswered,
        correct_answers: nextCorrect,
        is_complete: stop.isComplete,
        completed_at: stop.isComplete ? new Date().toISOString() : null,
        metadata: {
          usedQuestionIds: ensureArray(state.usedQuestionIds),
          minQuestions: minQ,
          maxQuestions: maxQ,
          accuracy: stop.stats.accuracy,
          standardError: stop.stats.standardError,
          confidence: stop.stats.confidence,
          lastPickedDifficulty: state.lastPickedDifficulty ?? null,
          lastPickedQuestionId: state.lastPickedQuestionId ?? null,
          lastTargetDifficulty: state.lastTargetDifficulty ?? null,
          lastAnswerCorrect: isCorrect,
          analysis: nextAnalysis,
        },
      })
      .eq('session_id', sessionId)
      .eq('subject_id', subjectId);

    if (subjErr) return { success: false, error: 'SUBJECT_UPDATE_FAILED: ' + subjErr.message };

    await recordHeartbeat({
      sessionId,
      studentId,
      eventType: 'answer',
      metadata: {
        ...questionAnalysisMeta(question),
        isCorrect,
        timeTakenSeconds,
        pace: nextAnalysis.lastPace,
        selectedAnswer,
        correctAnswer: question.correct_answer,
        answeredCount: nextAnswered,
        correctCount: nextCorrect,
        accuracy: nextAnalysis.accuracy,
        correctStreak: nextAnalysis.correctStreak,
        wrongStreak: nextAnalysis.wrongStreak,
        recoveryAfterMistake: nextAnalysis.recoveryAfterMistake,
      },
    });

    const mergedStates = {
      ...subjectStates,
      [subjectId]: nextState,
    };

    return { success: true, isCorrect, subjectStates: mergedStates };
  } catch (e) {
    return { success: false, error: 'UNEXPECTED_ERROR: ' + (e?.message || String(e)) };
  }
}

/* -------------------------------------------------- */
/* COMPLETE SESSION                                    */
/* -------------------------------------------------- */

export async function completeComprehensiveAssessment({
  sessionId,
  studentId,
  subjectStates,
  totalTimeSpentSeconds,
  skippedCount,
  language,
}) {
  try {
    let behaviorSummary = {
      behavior: null,
      totalAnswers: 0,
      correctAnswers: 0,
      activeTimeSeconds: 0,
      idleTimeSeconds: 0,
      engagementScore: 50,
      understandingScore: 0,
      interestSignal: 50,
    };

    try {
      behaviorSummary = await buildExamBehaviorSummary({
        sessionId,
        totalTimeSpentSeconds,
        skippedCount,
      });
    } catch (_error) {
      // Finish the exam even if behavioral enrichment cannot be calculated.
    }

    const { error } = await supabase
      .from('test_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_time_seconds: Math.max(0, Math.floor(safeNum(totalTimeSpentSeconds, 0))),
        active_time_seconds: behaviorSummary.activeTimeSeconds,
        idle_time_seconds: behaviorSummary.idleTimeSeconds,
        engagement_score: behaviorSummary.engagementScore,
        metadata: {
          ...(subjectStates ? { finalSubjectStates: subjectStates } : {}),
          totalTimeSpentSeconds,
          skippedCount,
          language: normalizeLang(language),
          examType: 'total_exam',
          behaviorSignals: behaviorSummary.behavior,
          subjectBehavior: behaviorSummary.subjectBreakdown,
          understandingScore: behaviorSummary.understandingScore,
          interestSignal: behaviorSummary.interestSignal,
          totalAnswers: behaviorSummary.totalAnswers,
          correctAnswers: behaviorSummary.correctAnswers,
        },
      })
      .eq('id', sessionId);

    if (error) return { success: false, error: error.message };

    await recordHeartbeat({
      sessionId,
      studentId,
      eventType: 'finish',
      metadata: { totalTimeSpentSeconds, skippedCount },
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

/* -------------------------------------------------- */
/* RECOMMENDATIONS (stub)                              */
/* -------------------------------------------------- */

export async function generateStudentRecommendations(studentId) {
  const result = await recommendTopDegreesAfterSession(studentId, { limit: 5 });
  return {
    success: !!result?.success,
    recommendations: result?.data || [],
    error: result?.error || null,
  };
}

/* -------------------------------------------------- */
/* DEFAULT EXPORT                                      */
/* -------------------------------------------------- */

export default {
  startComprehensiveAssessment,
  loadSubjectStatesFromDb,
  getComprehensiveQuestion,
  getNextQuestion,
  submitComprehensiveAnswer,
  completeComprehensiveAssessment,
  recordHeartbeat,
  generateStudentRecommendations,
};
