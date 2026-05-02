import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ObjectSprite from './ObjectSprite';

function GoalFlag({ distanceLabel }) {
  return (
    <View style={styles.goalWrap}>
      <View style={styles.flagPole} />
      <View style={styles.flag}>
        <Text style={styles.flagText}>GOAL</Text>
      </View>
      <Text style={styles.distanceText}>{distanceLabel}</Text>
    </View>
  );
}

function ForceArrows() {
  return (
    <View style={styles.arrowsRow}>
      <View style={styles.arrowBody} />
      <View style={styles.arrowHead} />
      <View style={[styles.arrowHead, styles.arrowOffset1]} />
      <View style={[styles.arrowHead, styles.arrowOffset2]} />
    </View>
  );
}

export default function WorldScene({
  level,
  distance = 0,
  isRunning = false,
  motionDurationMs = 0,
  onPressObject,
}) {
  const worldWidth = 880;
  const trackStartX = 48;
  const trackEndX = worldWidth - 48;
  const trackLength = trackEndX - trackStartX;
  const objectWrapWidth = 90;

  const rulerLength = level?.world?.rulerLength || level?.world?.mapLength || 15;
  const targetDistance = level?.world?.targetDistance || 0;
  const clampedDistance = Math.max(0, Math.min(distance, rulerLength));
  const hasMountedRef = useRef(false);
  const previousDistanceRef = useRef(0);
  const animationFrameRef = useRef(null);
  const [animatedDistance, setAnimatedDistance] = useState(0);

  const getCenterXForDistance = useMemo(
    () => (meters) => {
      const clampedMeters = Math.max(0, Math.min(meters, rulerLength));
      return trackStartX + (trackLength * clampedMeters) / rulerLength;
    },
    [rulerLength, trackLength]
  );

  const goalCenterX = getCenterXForDistance(targetDistance);
  const objectX = useMemo(() => {
    return getCenterXForDistance(animatedDistance) - objectWrapWidth / 2;
  }, [animatedDistance, getCenterXForDistance]);

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const isFirstRender = !hasMountedRef.current;
    const targetChanged = Math.abs(previousDistanceRef.current - clampedDistance) > 0.01;
    const shouldResetInstantly = !isRunning && clampedDistance <= 0;
    const shouldAnimate = !isFirstRender && targetChanged && (isRunning || clampedDistance > 0);

    if (shouldResetInstantly) {
      setAnimatedDistance(0);
      previousDistanceRef.current = 0;
      hasMountedRef.current = true;
      return undefined;
    }

    if (!shouldAnimate) {
      setAnimatedDistance(clampedDistance);
      previousDistanceRef.current = clampedDistance;
      hasMountedRef.current = true;
      return undefined;
    }

    const startDistance = previousDistanceRef.current;
    const distanceDelta = clampedDistance - startDistance;
    const distanceRatio = Math.max(0.18, Math.abs(distanceDelta) / rulerLength);
    const visualDurationMs = level?.id === 'physics_lab_level_1'
      ? Math.max(900, Math.round(motionDurationMs || 0))
      : Math.max(
          4200,
          Math.round((motionDurationMs || 0) * 2.4),
          Math.round(distanceRatio * 12000)
        );
    const animationStartTime = Date.now();

    const step = () => {
      const elapsedMs = Date.now() - animationStartTime;
      const rawProgress = Math.min(1, elapsedMs / visualDurationMs);
      const easedProgress = rawProgress < 0.5
        ? 2 * rawProgress * rawProgress
        : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

      setAnimatedDistance(startDistance + distanceDelta * easedProgress);

      if (rawProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        previousDistanceRef.current = clampedDistance;
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
    hasMountedRef.current = true;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [clampedDistance, isRunning, motionDurationMs, rulerLength]);

  const meterMarks = useMemo(
    () =>
      Array.from({ length: rulerLength }, (_, index) => {
        const meter = index + 1;
        return {
          meter,
          left: getCenterXForDistance(meter),
        };
      }),
    [getCenterXForDistance, rulerLength]
  );

  return (
    <View style={styles.sceneWrap}>
      <View style={styles.world}>
        <View style={styles.trackArea}>
          <View style={[styles.startLabel, { left: trackStartX - 10 }]}>
            <Text style={styles.startLabelText}>START</Text>
          </View>

          <Pressable onPress={onPressObject} style={[styles.objectWrap, { left: objectX }]}>
            <ForceArrows />
            <ObjectSprite type={level?.objectType} size={level?.objectType === 'capsule' ? 54 : 46} />
          </Pressable>

          {level?.world?.obstacleType === 'gap' ? (
            <View style={styles.gapBlock}>
              <View style={styles.gapGlow} />
            </View>
          ) : null}

          {level?.world?.obstacleType === 'mountain' ? (
            <View style={styles.mountainWrap}>
              <View style={styles.mountainOne} />
              <View style={styles.mountainTwo} />
            </View>
          ) : null}

          <View
            style={[
              styles.goalColumn,
              {
                left: goalCenterX - 7,
              },
            ]}
          />

          <View style={[styles.goalAbsolute, { left: goalCenterX }]}>
            <GoalFlag distanceLabel={`${targetDistance}${level?.world?.markerUnit || 'm'}`} />
          </View>

          <View style={styles.surface} />
          <View style={styles.frictionBand} />
          <View style={[styles.markerLine, { left: trackStartX, right: worldWidth - trackEndX }]} />

          {meterMarks.map((mark) => (
            <View key={mark.meter} style={[styles.meterWrap, { left: mark.left - 12 }]}>
              <View style={styles.marker} />
              <Text style={styles.meterText}>{mark.meter}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sceneWrap: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#081826',
    borderWidth: 1,
    borderColor: '#27597B',
    marginBottom: 16,
  },
  world: {
    height: 280,
    backgroundColor: '#0B2235',
  },
  trackArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
  },
  startLabel: {
    position: 'absolute',
    top: 100,
    backgroundColor: '#394352',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  startLabelText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  objectWrap: {
    position: 'absolute',
    left: 0,
    bottom: 78,
    width: 90,
    alignItems: 'center',
  },
  arrowsRow: {
    position: 'absolute',
    left: -58,
    top: 10,
    width: 58,
    height: 18,
  },
  arrowBody: {
    position: 'absolute',
    right: 8,
    top: 7,
    width: 34,
    height: 4,
    backgroundColor: '#FF6E56',
  },
  arrowHead: {
    position: 'absolute',
    right: 0,
    top: 1,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FF6E56',
  },
  arrowOffset1: {
    right: 16,
    opacity: 0.75,
  },
  arrowOffset2: {
    right: 32,
    opacity: 0.5,
  },
  gapBlock: {
    position: 'absolute',
    left: 420,
    bottom: 54,
    width: 110,
    height: 64,
    backgroundColor: '#09131C',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#8593A0',
  },
  gapGlow: {
    position: 'absolute',
    left: 35,
    bottom: -32,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#86DBFF',
    opacity: 0.65,
  },
  mountainWrap: {
    position: 'absolute',
    right: 120,
    bottom: 92,
    width: 330,
    height: 180,
  },
  mountainOne: {
    position: 'absolute',
    left: 0,
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 110,
    borderRightWidth: 110,
    borderBottomWidth: 0,
    borderTopWidth: 150,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D8E1E9',
  },
  mountainTwo: {
    position: 'absolute',
    left: 120,
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 120,
    borderRightWidth: 120,
    borderBottomWidth: 0,
    borderTopWidth: 220,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#C9D4DE',
  },
  goalAbsolute: {
    position: 'absolute',
    bottom: 96,
  },
  goalColumn: {
    position: 'absolute',
    bottom: 36,
    width: 14,
    height: 82,
    borderRadius: 999,
    backgroundColor: '#22C55E',
    borderWidth: 2.5,
    borderColor: '#86EFAC',
    shadowColor: '#22C55E',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  goalWrap: {
    alignItems: 'center',
  },
  flagPole: {
    width: 4,
    height: 62,
    backgroundColor: '#F4F5F6',
  },
  flag: {
    position: 'absolute',
    right: -94,
    top: 4,
    backgroundColor: '#394352',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  flagText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  distanceText: {
    marginTop: 10,
    color: '#E7EEF5',
    fontSize: 15,
    fontWeight: '900',
  },
  surface: {
    height: 36,
    backgroundColor: '#E6EDF3',
    borderTopWidth: 2,
    borderTopColor: '#F9FBFD',
  },
  frictionBand: {
    height: 54,
    backgroundColor: '#2B3A49',
    borderTopWidth: 1,
    borderTopColor: '#6F8CA6',
  },
  markerLine: {
    position: 'absolute',
    bottom: 36,
    height: 3,
    backgroundColor: '#9AA5AF',
  },
  meterWrap: {
    position: 'absolute',
    bottom: 8,
    alignItems: 'center',
  },
  marker: {
    width: 3,
    height: 24,
    backgroundColor: '#D8E0E6',
  },
  meterText: {
    marginTop: 4,
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '800',
  },
});
