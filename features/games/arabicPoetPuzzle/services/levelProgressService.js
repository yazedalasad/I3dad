import { Platform } from 'react-native';

const STORAGE_KEY_PREFIX = 'arabic_poet_puzzle_completed_levels';

function getMemoryStore() {
  if (!globalThis.__arabicPoetPuzzleProgressStore) {
    globalThis.__arabicPoetPuzzleProgressStore = new Map();
  }
  return globalThis.__arabicPoetPuzzleProgressStore;
}

const Storage = {
  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : getMemoryStore().get(key) || null;
      }

      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return (await AsyncStorage.getItem(key)) || getMemoryStore().get(key) || null;
    } catch {
      return getMemoryStore().get(key) || null;
    }
  },

  async setItem(key, value) {
    getMemoryStore().set(key, value);

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
      // The memory store above keeps level unlocks working even when
      // native persistent storage is not installed in this build.
    }
  },
};

function getStorageKey(studentId) {
  return `${STORAGE_KEY_PREFIX}:${String(studentId || 'anonymous-player')}`;
}

export async function getCompletedArabicPoetPuzzleLevels(studentId) {
  const rawValue = await Storage.getItem(getStorageKey(studentId));

  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function markArabicPoetPuzzleLevelCompleted(levelId, studentId) {
  if (!levelId) return [];

  const completedLevels = await getCompletedArabicPoetPuzzleLevels(studentId);
  const nextCompletedLevels = completedLevels.includes(levelId)
    ? completedLevels
    : [...completedLevels, levelId];

  await Storage.setItem(getStorageKey(studentId), JSON.stringify(nextCompletedLevels));
  return nextCompletedLevels;
}
