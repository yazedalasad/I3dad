import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ErrorState, GameHeader, LoadingState, ProgressBar, ScreenContainer } from '../../shared';
import { physicsLabLevels } from '../data/levels';
import PhysicsControlPanel from '../components/PhysicsControlPanel';
import AttemptFeedbackCard from '../components/AttemptFeedbackCard';
import PhysicsRuleBook from '../components/PhysicsRuleBook';
import WorldScene from '../components/WorldScene';
import StatPill from '../components/StatPill';
import { usePhysicsLabGame } from '../hooks/usePhysicsLabGame';
import { markPhysicsLabLevelCompleted } from '../services/levelProgressService';

const MOTION_VISUAL_MULTIPLIER = 2.4;
const MOTION_VISUAL_MIN_MS = 4200;
const FULL_RULER_TRAVEL_MS = 12000;

function getVisualMotionDurationMs(level, result) {
  const motionDurationMs = result?.motion?.durationMs || 1200;
  const rulerLength = level?.world?.rulerLength || level?.world?.mapLength || 15;
  const distanceRatio = Math.max(0.18, Math.abs(result?.distance || 0) / rulerLength);

  if (level?.id === 'physics_lab_level_1') {
    return Math.max(900, Math.round(motionDurationMs));
  }

  return Math.max(
    MOTION_VISUAL_MIN_MS,
    Math.round(motionDurationMs * MOTION_VISUAL_MULTIPLIER),
    Math.round(distanceRatio * FULL_RULER_TRAVEL_MS)
  );
}

function getObjectFacts(level, params, lastAttempt) {
  const currentMeta = lastAttempt?.meta || {};

  if (level?.id === 'physics_lab_level_1') {
    return {
      title: 'Ball Object',
      items: [
        'Object type: Ball',
        `Speed setting: ${params.speed} m/s`,
        `Start speed: ${currentMeta.startVelocity ?? params.speed ?? 0} m/s`,
        `Target distance: ${level.world.targetDistance} m`,
        `Target time: ${level.world.targetTimeSec} s`,
        'Use speed = distance / time to estimate the correct value.',
      ],
    };
  }

  if (level?.id === 'physics_lab_level_2') {
    return {
      title: 'Box Object',
      items: [
        'Object type: Box',
        `Speed setting: ${params.speed} m/s`,
        `Time setting: ${params.time} s`,
        `Distance now: ${currentMeta.calculatedDistance ?? 'calculated after run'} m`,
        `Target distance: ${level.world.targetDistance} m`,
        'Use distance = speed x time.',
      ],
    };
  }

  return {
    title: 'Capsule Object',
    items: [
      'Object type: Capsule',
      `Mass: ${params.mass} kg`,
      `Acceleration setting: ${params.acceleration} m/s^2`,
      `Start speed: ${currentMeta.startVelocity ?? 0} m/s`,
      `Target height run ends near: ${level.world.targetDistance} m`,
      'Heavier mass needs more useful motion to climb.',
    ],
  };
}

function getConceptFacts(level) {
  return {
    title: `${level?.concept?.charAt(0)?.toUpperCase()}${level?.concept?.slice(1)} Laws`,
    items: [
      ...(level?.teaching?.formulas || []),
      level?.teaching?.symbols || '',
      level?.teaching?.physicsRule || '',
      level?.teaching?.strategy || '',
    ].filter(Boolean),
  };
}

function buildTaskPrompt(level) {
  if (level?.id === 'physics_lab_level_1') {
    return {
      title: 'Question',
      body: 'What speed should you choose so the ball travels 10 m in exactly 5 s?',
      hint: 'Use: speed = distance / time',
    };
  }

  if (level?.id === 'physics_lab_level_2') {
    return {
      title: 'Question',
      body: 'You have speed and time. How far will the box travel?',
      hint: `Use: distance = speed x time. Target distance: ${level.world.targetDistance} m`,
    };
  }

  return {
    title: 'Question',
    body: 'Choose acceleration and mass values that let the object climb and stop at the target.',
    hint: 'More acceleration builds motion faster.',
  };
}

