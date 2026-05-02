import { Platform } from 'react-native';

const STORAGE_KEY_PREFIX = 'physics_lab_completed_levels';

const Storage = {
  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      }

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
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
      // ignore storage failures
    }
  },
};

function getStorageKey(studentId) {
  return `${STORAGE_KEY_PREFIX}:${String(studentId || 'anonymous-player')}`;
}

export async function getCompletedPhysicsLabLevels(studentId) {
  const rawValue = await Storage.getItem(getStorageKey(studentId));

  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function markPhysicsLabLevelCompleted(levelId, studentId) {
  if (!levelId) return [];

  const completedLevels = await getCompletedPhysicsLabLevels(studentId);
  const nextCompletedLevels = completedLevels.includes(levelId)
    ? completedLevels
    : [...completedLevels, levelId];

  await Storage.setItem(getStorageKey(studentId), JSON.stringify(nextCompletedLevels));
  return nextCompletedLevels;
}
