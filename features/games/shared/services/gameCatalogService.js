import { supabase } from '../../../../config/supabase';
import { getGameHubItems } from '../../catalog';

function isMissingSchema(error) {
  const message = String(error?.message || '');
  return error?.code === '42P01' || error?.code === '42703' || /does not exist|schema cache|Could not find/i.test(message);
}

function mergeCatalogVisibility(localItems, rows = []) {
  const rowsByKey = new Map(rows.map((row) => [row.id, row]));
  return localItems
    .map((item) => {
      const row = rowsByKey.get(item.key);
      const isActive = !row || String(row.status || 'active').toLowerCase() === 'active';
      return row
        ? {
            ...item,
            is_active: isActive,
            is_visible: isActive,
            status: isActive ? 'مفعلة' : 'معطلة',
          }
        : item;
    })
    .filter((item) => item.is_active !== false && item.is_visible !== false);
}

export async function getAllGames() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getVisibleGameHubItems(language) {
  const localItems = getGameHubItems(language);

  try {
    const { data, error } = await supabase
      .from('games')
      .select('id, status')
      .order('created_at', { ascending: true });

    if (error) {
      if (isMissingSchema(error)) return localItems;
      throw error;
    }

    if (!data?.length) return localItems;
    return mergeCatalogVisibility(localItems, data);
  } catch (error) {
    if (isMissingSchema(error)) return localItems;
    throw error;
  }
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
