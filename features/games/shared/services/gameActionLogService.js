import { buildActionLogPayload } from '../utils/gameSessionPayloads';
import { validateActionLogInput } from '../utils/gameValidation';
import { supabase } from '../config/supabase';

export async function createGameActionLog(input) {
  validateActionLogInput(input);

  const payload = buildActionLogPayload(input);

  const { data, error } = await supabase
    .from('game_action_logs')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createManyGameActionLogs(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const payload = items.map(buildActionLogPayload);

  const { data, error } = await supabase
    .from('game_action_logs')
    .insert(payload)
    .select();

  if (error) throw error;
  return data || [];
}

export async function getSessionActionLogs(sessionId) {
  if (!sessionId) {
    throw new Error('sessionId is required');
  }

  const { data, error } = await supabase
    .from('game_action_logs')
    .select('*')
    .eq('game_session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}
