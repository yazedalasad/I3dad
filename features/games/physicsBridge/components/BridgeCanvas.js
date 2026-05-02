import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

let SvgModule = null;

try {
  SvgModule = require('react-native-svg');
} catch {
  SvgModule = null;
}

const Svg = SvgModule?.Svg;
const Line = SvgModule?.Line;

function RotatedBeam({ from, to }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = `${Math.atan2(dy, dx)}rad`;
  const middleX = (from.x + to.x) / 2;
  const middleY = (from.y + to.y) / 2;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.fallbackBeam,
        {
          left: middleX - length / 2,
          top: middleY - 4,
          width: length,
          transform: [{ rotate: angle }],
        },
      ]}
    />
  );
}

function ToolButton({ label, active = false }) {
  return (
    <View style={[styles.toolButton, active && styles.toolButtonActive]}>
      <Text style={styles.toolButtonText}>{label}</Text>
    </View>
  );
}

function TruckSprite({ left, top }) {
  return (
    <View pointerEvents="none" style={[styles.truckWrap, { left, top }]}>
      <View style={styles.truckCargoBox} />
      <View style={styles.truckCab} />
      <View style={styles.truckWindow} />
      <View style={styles.truckHood} />
      <View style={styles.truckBumper} />
      <View style={styles.truckWheelRow}>
        <View style={styles.truckWheel} />
        <View style={styles.truckWheel} />
        <View style={styles.truckWheel} />
      </View>
      <View style={styles.truckWheelInnerRow}>
        <View style={styles.truckWheelInner} />
        <View style={styles.truckWheelInner} />
        <View style={styles.truckWheelInner} />
      </View>
    </View>
  );
}

function getNodeDisplayLabel(level, nodeId) {
  const index = level.nodes.findIndex((node) => node.id === nodeId);
  return index >= 0 ? String(index + 1) : nodeId;
}

