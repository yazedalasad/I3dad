import { supabase } from '../config/supabase';

export async function getAllGames() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getGameById(gameId) {
  if (!gameId) {
    throw new Error('gameId is required');
  }

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error) throw error;
  return data;
}
