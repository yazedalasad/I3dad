import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer, GameHeader } from '../../shared';
import { physicsLabLevels } from '../data/levels';
import LevelPickerCard from '../components/LevelPickerCard';
import level1ForceImage from '../assets/level1-force.png';
import level2SpeedImage from '../assets/level2-speed.png';
import level3AccelerationImage from '../assets/level3-acceleration.png';
import { getCompletedPhysicsLabLevels } from '../services/levelProgressService';

const imageMap = {
  physics_lab_level_1: level2SpeedImage,
  physics_lab_level_2: level1ForceImage,
  physics_lab_level_3: level3AccelerationImage,
};

export default function PhysicsLabHomeScreen({ navigation, studentId = null }) {
  const [completedLevels, setCompletedLevels] = useState([]);
  const completedCount = completedLevels.length;
  const progressPercent = Math.round((completedCount / physicsLabLevels.length) * 100);

  const loadCompletedLevels = useCallback(() => {
    getCompletedPhysicsLabLevels(studentId)
      .then((levels) => setCompletedLevels(levels))
      .catch(() => setCompletedLevels([]));
  }, [studentId]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', loadCompletedLevels);
    loadCompletedLevels();

    return unsubscribe;
  }, [loadCompletedLevels, navigation]);

  return (
    <ScreenContainer scroll>
      <GameHeader
        title="Physics Lab"
        subtitle="Choose a level, finish the animation, then unlock the next challenge."
        rightContent={
          <Pressable onPress={() => navigation?.navigate?.('games')} style={({ pressed }) => [styles.exitButton, pressed && styles.pressed]}>
            <Text style={styles.exitButtonText}>Exit Game</Text>
          </Pressable>
        }
      />

      <View style={styles.progressPanel}>
        <View>
          <Text style={styles.progressTitle}>Level Map</Text>
          <Text style={styles.progressSubtitle}>{completedCount} of {physicsLabLevels.length} completed</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      <View style={styles.list}>
        {physicsLabLevels.map((level, index) => {
          const previousLevel = physicsLabLevels[index - 1];
          const isUnlocked = index === 0 || completedLevels.includes(previousLevel?.id);
          const isCompleted = completedLevels.includes(level.id);

          return (
            <LevelPickerCard
              key={level.id}
              title={level.title}
              levelNumber={index + 1}
              imageSource={imageMap[level.id]}
              accentColor={level.themeColor}
              disabled={!isUnlocked}
              completed={isCompleted}
              lockedLabel={!isUnlocked ? `Finish Level ${index} first` : ''}
              statusLabel={isCompleted ? 'Completed' : isUnlocked ? 'Ready' : 'Locked'}
              actionLabel={isCompleted ? 'Replay' : 'Start'}
              onPress={() =>
                isUnlocked
                  ? navigation?.navigate?.('PhysicsLabLevel', {
                      levelId: level.id,
                      studentId,
                    })
                  : null
              }
            />
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  progressPanel: {
    marginBottom: 16,
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#7DD3FC',
    gap: 12,
  },
  progressTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
  },
  progressSubtitle: {
    marginTop: 3,
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#BAE6FD',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  exitButton: {
    backgroundColor: '#E2E8F0',
    borderColor: '#94A3B8',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exitButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
