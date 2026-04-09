import { supabase } from '../config/supabase';

export async function getLevelsByGameId(gameId) {
  if (!gameId) {
    throw new Error('gameId is required');
  }

  const { data, error } = await supabase
    .from('game_levels')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getLevelById(levelId) {
  if (!levelId) {
    throw new Error('levelId is required');
  }

  const { data, error } = await supabase
    .from('game_levels')
    .select('*')
    .eq('id', levelId)
    .single();

  if (error) throw error;
  return data;
}
