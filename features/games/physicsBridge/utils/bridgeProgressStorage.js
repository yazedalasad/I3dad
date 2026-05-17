import { Platform } from 'react-native';
import { createGameSession, updateGameSession } from '../../shared/services/gameSessionService.js';

const STORAGE_KEY_PREFIX = 'physics_bridge_progress_v2';
let memoryProgress = {};

const Storage = {
  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      }

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryProgress[key] || null;
    }
  },

  async setItem(key, value) {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
        return;
      }

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryProgress[key] = value;
      // Install @react-native-async-storage/async-storage to persist progress natively.
    }
  },
};

function getStorageKey(studentId) {
  const safeStudentId = String(studentId || 'anonymous-player');
  return `${STORAGE_KEY_PREFIX}:${safeStudentId}`;
}

async function readProgressByKey(storageKey) {
  const rawValue = await Storage.getItem(storageKey);

  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function getPhysicsBridgeProgress(studentId) {
  const scopedKey = getStorageKey(studentId);
  return readProgressByKey(scopedKey);
}

export async function savePhysicsBridgeLevelResult(studentId, levelId, result) {
  const storageKey = getStorageKey(studentId);
  const currentProgress = await getPhysicsBridgeProgress(studentId);
  const previousResult = currentProgress[levelId];
  const nextResult = {
    ...previousResult,
    ...result,
    completed: Boolean(previousResult?.completed || result.completed),
    lastAttempt: result,
    stars: result.completed
      ? Math.max(previousResult?.stars || 0, result.stars || 0)
      : previousResult?.stars || result.stars || 0,
    bestScore: result.completed
      ? Math.max(previousResult?.bestScore || previousResult?.score || 0, result.score || 0)
      : previousResult?.bestScore || previousResult?.score || 0,
  };
  const nextProgress = {
    ...currentProgress,
    [levelId]: nextResult,
  };

  await Storage.setItem(storageKey, JSON.stringify(nextProgress));

  try {
    const session = await createGameSession({
      studentId,
      gameId: 'physics_bridge_game',
      levelId,
      language: 'ar',
      currentSceneId: levelId,
    });

    await updateGameSession(session.id, {
      status: result.completed ? 'completed' : 'abandoned',
      currentSceneId: levelId,
      endedAt: new Date().toISOString(),
      interestSignal: Math.round(Math.max(20, Math.min(100, nextResult.problemSolvingScore || (nextResult.stars || 1) * 25 + 25))),
      engagementScore: Math.round(Math.max(20, Math.min(100, nextResult.planningScore || (nextResult.stars || 1) * 25 + 30))),
      trustScore: Math.round(Math.max(20, Math.min(100, nextResult.engineeringAbilityScore || nextResult.stabilityScore || 70))),
    });
  } catch (_error) {
    // Local progress is still valid if analytics persistence is unavailable.
  }

  return nextProgress;
}
