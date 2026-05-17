import { buildCreateSessionPayload, buildUpdateSessionPayload } from '../utils/gameSessionPayloads';
import { validateGameSessionInput } from '../utils/gameValidation';
import { supabase } from '../../../../config/supabase';
import { processCompletedGameSession } from '../../../../services/gameCareerSignalService';

const GAME_CATALOG_ROWS = {
  doctor_soroka: {
    game: { id: 'doctor_soroka', title: 'Doctor at Soroka', domain: 'clinical_reasoning', language: 'he', status: 'active' },
    levels: {
      doctor_soroka_level_1: {
        id: 'doctor_soroka_level_1',
        game_id: 'doctor_soroka',
        title: 'Clinical Case 1',
        difficulty: 'beginner',
        estimated_minutes: 8,
        is_active: true,
      },
      doctor_soroka_level_2: {
        id: 'doctor_soroka_level_2',
        game_id: 'doctor_soroka',
        title: 'Clinical Case 2',
        difficulty: 'intermediate',
        estimated_minutes: 10,
        is_active: true,
      },
    },
  },
  physics_lab: {
    game: { id: 'physics_lab', title: 'Physics Lab', domain: 'physics', language: 'en', status: 'active' },
    levels: {
      physics_lab_level_1: {
        id: 'physics_lab_level_1',
        game_id: 'physics_lab',
        title: 'Level 1 - Speed',
        difficulty: 'beginner',
        estimated_minutes: 6,
        is_active: true,
      },
      physics_lab_level_2: {
        id: 'physics_lab_level_2',
        game_id: 'physics_lab',
        title: 'Level 2 - Distance',
        difficulty: 'intermediate',
        estimated_minutes: 8,
        is_active: true,
      },
      physics_lab_level_3: {
        id: 'physics_lab_level_3',
        game_id: 'physics_lab',
        title: 'Level 3 - Acceleration',
        difficulty: 'advanced',
        estimated_minutes: 10,
        is_active: true,
      },
    },
  },
  arabic_poet_puzzle: {
    game: { id: 'arabic_poet_puzzle', title: 'Word Treasures', domain: 'arabic_language', language: 'ar', status: 'active' },
    levels: {
      arabic_poet_puzzle_level_1: {
        id: 'arabic_poet_puzzle_level_1',
        game_id: 'arabic_poet_puzzle',
        title: 'Word Treasures 1',
        difficulty: 'beginner',
        estimated_minutes: 6,
        is_active: true,
      },
      arabic_poet_puzzle_level_2: {
        id: 'arabic_poet_puzzle_level_2',
        game_id: 'arabic_poet_puzzle',
        title: 'Word Treasures 2',
        difficulty: 'intermediate',
        estimated_minutes: 8,
        is_active: true,
      },
      arabic_poet_puzzle_level_3: {
        id: 'arabic_poet_puzzle_level_3',
        game_id: 'arabic_poet_puzzle',
        title: 'Word Treasures 3',
        difficulty: 'advanced',
        estimated_minutes: 10,
        is_active: true,
      },
    },
  },
  physics_bridge_game: {
    game: { id: 'physics_bridge_game', title: 'Bridge Engineer', domain: 'engineering', language: 'ar', status: 'active' },
    levels: {
      physics_bridge_level_1: {
        id: 'physics_bridge_level_1',
        game_id: 'physics_bridge_game',
        title: 'Bridge Level 1',
        difficulty: 'beginner',
        estimated_minutes: 7,
        is_active: true,
      },
      physics_bridge_level_2: {
        id: 'physics_bridge_level_2',
        game_id: 'physics_bridge_game',
        title: 'Bridge Level 2',
        difficulty: 'intermediate',
        estimated_minutes: 9,
        is_active: true,
      },
      physics_bridge_level_3: {
        id: 'physics_bridge_level_3',
        game_id: 'physics_bridge_game',
        title: 'Bridge Level 3',
        difficulty: 'advanced',
        estimated_minutes: 11,
        is_active: true,
      },
    },
  },
};

async function ensureGameCatalogRows({ gameId, levelId }) {
  const catalog = GAME_CATALOG_ROWS[gameId];
  const level = catalog?.levels?.[levelId];
  if (!catalog || !level) return;

  const { error: gameError } = await supabase
    .from('games')
    .upsert([catalog.game], { onConflict: 'id' });
  if (gameError) {
    console.warn('Skipping game catalog seed:', gameError.message);
    return;
  }

  const { error: levelError } = await supabase
    .from('game_levels')
    .upsert([level], { onConflict: 'id' });
  if (levelError) {
    console.warn('Skipping game level catalog seed:', levelError.message);
  }
}

async function findExistingInProgressSession({ studentId, gameId, levelId }) {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('student_id', studentId)
    .eq('game_id', gameId)
    .eq('level_id', levelId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function createGameSession(input) {
  validateGameSessionInput(input);

  await ensureGameCatalogRows(input);

  const payload = buildCreateSessionPayload(input);

  const { data, error } = await supabase
    .from('game_sessions')
    .insert([payload])
    .select()
    .single();

  if (error) {
    const errorWithPayload = new Error(
      `${error.message} (game_id=${payload.game_id || 'null'}, level_id=${payload.level_id || 'null'})`
    );
    errorWithPayload.code = error.code;
    errorWithPayload.details = error.details;
    errorWithPayload.hint = error.hint;

    const isConflict =
      error.code === '23505' ||
      error.status === 409 ||
      String(error.message || '').toLowerCase().includes('duplicate') ||
      String(error.details || '').toLowerCase().includes('already exists');

    if (!isConflict) throw errorWithPayload;

    const existingSession = await findExistingInProgressSession(input);
    if (!existingSession) throw errorWithPayload;

    const refreshedSession = await updateGameSession(existingSession.id, {
      currentSceneId: input.currentSceneId,
    });

    return refreshedSession;
  }

  return data;
}

export async function updateGameSession(sessionId, input) {
  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  const payload = buildUpdateSessionPayload(input);

  const { data, error } = await supabase
    .from('game_sessions')
    .update(payload)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;

  if (data?.status === 'completed') {
    processCompletedGameSession(data).catch((signalError) => {
      console.warn('Failed to update game career signals:', signalError?.message || signalError);
    });
  }

  return data;
}

export async function getGameSessionById(sessionId) {
  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  return data;
}

export async function getStudentGameSessions(studentId, gameId = null) {
  if (!studentId) {
    throw new Error('studentId is required');
  }

  let query = supabase
    .from('game_sessions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (gameId) {
    query = query.eq('game_id', gameId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}
