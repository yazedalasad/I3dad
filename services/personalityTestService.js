/**
 * PERSONALITY TEST SERVICE (UPDATED + NEW QUESTION TYPES)
 *
 * Big Five personality assessment in its OWN module (separate from ability questions).
 * Works with the SQL structure:
 *  - personality_dimensions (code: O,C,E,A,N)
 *  - personality_questions (reverse_scored, scale_min/scale_max, options jsonb, question_type)
 *  - personality_test_sessions
 *  - personality_responses (answer_json jsonb for flexible types)
 *  - student_personality_profiles (ONE ROW PER SESSION with O/C/E/A/N)
 *  - v_student_personality_latest (optional view)
 *
 * Supports question types:
 *  - scale_10
 *  - multiple_choice
 *  - open_ended
 *  - forced_choice_pair      (A vs B, stored in answer_json)
 *  - ranking_10              (order 10 items, stored in answer_json)
 *
 * Scoring:
 *  - scale_10: numeric 1..10, reverse_scored supported
 *  - multiple_choice: uses option.value if provided, else index+1 (can be reverse_scored)
 *  - forced_choice_pair: expects options = { A:{scores:{O:..}}, B:{scores:{...}} }
 *  - ranking_10: expects options array items may include scores; top ranks contribute more
 *
 * Notes:
 * - Keeps your API: startPersonalityTest, getPersonalityQuestion, submitPersonalityAnswer, completePersonalityTest
 * - personality_insights is OPTIONAL.
 */

import { supabase } from '../config/supabase';

/* ----------------------------- helpers ----------------------------- */

function quoteUuidsForIn(ids = []) {
  // Supabase "in" string must look like: ("uuid1","uuid2")
  return `(${ids.map((id) => `"${id}"`).join(',')})`;
}

