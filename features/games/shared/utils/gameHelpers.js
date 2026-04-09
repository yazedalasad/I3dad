export function formatDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function byId(items = []) {
  return Object.fromEntries((items || []).map((item) => [item.id, item]));
}

export function getNextScene(currentScene, sceneMap) {
  if (!currentScene) return null;
  const nextSceneId = currentScene?.nextSceneId || currentScene?.metadata?.nextSceneId;
  return nextSceneId ? sceneMap[nextSceneId] || null : null;
}

export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function average(numbers = []) {
  const safe = (numbers || []).filter((n) => typeof n === 'number');
  if (!safe.length) return 0;
  return safe.reduce((sum, n) => sum + n, 0) / safe.length;
}
