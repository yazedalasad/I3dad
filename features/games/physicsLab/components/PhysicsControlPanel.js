import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function ControlRow({ control, value, accentColor, onDecrease, onIncrease }) {
  const ratio = (Number(value) - control.min) / (control.max - control.min || 1);

  return (
    <View style={styles.controlRow}>
      <View style={styles.topRow}>
        <Text style={styles.controlLabel}>{control.label}</Text>
        <Text style={styles.controlValue}>
          {value}
          {control.unit ? ` ${control.unit}` : ''}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={onDecrease} style={styles.adjustButton}>
          <Text style={styles.adjustLabel}>−</Text>
        </Pressable>

        <View style={styles.barWrap}>
          <View style={styles.barBg} />
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.max(0, Math.min(ratio * 100, 100))}%`,
                backgroundColor: accentColor,
              },
            ]}
          />
          <View
            style={[
              styles.knob,
              {
                left: `${Math.max(0, Math.min(ratio * 100, 100))}%`,
              },
            ]}
          />
        </View>

        <Pressable onPress={onIncrease} style={styles.adjustButton}>
          <Text style={styles.adjustLabel}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PhysicsControlPanel({
  level,
  params,
  onDecrease,
  onIncrease,
  onRun,
  disabled = false,
}) {
  const accentColor = level?.themeColor || '#3FA7FF';

  return (
    <View style={styles.panel}>
      <View style={styles.headerStrip}>
        <Text style={styles.panelTitle}>Control Panel</Text>
        <Text style={styles.panelValue}>
          {level?.concept?.charAt(0)?.toUpperCase() + level?.concept?.slice(1)}
        </Text>
      </View>

      {(level?.controls || []).map((control) => (
        <ControlRow
          key={control.key}
          control={control}
          value={params[control.key]}
          accentColor={accentColor}
          onDecrease={() => onDecrease(control)}
          onIncrease={() => onIncrease(control)}
        />
      ))}

      <Pressable
        onPress={onRun}
        disabled={disabled}
        style={({ pressed }) => [
          styles.runButton,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Text style={styles.runLabel}>RUN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#DCE3EA',
    borderWidth: 2,
    borderColor: '#7C8796',
    borderRadius: 26,
    padding: 16,
    shadowColor: '#00111D',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerStrip: {
    backgroundColor: '#2D3745',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panelTitle: {
    color: '#FFD36C',
    fontSize: 18,
    fontWeight: '800',
  },
  panelValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  controlRow: {
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17212B',
  },
  controlValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#17212B',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#32404F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustLabel: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: -2,
  },
  barWrap: {
    flex: 1,
    height: 28,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  barBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#5B6676',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    height: 14,
    borderRadius: 999,
  },
  knob: {
    position: 'absolute',
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F7F8FA',
    borderWidth: 2,
    borderColor: '#616B79',
  },
  runButton: {
    marginTop: 6,
    backgroundColor: '#29B53E',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#117321',
  },
  runLabel: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
