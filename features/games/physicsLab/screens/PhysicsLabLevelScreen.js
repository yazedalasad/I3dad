import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ErrorState, GameHeader, LoadingState, ProgressBar, ScreenContainer } from '../../shared';
import { physicsLabLevels } from '../data/levels';
import PhysicsControlPanel from '../components/PhysicsControlPanel';
import AttemptFeedbackCard from '../components/AttemptFeedbackCard';
import WorldScene from '../components/WorldScene';
import StatPill from '../components/StatPill';
import { usePhysicsLabGame } from '../hooks/usePhysicsLabGame';

export default function PhysicsLabLevelScreen({ route, navigation }) {
  const levelId = route?.params?.levelId || 'physics_lab_level_1';
  const studentId = route?.params?.studentId || 'demo-student-id';

  const {
    level,
    params,
    lastAttempt,
    attempts,
    loading,
    error,
    seconds,
    startLevel,
    runAttempt,
    updateParam,
    finishLevel,
  } = usePhysicsLabGame({ levelId });

  const [running, setRunning] = useState(false);
  const levelIndex = physicsLabLevels.findIndex((item) => item.id === level.id);
  const progressPercent = Math.round(((levelIndex + 1) / physicsLabLevels.length) * 100);

  useEffect(() => {
    startLevel(studentId).catch(() => {});
  }, [studentId]);

  async function handleRun() {
    try {
      setRunning(true);
      const result = await runAttempt();

      setTimeout(async () => {
        setRunning(false);

        if (result?.success) {
          const finalResult = await finishLevel();
          navigation?.replace?.('PhysicsLabResult', {
            levelId: level.id,
            result: finalResult,
          });
        }
      }, 850);
    } catch (_) {
      setRunning(false);
    }
  }

  if (loading && !level) return <LoadingState label="Loading level..." />;
  if (error && !level) return <ErrorState title="Failed to load level" message={error.message} />;

  return (
    <ScreenContainer scroll>
      <GameHeader
        title={level.title}
        subtitle={level.subtitle}
        rightContent={<StatPill label="Time" value={`${seconds}s`} />}
      />

      <ProgressBar
        progress={progressPercent}
        currentStep={levelIndex + 1}
        totalSteps={physicsLabLevels.length}
        label="Level progress"
      />

      <WorldScene
        level={level}
        distance={lastAttempt?.distance || 0}
        isRunning={running}
      />

      <View style={styles.metaRow}>
        <StatPill label="Concept" value={level.concept} />
        <StatPill label="Attempts" value={attempts.length} />
        <StatPill label="Object" value={level.objectType} />
      </View>

      <PhysicsControlPanel
        level={level}
        params={params}
        onDecrease={(control) => updateParam(control, 'decrease')}
        onIncrease={(control) => updateParam(control, 'increase')}
        onRun={handleRun}
        disabled={running}
      />

      <AttemptFeedbackCard feedback={lastAttempt?.feedback} details={lastAttempt} />

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>How to win</Text>
        <Text style={styles.noteText}>
          Reach the goal zone by tuning the controls. The game teaches through short feedback after each run.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    marginBottom: 14,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  noteCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#0F2232',
    borderWidth: 1,
    borderColor: '#295877',
  },
  noteTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  noteText: {
    marginTop: 6,
    color: '#C0DCF2',
    fontSize: 14,
    lineHeight: 21,
  },
});