export default function BridgeCanvas({
  level,
  beams,
  selectedNode,
  onNodePress,
  completed = false,
  labels = {},
}) {
  const nodeMap = useMemo(
    () =>
      level.nodes.reduce((accumulator, node) => {
        accumulator[node.id] = node;
        return accumulator;
      }, {}),
    [level.nodes]
  );

  const groundNodes = useMemo(
    () => level.nodes.filter((node) => node.type === 'ground').sort((a, b) => a.x - b.x),
    [level.nodes]
  );

  const leftGround = groundNodes[0];
  const rightGround = groundNodes[groundNodes.length - 1];
  const roadTop = Math.max(leftGround?.y || 250, rightGround?.y || 250) - 12;
  const leftBankRight = Math.max(88, (leftGround?.x || 40) + 32);
  const rightBankLeft = Math.max(leftBankRight + 110, (rightGround?.x || 280) - 10);
  const riverRightInset = Math.max(0, 380 - rightBankLeft);
  const carStartLeft = Math.max(10, leftBankRight - 74);
  const carEndLeft = Math.max(rightBankLeft + 28, 320);
  const carTop = roadTop - 38;
  const flagPoleLeft = Math.max(rightBankLeft + 40, 338);

  const carProgress = useRef(new Animated.Value(completed ? 1 : 0)).current;

  useEffect(() => {
    if (completed) {
      Animated.timing(carProgress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      carProgress.stopAnimation();
      carProgress.setValue(0);
    }
  }, [carProgress, completed]);

  const carLeft = carProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [carStartLeft, carEndLeft],
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.skyLayer}>
        <View style={[styles.cloud, { top: 42, left: 26 }]} />
        <View style={[styles.cloud, { top: 60, left: 190, width: 74 }]} />
        <View style={[styles.cloud, { top: 35, right: 86, width: 78 }]} />
      </View>

      <View style={styles.mountainsLayer} pointerEvents="none">
        <View style={[styles.mountain, styles.mountainOne]} />
        <View style={[styles.mountain, styles.mountainTwo]} />
        <View style={[styles.mountain, styles.mountainThree]} />
        <View style={[styles.mountain, styles.mountainFour]} />
      </View>

      <View style={styles.rightTools} pointerEvents="none">
        <ToolButton label="↔" />
        <ToolButton label="✂" />
        <ToolButton label="↺" active />
        <ToolButton label="♻" />
      </View>

      <View style={styles.canvas}>
        <View style={styles.gridOverlay} pointerEvents="none">
          {Array.from({ length: 10 }).map((_, index) => (
            <View key={`horizontal-${index}`} style={[styles.gridLineHorizontal, { top: index * 42 }]} />
          ))}
          {Array.from({ length: 12 }).map((_, index) => (
            <View key={`vertical-${index}`} style={[styles.gridLineVertical, { left: index * 32 }]} />
          ))}
        </View>

        <View
          pointerEvents="none"
          style={[styles.leftBank, { top: roadTop + 14, left: 0, width: leftBankRight, bottom: 0 }]}
        />
        <View
          pointerEvents="none"
          style={[styles.rightBank, { top: roadTop + 14, left: rightBankLeft, right: 0, bottom: 0 }]}
        />
        <View
          pointerEvents="none"
          style={[styles.waterStrip, { top: roadTop + 16, left: leftBankRight, right: riverRightInset, bottom: 0 }]}
        />

        <View style={[styles.roadCap, { left: 0, width: leftBankRight, top: roadTop }]} />
        <View style={[styles.roadCap, { left: rightBankLeft, right: 0, top: roadTop }]} />
        <View style={[styles.groundPlatform, { left: 0, width: leftBankRight, top: roadTop + 10 }]} />
        <View style={[styles.groundPlatform, { left: rightBankLeft, right: 0, top: roadTop + 10 }]} />

        <Animated.View style={{ position: 'absolute', left: carLeft, top: carTop, zIndex: 6 }}>
          <TruckSprite left={0} top={0} />
        </Animated.View>

        <View pointerEvents="none" style={[styles.finishZone, { left: flagPoleLeft - 10, top: roadTop - 10 }]}>
          <View style={[styles.flagPole, { height: completed ? 96 : 64 }]} />
          <View style={[styles.flag, completed ? styles.flagRaised : styles.flagIdle, { top: completed ? 2 : 24 }]} />
          {completed ? (
            <View style={styles.winBubble}>
              <Text style={styles.winBubbleText}>{labels.win || 'فزت!'}</Text>
            </View>
          ) : (
            <Text style={styles.finishText}>{labels.finish || 'النهاية'}</Text>
          )}
        </View>

        {Svg && Line ? (
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            {beams.map((beam) => {
              const [fromId, toId] = beam.split('-');
              const fromNode = nodeMap[fromId];
              const toNode = nodeMap[toId];

              if (!fromNode || !toNode) return null;

              return (
                <Line
                  key={beam}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="#FF7A16"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              );
            })}
          </Svg>
        ) : (
          beams.map((beam) => {
            const [fromId, toId] = beam.split('-');
            const fromNode = nodeMap[fromId];
            const toNode = nodeMap[toId];

            if (!fromNode || !toNode) return null;

            return <RotatedBeam key={beam} from={fromNode} to={toNode} />;
          })
        )}

        {level.nodes.map((node) => {
          const isSelected = selectedNode === node.id;
          const isSupport = node.type === 'support';
          const isGround = node.type === 'ground';

          return (
            <Pressable
              key={node.id}
              style={[
                styles.node,
                isSupport ? styles.supportNode : isGround ? styles.groundNode : styles.jointNode,
                isSelected && styles.selectedNode,
                {
                  left: node.x - 14,
                  top: node.y - 14,
                },
              ]}
              onPress={() => onNodePress(node.id)}
            >
              <Text style={styles.nodeText}>{getNodeDisplayLabel(level, node.id)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#93C5FD',
    backgroundColor: '#94C8E8',
    position: 'relative',
  },
  skyLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#8DC1E6',
  },
  cloud: {
    position: 'absolute',
    width: 58,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  mountainsLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 86,
    height: 150,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  mountain: {
    width: 0,
    height: 0,
    borderLeftWidth: 54,
    borderRightWidth: 54,
    borderBottomWidth: 76,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(58, 97, 132, 0.45)',
  },
  mountainOne: {
    borderBottomWidth: 66,
  },
  mountainTwo: {
    borderBottomWidth: 90,
  },
  mountainThree: {
    borderBottomWidth: 72,
  },
  mountainFour: {
    borderBottomWidth: 112,
  },
  rightTools: {
    position: 'absolute',
    right: 10,
    top: 78,
    gap: 12,
    zIndex: 4,
  },
  toolButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F15E6D',
    borderWidth: 2,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7F1D1D',
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  toolButtonActive: {
    backgroundColor: '#EF4444',
  },
  toolButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  canvas: {
    position: 'relative',
    height: 420,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(219, 234, 254, 0.18)',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  leftBank: {
    position: 'absolute',
    backgroundColor: '#A4B877',
    borderTopWidth: 6,
    borderTopColor: '#5B7A34',
  },
  rightBank: {
    position: 'absolute',
    backgroundColor: '#A4B877',
    borderTopWidth: 6,
    borderTopColor: '#5B7A34',
  },
  waterStrip: {
    position: 'absolute',
    backgroundColor: '#6C96C9',
    borderTopWidth: 4,
    borderTopColor: 'rgba(255,255,255,0.45)',
  },
  truckWrap: {
    width: 72,
    height: 40,
  },
  truckCargoBox: {
    position: 'absolute',
    left: 0,
    top: 9,
    width: 34,
    height: 16,
    backgroundColor: '#F59E0B',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  truckCab: {
    position: 'absolute',
    left: 34,
    top: 11,
    width: 17,
    height: 14,
    backgroundColor: '#F59E0B',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 2,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  truckWindow: {
    position: 'absolute',
    left: 38,
    top: 14,
    width: 9,
    height: 7,
    backgroundColor: '#E0F2FE',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  truckHood: {
    position: 'absolute',
    left: 50,
    top: 15,
    width: 12,
    height: 10,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  truckBumper: {
    position: 'absolute',
    left: 61,
    top: 18,
    width: 6,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
  },
  truckWheelRow: {
    position: 'absolute',
    left: 6,
    top: 24,
    width: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  truckWheelInnerRow: {
    position: 'absolute',
    left: 9,
    top: 27,
    width: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  truckWheel: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#64748B',
  },
  truckWheelInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  finishZone: {
    position: 'absolute',
    width: 56,
    height: 120,
    zIndex: 6,
    alignItems: 'center',
  },
  flagPole: {
    position: 'absolute',
    left: 8,
    top: 0,
    width: 4,
    backgroundColor: '#475569',
    borderRadius: 4,
  },
  flag: {
    position: 'absolute',
    left: 12,
    width: 24,
    height: 16,
    backgroundColor: '#EF4444',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  flagIdle: {
    opacity: 0.9,
  },
  flagRaised: {
    backgroundColor: '#22C55E',
    borderColor: '#BBF7D0',
  },
  finishText: {
    position: 'absolute',
    top: -18,
    right: -6,
    color: '#1E3A8A',
    fontSize: 11,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  winBubble: {
    position: 'absolute',
    top: -24,
    right: -10,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#BBF7D0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  winBubbleText: {
    color: '#052E16',
    fontSize: 11,
    fontWeight: '900',
  },
  roadCap: {
    position: 'absolute',
    height: 12,
    backgroundColor: '#4B5563',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    zIndex: 4,
  },
  groundPlatform: {
    position: 'absolute',
    height: 28,
    backgroundColor: '#65A30D',
    borderTopWidth: 5,
    borderTopColor: '#7C5A12',
    borderRadius: 12,
    zIndex: 3,
  },
  fallbackBeam: {
    position: 'absolute',
    height: 8,
    backgroundColor: '#FF7A16',
    borderRadius: 999,
  },
  node: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    zIndex: 5,
  },
  jointNode: {
    borderColor: '#C7D2FE',
  },
  groundNode: {
    borderColor: '#8B5CF6',
  },
  supportNode: {
    borderColor: '#60A5FA',
  },
  selectedNode: {
    borderColor: '#7C3AED',
    transform: [{ scale: 1.08 }],
  },
  nodeText: {
    fontWeight: '900',
    color: '#4C1D95',
    fontSize: 12,
  },
});
