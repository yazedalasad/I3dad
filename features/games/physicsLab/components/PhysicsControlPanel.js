import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function ControlCard({ control, value, accentColor, onDecrease, onIncrease, disabled = false }) {
  const ratio = (Number(value) - control.min) / (control.max - control.min || 1);
  const safeRatio = Math.max(0, Math.min(ratio, 1));

  return (
    <View style={styles.controlCard}>
      <View style={styles.topRow}>
        <Text style={styles.controlLabel}>{control.label}</Text>
        <Text style={styles.controlValue}>
          {value}
          {control.unit ? ` ${control.unit}` : ''}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={onDecrease} disabled={disabled} style={[styles.adjustButton, disabled && styles.disabled]}>
          <Text style={styles.adjustLabel}>-</Text>
        </Pressable>

        <View style={styles.barWrap}>
          <View style={styles.barBg} />
          <View
            style={[
              styles.barFill,
              {
                width: `${safeRatio * 100}%`,
                backgroundColor: accentColor,
              },
            ]}
          />
          <View
            style={[
              styles.knob,
              {
                left: `${safeRatio * 100}%`,
              },
            ]}
          />
        </View>

        <Pressable onPress={onIncrease} disabled={disabled} style={[styles.adjustButton, disabled && styles.disabled]}>
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
  onRetry,
  onPressConcept,
  showRetry = false,
  disabled = false,
  mainActionLabel,
  mainActionDisabled,
}) {
  const accentColor = level?.themeColor || '#3FA7FF';
  const resolvedMainActionLabel = mainActionLabel || (showRetry ? 'RETRY' : 'RUN');
  const mainActionHandler = showRetry ? onRetry : onRun;
  const mainActionStyle = showRetry ? styles.retryMainButton : styles.runButton;
  const resolvedMainActionDisabled = typeof mainActionDisabled === 'boolean' ? mainActionDisabled : disabled;

  return (
    <View style={styles.panel}>
      <View style={styles.headerStrip}>
        <View>
          <Text style={styles.panelEyebrow}>Compact Controls</Text>
          <Text style={styles.panelTitle}>Control Panel</Text>
        </View>

        <Pressable
          onPress={onPressConcept}
          disabled={disabled}
          style={({ pressed }) => [styles.conceptBadge, disabled && styles.disabled, pressed && onPressConcept && styles.pressedSmall]}
        >
          <Text style={styles.panelValue}>
            {level?.concept?.charAt(0)?.toUpperCase() + level?.concept?.slice(1)}
          </Text>
        </Pressable>
      </View>

      <View style={styles.controlsGrid}>
        {(level?.controls || []).map((control) => (
          <ControlCard
            key={control.key}
            control={control}
            value={params[control.key]}
            accentColor={accentColor}
            disabled={disabled}
            onDecrease={() => onDecrease(control)}
            onIncrease={() => onIncrease(control)}
          />
        ))}
      </View>

      <Pressable
        onPress={mainActionHandler}
        disabled={resolvedMainActionDisabled}
        style={({ pressed }) => [
          mainActionStyle,
          resolvedMainActionDisabled && styles.disabled,
          pressed && !resolvedMainActionDisabled && styles.pressed,
        ]}
      >
        <Text style={styles.runLabel}>{resolvedMainActionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#D7DFE8',
    borderWidth: 2,
    borderColor: '#8793A3',
    borderRadius: 22,
    padding: 12,
    shadowColor: '#00111D',
    shadowOpacity: 0.14,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  headerStrip: {
    backgroundColor: '#2D3745',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelEyebrow: {
    color: '#9FB3C8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  panelTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  conceptBadge: {
    backgroundColor: '#101A27',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#465465',
  },
  panelValue: {
    color: '#FFD36C',
    fontSize: 12,
    fontWeight: '800',
  },
  controlsGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  controlCard: {
    flex: 1,
    minWidth: 260,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.36)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17212B',
  },
  controlValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#17212B',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#32404F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: -1,
  },
  barWrap: {
    flex: 1,
    height: 20,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  barBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#5B6676',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    height: 10,
    borderRadius: 999,
  },
  knob: {
    position: 'absolute',
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F7F8FA',
    borderWidth: 2,
    borderColor: '#616B79',
  },
  runButton: {
    marginTop: 2,
    backgroundColor: '#29B53E',
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#117321',
  },
  retryMainButton: {
    marginTop: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C47A07',
  },
  runLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  pressedSmall: {
    transform: [{ scale: 0.97 }],
  },
});