export default function PhysicsLabLevelScreen({ route, navigation }) {
  const levelId = route?.params?.levelId || 'physics_lab_level_1';
  const studentId = route?.params?.studentId || null;
  const { width } = useWindowDimensions();
  const isPhone = width < 640;
  const showSideRuleBook = width >= 1100;

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
    resetAttempt,
    updateParam,
    setParamValue,
    finishLevel,
    abandonSession,
  } = usePhysicsLabGame({ levelId });

  const [running, setRunning] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [infoModal, setInfoModal] = useState(null);
  const [outcomeModal, setOutcomeModal] = useState(null);
  const runTimeoutRef = useRef(null);
  const taskPrompt = buildTaskPrompt(level);
  const levelIndex = physicsLabLevels.findIndex((item) => item.id === level?.id);
  const progressPercent = Math.round(((levelIndex + 1) / physicsLabLevels.length) * 100);
  const nextLevelId = levelIndex >= 0 ? physicsLabLevels[levelIndex + 1]?.id || null : null;
  const hasSolvedAttempt = !!lastAttempt?.success;
  const canLeaveAsWinner = hasWon || (hasSolvedAttempt && !running);
  const hasMissingParams = (level?.controls || []).some((control) => !Number.isFinite(Number(params[control.key])));

  useEffect(() => {
    if (!studentId) return;
    startLevel(studentId).catch(() => {});
  }, [studentId]);

  useEffect(() => () => {
    if (runTimeoutRef.current) {
      clearTimeout(runTimeoutRef.current);
      runTimeoutRef.current = null;
    }
  }, []);

  async function completeAndReturnToLevels() {
    if (runTimeoutRef.current) {
      clearTimeout(runTimeoutRef.current);
      runTimeoutRef.current = null;
    }

    if (level?.id) {
      await markPhysicsLabLevelCompleted(level.id, studentId).catch(() => {});
      finishLevel().catch(() => {});
    }

    navigation?.navigate?.('PhysicsLabHome', {
      completedLevelId: level?.id || null,
      unlockedLevelId: nextLevelId,
      studentId,
    });
  }

  async function handleRun() {
    if (canLeaveAsWinner) {
      completeAndReturnToLevels();
      return;
    }

    if (running) return;

    try {
      setRunning(true);
      const result = await runAttempt();
      const solved = !!result?.success;
      const visualMotionDurationMs = getVisualMotionDurationMs(level, result);

      runTimeoutRef.current = setTimeout(() => {
        runTimeoutRef.current = null;
        setRunning(false);

        if (solved) {
          setHasWon(true);
          setOutcomeModal({
            type: 'success',
            title: 'You Win!',
            body: level?.successMessage || 'Great job. The object reached the target.',
          });
        } else {
          setOutcomeModal({
            type: 'fail',
            title: 'Try Again',
            body: result?.feedback?.body || 'The object did not land in the target zone yet.',
          });
        }
      }, visualMotionDurationMs);
    } catch (_) {
      setRunning(false);
    }
  }

  function handleRetry() {
    if (running) return;

    if (runTimeoutRef.current) {
      clearTimeout(runTimeoutRef.current);
      runTimeoutRef.current = null;
    }

    setRunning(false);
    setHasWon(false);
    setOutcomeModal(null);
    resetAttempt();
  }

  async function exitCurrentLevel(targetScreen) {
    try {
      if (runTimeoutRef.current) {
        clearTimeout(runTimeoutRef.current);
        runTimeoutRef.current = null;
      }

      setRunning(false);
      setHasWon(false);
      setOutcomeModal(null);
      resetAttempt();
      await abandonSession({ currentSceneId: level?.id });
    } catch (_) {
      // Let navigation continue even if the session is already closed or missing.
    } finally {
      navigation?.navigate?.(targetScreen);
    }
  }

  function handleBackToLevels() {
    if (canLeaveAsWinner) {
      completeAndReturnToLevels();
      return;
    }

    exitCurrentLevel('PhysicsLabHome');
  }

  function openObjectInfo() {
    setInfoModal({
      type: 'object',
      ...getObjectFacts(level, params, lastAttempt),
    });
  }

  function openConceptInfo() {
    setInfoModal({
      type: 'concept',
      ...getConceptFacts(level),
    });
  }

  if (loading && !level) return <LoadingState label="Loading level..." />;
  if (error) return <ErrorState title="Failed to save game session" message={error.message} />;
  if (!level) return <ErrorState title="Failed to load level" message="Level data is missing." />;
  if (!studentId) {
    return (
      <ErrorState
        title="Student profile is still loading"
        message="Open the game again after the student profile finishes loading."
      />
    );
  }

  return (
    <ScreenContainer scroll>
      <GameHeader
        title={level.title}
        subtitle={level.subtitle}
        rightContent={
          <View style={styles.headerActions}>
            <Pressable onPress={handleBackToLevels} style={({ pressed }) => [styles.cornerExitButton, pressed && styles.pressed]}>
              <Text style={styles.cornerExitText}>{canLeaveAsWinner ? 'Levels' : 'Exit'}</Text>
            </Pressable>
            <StatPill label="Time" value={`${seconds}s`} />
          </View>
        }
      />

      <ProgressBar
        progress={progressPercent}
        currentStep={levelIndex + 1}
        totalSteps={physicsLabLevels.length}
        label="Level progress"
      />

      <View style={[styles.mainRow, isPhone && styles.mainRowPhone, showSideRuleBook && styles.mainRowWide]}>
        <View style={[styles.primaryColumn, showSideRuleBook && styles.primaryColumnWide]}>
          <View style={[styles.taskCard, isPhone && styles.taskCardPhone]}>
            <Text style={[styles.taskKicker, isPhone && styles.taskKickerPhone]}>{taskPrompt.title}</Text>
            <Text style={[styles.taskTitle, isPhone && styles.taskTitlePhone]}>{taskPrompt.body}</Text>
            <Text style={[styles.taskHint, isPhone && styles.taskHintPhone]}>{taskPrompt.hint}</Text>
          </View>

          <WorldScene
            level={level}
            distance={lastAttempt?.distance || 0}
            isRunning={running}
            motionDurationMs={lastAttempt?.motion?.durationMs || 0}
            onPressObject={openObjectInfo}
          />

          <View style={[styles.metaRow, isPhone && styles.metaRowPhone]}>
            <StatPill label="Concept" value={level.concept} onPress={openConceptInfo} />
            <StatPill label="Attempts" value={attempts.length} />
            {Number.isFinite(lastAttempt?.meta?.arrivalTimeSec) ? (
              <StatPill label="Travel Time" value={`${lastAttempt.meta.arrivalTimeSec}s`} />
            ) : null}
            <StatPill label="Object" value={level.objectType} onPress={openObjectInfo} />
          </View>

          <PhysicsControlPanel
            level={level}
            params={params}
            compact={isPhone}
            onDecrease={(control) => updateParam(control, 'decrease')}
            onIncrease={(control) => updateParam(control, 'increase')}
            onChangeValue={(control, value) => setParamValue(control, value)}
            onRun={handleRun}
            onRetry={handleRetry}
            onPressConcept={openConceptInfo}
            showRetry={!!lastAttempt && !lastAttempt.success && !running && !canLeaveAsWinner}
            disabled={running || canLeaveAsWinner}
            mainActionDisabled={running || (!canLeaveAsWinner && hasMissingParams)}
            mainActionLabel={canLeaveAsWinner ? 'You Win!' : running ? 'Running...' : hasMissingParams ? 'Enter Value' : undefined}
          />

          <AttemptFeedbackCard
            feedback={lastAttempt?.feedback}
            details={lastAttempt}
            onRetry={!lastAttempt?.success && !canLeaveAsWinner ? handleRetry : undefined}
          />
        </View>

        <View style={[styles.sideColumn, showSideRuleBook ? styles.sideColumnVisible : styles.sideColumnStacked]}>
          <PhysicsRuleBook teaching={level.teaching} compact={!showSideRuleBook} collapsed={isPhone} />
        </View>
      </View>

      <Modal visible={!!infoModal} transparent animationType="fade" onRequestClose={() => setInfoModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setInfoModal(null)}>
          <Pressable style={styles.infoCard} onPress={() => {}}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoTitle}>{infoModal?.title}</Text>
              <Pressable onPress={() => setInfoModal(null)} style={({ pressed }) => [styles.infoClose, pressed && styles.pressed]}>
                <Text style={styles.infoCloseText}>Close</Text>
              </Pressable>
            </View>

            {(infoModal?.items || []).map((item) => (
              <Text key={item} style={styles.infoItem}>
                {`\u2022 ${item}`}
              </Text>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!outcomeModal} transparent animationType="fade" onRequestClose={() => setOutcomeModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.outcomeCard, outcomeModal?.type === 'success' ? styles.outcomeSuccess : styles.outcomeFail]}>
            <Text style={styles.outcomeTitle}>{outcomeModal?.title}</Text>
            <Text style={styles.outcomeBody}>{outcomeModal?.body}</Text>

            <View style={styles.outcomeActions}>
              {outcomeModal?.type === 'success' ? (
                <>
                  <Pressable onPress={handleRetry} style={({ pressed }) => [styles.outcomeSecondaryButton, pressed && styles.pressed]}>
                    <Text style={styles.outcomeSecondaryText}>Replay</Text>
                  </Pressable>
                  <Pressable onPress={completeAndReturnToLevels} style={({ pressed }) => [styles.outcomePrimaryButton, pressed && styles.pressed]}>
                    <Text style={styles.outcomePrimaryText}>{nextLevelId ? 'Back to Levels' : 'Finish Game'}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => setOutcomeModal(null)} style={({ pressed }) => [styles.outcomeSecondaryButton, pressed && styles.pressed]}>
                    <Text style={styles.outcomeSecondaryText}>See Details</Text>
                  </Pressable>
                  <Pressable onPress={handleRetry} style={({ pressed }) => [styles.outcomePrimaryButton, pressed && styles.pressed]}>
                    <Text style={styles.outcomePrimaryText}>Try Again</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  cornerExitButton: {
    backgroundColor: '#E2E8F0',
    borderColor: '#94A3B8',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cornerExitText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  metaRow: {
    marginTop: 14,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaRowPhone: {
    marginTop: 8,
    marginBottom: 10,
    gap: 6,
  },
  mainRow: {
    gap: 14,
  },
  mainRowPhone: {
    gap: 10,
  },
  mainRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  primaryColumn: {
    minWidth: 0,
  },
  primaryColumnWide: {
    flex: 1.2,
  },
  sideColumn: {
    minWidth: 0,
  },
  sideColumnVisible: {
    flex: 0.72,
    maxWidth: 420,
  },
  sideColumnStacked: {
    width: '100%',
  },
  taskCard: {
    marginBottom: 14,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#FFF5DB',
    borderWidth: 1.5,
    borderColor: '#D6A74D',
    shadowColor: '#8A5A14',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  taskCardPhone: {
    marginBottom: 10,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  taskKicker: {
    color: '#8A5A14',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  taskKickerPhone: {
    fontSize: 10,
  },
  taskTitle: {
    marginTop: 6,
    color: '#1F2937',
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '900',
  },
  taskTitlePhone: {
    fontSize: 17,
    lineHeight: 23,
  },
  taskHint: {
    marginTop: 8,
    color: '#7C3F00',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  taskHintPhone: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 17, 27, 0.56)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoCard: {
    width: '100%',
    maxWidth: 620,
    borderRadius: 24,
    backgroundColor: '#FBF7EF',
    borderWidth: 1.5,
    borderColor: '#8FA0B2',
    padding: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoTitle: {
    flex: 1,
    color: '#13293B',
    fontSize: 22,
    fontWeight: '900',
  },
  infoClose: {
    borderRadius: 999,
    backgroundColor: '#DDE7F0',
    borderWidth: 1,
    borderColor: '#A7B8C9',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoCloseText: {
    color: '#13293B',
    fontSize: 12,
    fontWeight: '900',
  },
  infoItem: {
    marginTop: 10,
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  outcomeCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  outcomeSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#22C55E',
  },
  outcomeFail: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F59E0B',
  },
  outcomeTitle: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  outcomeBody: {
    marginTop: 10,
    color: '#334155',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  outcomeActions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  outcomePrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  outcomePrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  outcomeSecondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  outcomeSecondaryText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
