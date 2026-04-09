import { buildCreateSessionPayload, buildUpdateSessionPayload } from '../utils/gameSessionPayloads';
import { validateGameSessionInput } from '../utils/gameValidation';
import { supabase } from '../config/supabase';

export async function createGameSession(input) {
  validateGameSessionInput(input);

  const payload = buildCreateSessionPayload(input);

  const { data, error } = await supabase
    .from('game_sessions')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
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
