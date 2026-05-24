import React from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDuration } from '../../shared/utils/gameHelpers';
import { SUDOKU_COLORS } from '../utils/sudokuTheme';

function StatChip({ icon, label, value, isRTL }) {
  return (
    <View style={[styles.statChip, isRTL && styles.statChipRtl]}>
      <View style={[styles.statIconWrap, isRTL && styles.rtlRow]}>
        <FontAwesome name={icon} size={14} color={SUDOKU_COLORS.primary} />
        <Text style={[styles.statLabel, isRTL && styles.rtlText]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, isRTL && styles.rtlText]}>{value}</Text>
    </View>
  );
}

export default function GameHeader({
  title,
  subtitle,
  seconds = 0,
  mistakes = 0,
  maxMistakes = 3,
  hasMistakeLimit = true,
  hintsLeft = 0,
  maxHints = 3,
  onPause,
  onReset,
  onHint,
  onExit,
  labels = {},
  isRTL = true,
  isPaused = false,
}) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.topRow, isRTL && styles.rtlRow]}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, isRTL && styles.rtlText]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, isRTL && styles.rtlText]}>{subtitle}</Text> : null}
        </View>
        {onExit ? (
          <Pressable
            onPress={onExit}
            style={({ pressed }) => [styles.exitBtn, isRTL && styles.rtlRow, pressed && styles.pressed]}
          >
            <FontAwesome
              name={isRTL ? 'arrow-left' : 'arrow-right'}
              size={14}
              color={SUDOKU_COLORS.primaryDark}
            />
            <Text style={[styles.exitText, isRTL && styles.rtlText]}>{labels.exit || 'Exit'}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.statsRow, isRTL && styles.rtlRow]}>
        <StatChip
          icon="clock-o"
          label={labels.time || 'Time'}
          value={formatDuration(seconds)}
          isRTL={isRTL}
        />
        <StatChip
          icon="times-circle"
          label={labels.mistakes || 'Mistakes'}
          value={
            hasMistakeLimit && maxMistakes != null
              ? `${mistakes}/${maxMistakes}`
              : String(mistakes)
          }
          isRTL={isRTL}
        />
        <StatChip
          icon="lightbulb-o"
          label={labels.hints || 'Hints'}
          value={maxHints != null ? `${hintsLeft}/${maxHints}` : String(hintsLeft)}
          isRTL={isRTL}
        />
      </View>

      <View style={[styles.actionsRow, isRTL && styles.rtlRow]}>
        <Pressable
          onPress={onPause}
          style={({ pressed }) => [styles.actionBtn, styles.outlineBtn, pressed && styles.pressed]}
        >
          <FontAwesome
            name={isPaused ? 'play' : 'pause'}
            size={14}
            color={SUDOKU_COLORS.primary}
            style={styles.btnIcon}
          />
          <Text style={[styles.actionText, isRTL && styles.rtlText]}>
            {labels.pause || 'Pause'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [styles.actionBtn, styles.outlineBtn, pressed && styles.pressed]}
        >
          <FontAwesome name="refresh" size={14} color={SUDOKU_COLORS.primary} style={styles.btnIcon} />
          <Text style={[styles.actionText, isRTL && styles.rtlText]}>{labels.reset || 'Reset'}</Text>
        </Pressable>
        <Pressable
          onPress={onHint}
          style={({ pressed }) => [styles.actionBtn, styles.primaryBtn, pressed && styles.pressed]}
        >
          <FontAwesome name="magic" size={14} color="#FFFFFF" style={styles.btnIcon} />
          <Text style={[styles.actionText, styles.primaryBtnText, isRTL && styles.rtlText]}>
            {labels.hint || 'Hint'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
    marginBottom: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: SUDOKU_COLORS.primaryDark,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 15,
    color: SUDOKU_COLORS.chipLabel,
    lineHeight: 20,
    textTransform: 'capitalize',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: SUDOKU_COLORS.chipBg,
    borderWidth: 1,
    borderColor: SUDOKU_COLORS.chipBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  exitText: {
    color: SUDOKU_COLORS.primaryDark,
    fontWeight: '800',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  statChip: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    backgroundColor: SUDOKU_COLORS.chipBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SUDOKU_COLORS.chipBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  statChipRtl: {
    alignItems: 'flex-end',
  },
  statIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    color: SUDOKU_COLORS.chipLabel,
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    color: SUDOKU_COLORS.chipValue,
    fontSize: 18,
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  outlineBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: SUDOKU_COLORS.chipBorder,
  },
  primaryBtn: {
    backgroundColor: SUDOKU_COLORS.primary,
    borderWidth: 1.5,
    borderColor: SUDOKU_COLORS.primaryDark,
  },
  btnIcon: {
    marginRight: 6,
  },
  actionText: {
    color: SUDOKU_COLORS.primary,
    fontWeight: '800',
    fontSize: 15,
  },
  primaryBtnText: {
    color: '#FFFFFF',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
});