function safeNumber(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeLang(language) {
  const lang = String(language || 'ar').toLowerCase();
  return lang === 'he' ? 'he' : 'ar';
}

/**
 * Map raw average on scale [min..max] => 0..100
 */
function scaleTo100(avg, min, max) {
  const a = safeNumber(avg, NaN);
  if (!Number.isFinite(a)) return 0;
  if (max <= min) return 0;
  const t = (a - min) / (max - min);
  return clamp(t * 100, 0, 100);
}

/**
 * Reverse score for a value on [min..max]
 * Example for 1..10: reverse(2) => 9
 */
function reverseScore(v, min, max) {
  const x = safeNumber(v, NaN);
  if (!Number.isFinite(x)) return x;
  return (max + min) - x;
}

/**
 * Try to get numeric value for multiple_choice:
 * - If question.options is an array and option has {value}, use it
 * - Else fallback to (index + 1)
 */
function getMultipleChoiceNumericValue(question, selectedIndex) {
  const idx = safeNumber(selectedIndex, NaN);
  if (!Number.isFinite(idx) || idx < 0) return NaN;

  const opts = Array.isArray(question?.options) ? question.options : null;
  if (opts && opts[idx] && Number.isFinite(Number(opts[idx].value))) {
    return Number(opts[idx].value);
  }
  return idx + 1;
}

/**
 * Adds trait deltas to accumulator
 */
function addTraitScores(acc, deltas) {
  if (!deltas || typeof deltas !== 'object') return;
  const keys = ['O', 'C', 'E', 'A', 'N'];
  for (const k of keys) {
    if (deltas[k] === undefined || deltas[k] === null) continue;
    acc[k] = safeNumber(acc[k], 0) + safeNumber(deltas[k], 0);
  }
}

/**
 * Convert trait deltas (can be negative) to 0..100 using a soft clamp.
 * defaultRange = expected absolute range (e.g. 20 means -20..+20)
 */
function deltasTo100(delta, defaultRange = 20) {
  const d = safeNumber(delta, 0);
  const r = Math.max(1, safeNumber(defaultRange, 20));
  // map [-r..+r] => [0..100]
  const t = (d + r) / (2 * r);
  return clamp(t * 100, 0, 100);
}

/* -------------------------- core API -------------------------- */

export async function startPersonalityTest(studentId, language = 'ar') {
  try {
    if (!studentId) throw new Error('studentId is required');

    const lang = normalizeLang(language);

    const { data: session, error: sessionError } = await supabase
      .from('personality_test_sessions')
      .insert({
        student_id: studentId,
        language: lang,
        total_questions: 20,
        status: 'in_progress',
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    return { success: true, sessionId: session.id, session };
  } catch (error) {
    console.error('Error starting personality test:', error);
    return { success: false, error: error.message };
  }
}

export async function getPersonalityQuestion(sessionId) {
  try {
    if (!sessionId) throw new Error('sessionId is required');

    const { data: session, error: sessionError } = await supabase
      .from('personality_test_sessions')
      .select('id, student_id, language, total_questions, questions_answered, status')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('Session not found');
    if (session.status !== 'in_progress') {
      return { success: false, error: 'Session is not in progress' };
    }

    // Fetch answered question ids + their dimension_id (if any)
    const { data: responses, error: responsesError } = await supabase
      .from('personality_responses')
      .select('question_id, personality_questions(dimension_id)')
      .eq('session_id', sessionId);

    if (responsesError) throw responsesError;

    const usedQuestionIds = [];
    const dimensionCounts = {};

    (responses || []).forEach((r) => {
      if (r?.question_id) usedQuestionIds.push(r.question_id);
      const dimensionId = r?.personality_questions?.dimension_id;
      if (dimensionId) {
        dimensionCounts[dimensionId] = (dimensionCounts[dimensionId] || 0) + 1;
      }
    });

    // All active dimensions (ordered)
    const { data: dimensions, error: dimErr } = await supabase
      .from('personality_dimensions')
      .select('id')
      .eq('is_active', true)
      .order('display_order');

    if (dimErr) throw dimErr;
    if (!dimensions || dimensions.length === 0) {
      throw new Error('No active personality dimensions found');
    }

    // Pick dimension with fewest answered
    let targetDimensionId = dimensions[0].id;
    let minCount = Number.POSITIVE_INFINITY;

    for (const d of dimensions) {
      const count = dimensionCounts[d.id] || 0;
      if (count < minCount) {
        minCount = count;
        targetDimensionId = d.id;
      }
    }

    // Pull candidate questions (include dimension)
    let query = supabase
      .from('personality_questions')
      .select('*, personality_dimensions(*)')
      .eq('dimension_id', targetDimensionId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(25);

    if (usedQuestionIds.length > 0) {
      query = query.not('id', 'in', quoteUuidsForIn(usedQuestionIds));
    }

    const { data: questions, error: questionsError } = await query;
    if (questionsError) throw questionsError;

    if (!questions || questions.length === 0) {
      return { success: false, error: 'No more questions available' };
    }

    const question = questions[Math.floor(Math.random() * questions.length)];

    return {
      success: true,
      question,
      progress: {
        answered: usedQuestionIds.length,
        total: safeNumber(session.total_questions, 50),
      },
    };
  } catch (error) {
    console.error('Error getting personality question:', error);
    return { success: false, error: error.message };
  }
}

export async function submitPersonalityAnswer(sessionId, questionId, answer, timeTakenSeconds) {
  try {
    if (!sessionId) throw new Error('sessionId is required');
    if (!questionId) throw new Error('questionId is required');

    const timeTaken = Math.max(0, Math.floor(safeNumber(timeTakenSeconds, 0)));

    // Get question details
    const { data: question, error: questionError } = await supabase
      .from('personality_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError) throw questionError;
    if (!question) throw new Error('Question not found');

    // Get session
    const { data: session, error: sessionErr } = await supabase
      .from('personality_test_sessions')
      .select('id, student_id, questions_answered, status')
      .eq('id', sessionId)
      .single();

    if (sessionErr) throw sessionErr;
    if (!session) throw new Error('Session not found');
    if (session.status !== 'in_progress') throw new Error('Session is not in progress');

    const nextOrder = safeNumber(session.questions_answered, 0) + 1;

    const responseData = {
      session_id: sessionId,
      question_id: questionId,
      student_id: session.student_id,
      response_type: question.question_type,
      time_taken_seconds: timeTaken,
      question_order: nextOrder,
    };

    // Type-specific fields + validation
    if (question.question_type === 'scale_10') {
      const v = safeNumber(answer?.scaleValue, NaN);
      const min = safeNumber(question.scale_min, 1);
      const max = safeNumber(question.scale_max, 10);

      if (!Number.isFinite(v) || v < min || v > max) {
        throw new Error(`scaleValue must be between ${min} and ${max}`);
      }
      responseData.scale_value = v;
    } else if (question.question_type === 'multiple_choice') {
      const idx = safeNumber(answer?.optionIndex, NaN);
      if (!Number.isFinite(idx) || idx < 0) throw new Error('optionIndex is invalid');

      responseData.selected_option_index = idx;
      responseData.selected_option_text_ar = answer?.optionTextAr ?? null;
      responseData.selected_option_text_he = answer?.optionTextHe ?? null;
      responseData.selected_option_text_en = answer?.optionTextEn ?? null;

      // Save full structure too (optional, helps debugging/scoring later)
      responseData.answer_json = {
        optionIndex: idx,
        optionTextAr: answer?.optionTextAr ?? null,
        optionTextHe: answer?.optionTextHe ?? null,
        optionTextEn: answer?.optionTextEn ?? null,
      };
    } else if (question.question_type === 'open_ended') {
      const text = String(answer?.textResponse ?? '').trim();
      if (!text) throw new Error('textResponse is required');
      responseData.text_response = text;
      responseData.answer_json = { textResponse: text };
    } else if (question.question_type === 'forced_choice_pair') {
      // Expected: answer = { chosen: 'A' | 'B' }
      const chosen = String(answer?.chosen ?? '').toUpperCase();
      if (chosen !== 'A' && chosen !== 'B') {
        throw new Error('forced_choice_pair requires answer.chosen = "A" or "B"');
      }
      responseData.answer_json = { chosen };
    } else if (question.question_type === 'ranking_10') {
      // Expected: answer = { ranking: [ {id, rank} ... ] } OR { order: [id1,id2,...] }
      const ranking = Array.isArray(answer?.ranking) ? answer.ranking : null;
      const order = Array.isArray(answer?.order) ? answer.order : null;

      if (!ranking && !order) {
        throw new Error('ranking_10 requires answer.ranking[] or answer.order[]');
      }

      responseData.answer_json = ranking ? { ranking } : { order };
    } else {
      throw new Error(`Unsupported question type: ${question.question_type}`);
    }

    const { error: responseError } = await supabase.from('personality_responses').insert(responseData);
    if (responseError) throw responseError;

    // Update session counter
    const { error: updateError } = await supabase
      .from('personality_test_sessions')
      .update({ questions_answered: nextOrder })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('Error submitting personality answer:', error);
    return { success: false, error: error.message };
  }
}

export async function completePersonalityTest(sessionId) {
  try {
    if (!sessionId) throw new Error('sessionId is required');

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('personality_test_sessions')
      .select('id, student_id, started_at, status, total_questions, questions_answered')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('Session not found');

    // Pull responses with questions + dimensions
    const { data: responses, error: responsesError } = await supabase
      .from('personality_responses')
      .select('*, personality_questions(*, personality_dimensions(*))')
      .eq('session_id', sessionId);

    if (responsesError) throw responsesError;

    const startedAt = session.started_at ? new Date(session.started_at).getTime() : null;
    const totalSeconds =
      startedAt && Number.isFinite(startedAt)
        ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
        : null;

    // Mark session completed regardless
    const { error: updateSessionErr } = await supabase
      .from('personality_test_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_time_seconds: totalSeconds,
      })
      .eq('id', sessionId);

    if (updateSessionErr) throw updateSessionErr;

    // If no responses
    if (!responses || responses.length === 0) {
      return {
        success: true,
        profile: {
          student_id: session.student_id,
          session_id: sessionId,
          openness: 0,
          conscientiousness: 0,
          extraversion: 0,
          agreeableness: 0,
          neuroticism: 0,
          confidence_level: 0,
          answered_count: 0,
        },
      };
    }

    // Aggregate numeric-by-dimension (for scale_10/multiple_choice)
    const aggNumeric = {
      O: { sum: 0, count: 0, min: 1, max: 10 },
      C: { sum: 0, count: 0, min: 1, max: 10 },
      E: { sum: 0, count: 0, min: 1, max: 10 },
      A: { sum: 0, count: 0, min: 1, max: 10 },
      N: { sum: 0, count: 0, min: 1, max: 10 },
    };

    // Aggregate deltas from playful types
    const delta = { O: 0, C: 0, E: 0, A: 0, N: 0 };

    let answeredCount = 0;

    for (const r of responses) {
      const q = r?.personality_questions;
      const dim = q?.personality_dimensions;
      const dimCode = String(dim?.code || '').toUpperCase();

      // --------- numeric types ---------
      if (r.response_type === 'scale_10' || r.response_type === 'multiple_choice') {
        if (!aggNumeric[dimCode]) continue;

        const min = safeNumber(q?.scale_min, 1);
        const max = safeNumber(q?.scale_max, 10);
        aggNumeric[dimCode].min = min;
        aggNumeric[dimCode].max = max;

        let value = NaN;

        if (r.response_type === 'scale_10') {
          value = safeNumber(r.scale_value, NaN);
        } else {
          value = getMultipleChoiceNumericValue(q, r.selected_option_index);
        }

        if (!Number.isFinite(value)) continue;

        if (q?.reverse_scored === true) {
          value = reverseScore(value, min, max);
        }

        value = clamp(value, min, max);

        aggNumeric[dimCode].sum += value;
        aggNumeric[dimCode].count += 1;
        answeredCount += 1;
        continue;
      }

      // --------- forced choice (trait deltas) ---------
      if (r.response_type === 'forced_choice_pair') {
        const chosen = String(r?.answer_json?.chosen || '').toUpperCase();
        const opts = q?.options || {};
        const choice = chosen === 'A' ? opts?.A : chosen === 'B' ? opts?.B : null;
        const deltas = choice?.scores || choice?.traits || null;

        addTraitScores(delta, deltas);
        answeredCount += 1;
        continue;
      }

      // --------- ranking (trait deltas with weights by rank) ---------
      if (r.response_type === 'ranking_10') {
        const opts = Array.isArray(q?.options) ? q.options : [];

        // ranking can be: {order:[id1,id2,...]} OR {ranking:[{id,rank},...]}
        const order = Array.isArray(r?.answer_json?.order) ? r.answer_json.order : null;
        const ranking = Array.isArray(r?.answer_json?.ranking) ? r.answer_json.ranking : null;

        // Build list of ids ordered by priority (index 0 = top)
        let orderedIds = [];
        if (order && order.length) {
          orderedIds = order.map((x) => String(x));
        } else if (ranking && ranking.length) {
          orderedIds = [...ranking]
            .filter((x) => x && x.id != null)
            .sort((a, b) => safeNumber(a.rank, 999) - safeNumber(b.rank, 999))
            .map((x) => String(x.id));
        }

        if (!orderedIds.length || !opts.length) continue;

        // Map option by id
        const byId = {};
        for (const o of opts) {
          if (!o) continue;
          const id = o.id != null ? String(o.id) : null;
          if (id) byId[id] = o;
        }

        // Weight: top ranks count more (10..1)
        // If fewer items, still works.
        const topK = Math.min(10, orderedIds.length);
        for (let i = 0; i < topK; i++) {
          const id = orderedIds[i];
          const item = byId[id];
          if (!item) continue;

          const w = topK - i; // top=10, next=9...
          const deltas = item?.scores || item?.traits || null;
          if (!deltas) continue;

          addTraitScores(delta, {
            O: safeNumber(deltas.O, 0) * w,
            C: safeNumber(deltas.C, 0) * w,
            E: safeNumber(deltas.E, 0) * w,
            A: safeNumber(deltas.A, 0) * w,
            N: safeNumber(deltas.N, 0) * w,
          });
        }

        answeredCount += 1;
        continue;
      }

      // open_ended doesn't affect numeric score now
    }

    function avgFor(code) {
      const a = aggNumeric[code];
      if (!a || a.count <= 0) return { avg: NaN, min: 1, max: 10, count: 0 };
      return { avg: a.sum / a.count, min: a.min, max: a.max, count: a.count };
    }

    // numeric base scores 0..100 (can be 0 if no numeric questions for that dimension)
    const o = avgFor('O');
    const c = avgFor('C');
    const e = avgFor('E');
    const a = avgFor('A');
    const n = avgFor('N');

    const base = {
      O: scaleTo100(o.avg, o.min, o.max),
      C: scaleTo100(c.avg, c.min, c.max),
      E: scaleTo100(e.avg, e.min, e.max),
      A: scaleTo100(a.avg, a.min, a.max),
      N: scaleTo100(n.avg, n.min, n.max),
    };

    // delta contribution converted to 0..100 with a reasonable expected range
    // ranking weights can get large; pick a bigger range.
    const deltaRange = 120; // tweak later if needed
    const delta100 = {
      O: deltasTo100(delta.O, deltaRange),
      C: deltasTo100(delta.C, deltaRange),
      E: deltasTo100(delta.E, deltaRange),
      A: deltasTo100(delta.A, deltaRange),
      N: deltasTo100(delta.N, deltaRange),
    };

    // Combine:
    // If a dimension has base numeric questions, use mostly base; otherwise rely on delta.
    function combine(code) {
      const numericCount = aggNumeric[code]?.count || 0;
      const wBase = numericCount > 0 ? 0.75 : 0.0;
      const wDelta = numericCount > 0 ? 0.25 : 1.0;
      return clamp(base[code] * wBase + delta100[code] * wDelta, 0, 100);
    }

    const openness = combine('O');
    const conscientiousness = combine('C');
    const extraversion = combine('E');
    const agreeableness = combine('A');
    const neuroticism = combine('N');

    // Confidence: based on answeredCount (all types)
    const confidenceLevel = clamp(Math.round((answeredCount / 50) * 100), 0, 100);

    const profileRow = {
      student_id: session.student_id,
      session_id: sessionId,
      openness,
      conscientiousness,
      extraversion,
      agreeableness,
      neuroticism,
      confidence_level: confidenceLevel,
      answered_count: answeredCount,
      summary_ar: null,
      summary_he: null,
      summary_en: null,
      metadata: {
        per_dimension_counts: {
          O: o.count,
          C: c.count,
          E: e.count,
          A: a.count,
          N: n.count,
        },
        delta_raw: delta,
        delta_range: deltaRange,
      },
    };

    const { data: savedProfile, error: profileErr } = await supabase
      .from('student_personality_profiles')
      .insert(profileRow)
      .select()
      .single();

    if (profileErr) throw profileErr;

    await generatePersonalityInsights(session.student_id, sessionId, savedProfile);

    return { success: true, profile: savedProfile };
  } catch (error) {
    console.error('Error completing personality test:', error);
    return { success: false, error: error.message };
  }
}

/**
 * OPTIONAL: personality_insights
 */
export async function generatePersonalityInsights(studentId, sessionId, profileOrProfiles) {
  try {
    if (!studentId) throw new Error('studentId is required');
    if (!sessionId) throw new Error('sessionId is required');

    const profile = Array.isArray(profileOrProfiles) ? null : profileOrProfiles;

    const insights = generateBasicInsights(profile);

    const { error: insightsError } = await supabase
      .from('personality_insights')
      .upsert(
        {
          student_id: studentId,
          session_id: sessionId,
          personality_type: insights.personalityType,
          personality_type_description_ar: insights.descriptionAr,
          personality_type_description_he: insights.descriptionHe,
          strengths_ar: insights.strengthsAr,
          strengths_he: insights.strengthsHe,
          development_areas_ar: insights.developmentAreasAr,
          development_areas_he: insights.developmentAreasHe,
          recommended_careers_ar: insights.careersAr,
          recommended_careers_he: insights.careersHe,
          study_style_ar: insights.studyStyleAr,
          study_style_he: insights.studyStyleHe,
          communication_style_ar: insights.communicationStyleAr,
          communication_style_he: insights.communicationStyleHe,
          generated_by_ai: false,
          ai_model: 'basic_rules',
        },
        { onConflict: 'session_id' }
      );

    if (insightsError) {
      console.log('Insights not saved (optional table missing or error):', insightsError?.message || insightsError);
      return { success: false, error: insightsError?.message || String(insightsError) };
    }

    return { success: true, insights };
  } catch (error) {
    console.error('Error generating personality insights:', error);
    return { success: false, error: error.message };
  }
}

function generateBasicInsights(profile) {
  if (!profile) {
    return {
      personalityType: 'متوازن',
      descriptionAr: 'لم يتم توليد تحليل مفصل.',
      descriptionHe: 'לא נוצר ניתוח מפורט.',
      strengthsAr: ['نقاط قوة عامة'],
      strengthsHe: ['חוזקות כלליות'],
      developmentAreasAr: ['تطوير مهارات عامة'],
      developmentAreasHe: ['שיפור כישורים כלליים'],
      careersAr: ['مسارات عامة'],
      careersHe: ['מסלולים כלליים'],
      studyStyleAr: 'أسلوب تعلم عام.',
      studyStyleHe: 'סגנון למידה כללי.',
      communicationStyleAr: 'تواصل عام.',
      communicationStyleHe: 'תקשורת כללית.',
    };
  }

  const scores = [
    { k: 'O', v: safeNumber(profile.openness, 0), ar: 'الانفتاح', he: 'פתיחות' },
    { k: 'C', v: safeNumber(profile.conscientiousness, 0), ar: 'الانضباط', he: 'מצפוניות' },
    { k: 'E', v: safeNumber(profile.extraversion, 0), ar: 'الانبساط', he: 'מוחצנות' },
    { k: 'A', v: safeNumber(profile.agreeableness, 0), ar: 'التوافق', he: 'נעימות' },
    { k: 'N', v: safeNumber(profile.neuroticism, 0), ar: 'القلق/العصابية', he: 'נוירוטיות' },
  ].sort((a, b) => b.v - a.v);

  const top1 = scores[0];
  const top2 = scores[1];

  const personalityType = top1.v >= 70 ? top1.ar : 'متوازن';

  return {
    personalityType,
    descriptionAr: `شخصيتك تتميز بـ${top1.ar} و${top2.ar}.`,
    descriptionHe: `האישיות שלך מאופיינת ב${top1.he} וב${top2.he}.`,
    strengthsAr: [`قوة في جانب ${top1.ar}.`, `قوة إضافية في جانب ${top2.ar}.`],
    strengthsHe: [`חוזקה בתחום ${top1.he}.`, `חוזקה נוספת בתחום ${top2.he}.`],
    developmentAreasAr: ['تطوير إدارة الوقت', 'تحسين أسلوب المذاكرة'],
    developmentAreasHe: ['שיפור ניהול זמן', 'שיפור סגנון למידה'],
    careersAr: ['مجالات تناسب اهتماماتك وقدراتك'],
    careersHe: ['תחומים שמתאימים ליכולות ולהעדפות שלך'],
    studyStyleAr: 'أنت تتعلم أفضل عندما تربط بين النظرية والتطبيق.',
    studyStyleHe: 'את/ה לומד/ת הכי טוב כשמשלבים בין תיאוריה ליישום.',
    communicationStyleAr: 'تفضل تواصلًا واضحًا ومباشرًا.',
    communicationStyleHe: 'מעדיף/ה תקשורת ברורה וישירה.',
  };
}

export async function getStudentPersonalityProfile(studentId) {
  try {
    if (!studentId) throw new Error('studentId is required');

    // Prefer view if exists
    let latestProfile = null;

    const { data: viewRow, error: viewErr } = await supabase
      .from('v_student_personality_latest')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (!viewErr && viewRow) {
      latestProfile = viewRow;
    } else {
      const { data: profileRow, error: profileErr } = await supabase
        .from('student_personality_profiles')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (profileErr) throw profileErr;
      latestProfile = profileRow;
    }

    // Insights optional
    const { data: insights, error: insightsError } = await supabase
      .from('personality_insights')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const latestInsights = insightsError ? null : insights;

    return { success: true, profile: latestProfile, insights: latestInsights };
  } catch (error) {
    console.error('Error getting personality profile:', error);
    return { success: false, error: error.message };
  }
}

export default {
  startPersonalityTest,
  getPersonalityQuestion,
  submitPersonalityAnswer,
  completePersonalityTest,
  generatePersonalityInsights,
  getStudentPersonalityProfile,
};
