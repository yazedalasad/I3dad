import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
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

export default function WorldScene({ level, distance = 0, isRunning = false }) {
  const worldWidth = 880;
  const objectStart = 110;
  const usableWidth = worldWidth - 180;
  const translateX = useRef(new Animated.Value(objectStart)).current;

  const mapLength = level?.world?.mapLength || 12;
  const goalX = objectStart + usableWidth * ((level?.world?.targetDistance || 0) / mapLength);

  const targetX = useMemo(() => {
    return objectStart + usableWidth * (Math.max(0, Math.min(distance, mapLength)) / mapLength);
  }, [distance, mapLength]);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: targetX,
      duration: isRunning ? 850 : 0,
      useNativeDriver: true,
    }).start();
  }, [targetX, isRunning, translateX]);

  return (
    <View style={styles.sceneWrap}>
      <View style={styles.world}>
        <View style={styles.trackArea}>
          <View style={styles.startLabel}>
            <Text style={styles.startLabelText}>START</Text>
          </View>

          <Animated.View style={[styles.objectWrap, { transform: [{ translateX }] }]}>
            <ForceArrows />
            <ObjectSprite type={level?.objectType} size={level?.objectType === 'capsule' ? 54 : 46} />
          </Animated.View>

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

          <View style={[styles.goalAbsolute, { left: goalX }]}>
            <GoalFlag distanceLabel={`${level?.world?.targetDistance}${level?.world?.markerUnit || 'm'}`} />
          </View>

          <View style={styles.surface} />
          <View style={styles.frictionBand} />
          <View style={styles.markerLine} />
          {Array.from({ length: 7 }).map((_, index) => (
            <View key={index} style={[styles.marker, { left: 30 + index * 120 }]} />
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
    left: 24,
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
    bottom: 92,
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
    fontSize: 14,
    fontWeight: '700',
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
    left: 24,
    right: 24,
    bottom: 27,
    height: 4,
    backgroundColor: '#9AA5AF',
  },
  marker: {
    position: 'absolute',
    bottom: 18,
    width: 3,
    height: 22,
    backgroundColor: '#D8E0E6',
  },
});
