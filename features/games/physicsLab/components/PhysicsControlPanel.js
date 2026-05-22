import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

function normalizeNumberText(value) {
  return String(value ?? '').replace(',', '.').replace(/[^\d.-]/g, '');
}

function ControlCard({ control, value, accentColor, onDecrease, onIncrease, onChangeValue, disabled = false, compact = false }) {
  const [draftValue, setDraftValue] = useState(String(value ?? ''));

  useEffect(() => {
    setDraftValue(String(value ?? ''));
  }, [value]);

  function commitDraft() {
    const normalized = normalizeNumberText(draftValue);
    const numeric = Number(normalized);

    if (normalized === '') {
      onChangeValue?.(control, '');
      return;
    }

    if (!Number.isFinite(numeric)) {
      setDraftValue(String(value ?? ''));
      return;
    }

    onChangeValue?.(control, numeric);
  }

  function handleChangeText(text) {
    const normalized = normalizeNumberText(text);
    setDraftValue(normalized);

    if (normalized === '' || Number.isFinite(Number(normalized))) {
      onChangeValue?.(control, normalized);
    }
  }

  return (
    <View style={[styles.controlCard, compact && styles.controlCardCompact]}>
      <View style={styles.topRow}>
        <Text style={[styles.controlLabel, compact && styles.controlLabelCompact]}>{control.label}</Text>
        <Text style={[styles.controlValue, compact && styles.controlValueCompact]}>
          {value}
          {control.unit ? ` ${control.unit}` : ''}
        </Text>
      </View>

      <View style={[styles.actionRow, compact && styles.actionRowCompact]}>
        <Pressable onPress={onDecrease} disabled={disabled} style={[styles.adjustButton, compact && styles.adjustButtonCompact, disabled && styles.disabled]}>
          <Text style={[styles.adjustLabel, compact && styles.adjustLabelCompact]}>-</Text>
        </Pressable>

        <View style={[styles.numberInputWrap, compact && styles.numberInputWrapCompact, { borderColor: accentColor }]}>
          <TextInput
            value={draftValue}
            placeholder="Enter number"
            placeholderTextColor="#94A3B8"
            onChangeText={handleChangeText}
            onBlur={commitDraft}
            onSubmitEditing={commitDraft}
            editable={!disabled}
            keyboardType="decimal-pad"
            selectTextOnFocus
            style={[styles.numberInput, compact && styles.numberInputCompact]}
            accessibilityLabel={`${control.label} value`}
          />
          {!!control.unit && <Text style={[styles.unitLabel, compact && styles.unitLabelCompact]}>{control.unit}</Text>}
          <Text style={[styles.rangeHint, compact && styles.rangeHintCompact]}>
            {control.min}-{control.max}
          </Text>
        </View>

        <Pressable onPress={onIncrease} disabled={disabled} style={[styles.adjustButton, compact && styles.adjustButtonCompact, disabled && styles.disabled]}>
          <Text style={[styles.adjustLabel, compact && styles.adjustLabelCompact]}>+</Text>
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
  onChangeValue,
  onRun,
  onRetry,
  onPressConcept,
  showRetry = false,
  disabled = false,
  mainActionLabel,
  mainActionDisabled,
  compact = false,
}) {
  const accentColor = level?.themeColor || '#3FA7FF';
  const resolvedMainActionLabel = mainActionLabel || (showRetry ? 'RETRY' : 'RUN');
  const mainActionHandler = showRetry ? onRetry : onRun;
  const mainActionStyle = showRetry ? styles.retryMainButton : styles.runButton;
  const resolvedMainActionDisabled = typeof mainActionDisabled === 'boolean' ? mainActionDisabled : disabled;

  return (
    <View style={[styles.panel, compact && styles.panelCompact]}>
      <View style={[styles.headerStrip, compact && styles.headerStripCompact]}>
        <View>
          <Text style={[styles.panelEyebrow, compact && styles.panelEyebrowCompact]}>Compact Controls</Text>
          <Text style={[styles.panelTitle, compact && styles.panelTitleCompact]}>Control Panel</Text>
        </View>

        <Pressable
          onPress={onPressConcept}
          disabled={disabled}
          style={({ pressed }) => [styles.conceptBadge, compact && styles.conceptBadgeCompact, disabled && styles.disabled, pressed && onPressConcept && styles.pressedSmall]}
        >
          <Text style={[styles.panelValue, compact && styles.panelValueCompact]}>
            {level?.concept?.charAt(0)?.toUpperCase() + level?.concept?.slice(1)}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.controlsGrid, compact && styles.controlsGridCompact]}>
        {(level?.controls || []).map((control) => (
          <ControlCard
            key={control.key}
            control={control}
            value={params[control.key]}
            accentColor={accentColor}
            disabled={disabled}
            onDecrease={() => onDecrease(control)}
            onIncrease={() => onIncrease(control)}
            onChangeValue={onChangeValue}
            compact={compact}
          />
        ))}
      </View>

      <Pressable
        onPress={mainActionHandler}
        disabled={resolvedMainActionDisabled}
        style={({ pressed }) => [
          mainActionStyle,
          resolvedMainActionDisabled && styles.disabled,
          compact && styles.runButtonCompact,
          pressed && !resolvedMainActionDisabled && styles.pressed,
        ]}
      >
        <Text style={[styles.runLabel, compact && styles.runLabelCompact]}>{resolvedMainActionLabel}</Text>
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
  panelCompact: {
    borderRadius: 18,
    padding: 8,
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
  headerStripCompact: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  panelEyebrow: {
    color: '#9FB3C8',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  panelEyebrowCompact: {
    fontSize: 8,
  },
  panelTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  panelTitleCompact: {
    fontSize: 16,
  },
  conceptBadge: {
    backgroundColor: '#101A27',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#465465',
  },
  conceptBadgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  panelValue: {
    color: '#FFD36C',
    fontSize: 17,
    fontWeight: '800',
  },
  panelValueCompact: {
    fontSize: 16,
  },
  controlsGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  controlsGridCompact: {
    gap: 6,
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
  controlCardCompact: {
    minWidth: 0,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17212B',
  },
  controlLabelCompact: {
    fontSize: 17,
  },
  controlValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#17212B',
  },
  controlValueCompact: {
    fontSize: 17,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionRowCompact: {
    gap: 6,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#32404F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonCompact: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  adjustLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: -1,
  },
  adjustLabelCompact: {
    fontSize: 17,
  },
  numberInputWrap: {
    flex: 1,
    minHeight: 48,
    borderWidth: 2,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  numberInputWrapCompact: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  numberInput: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 8,
    paddingHorizontal: 0,
    color: '#17212B',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    outlineStyle: 'none',
  },
  numberInputCompact: {
    minWidth: 44,
    fontSize: 18,
  },
  unitLabel: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  unitLabelCompact: {
    fontSize: 16,
    marginLeft: 5,
  },
  rangeHint: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
  },
  rangeHintCompact: {
    fontSize: 9,
    marginLeft: 6,
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
  runButtonCompact: {
    borderRadius: 13,
    paddingVertical: 9,
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
  runLabelCompact: {
    fontSize: 17,
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
