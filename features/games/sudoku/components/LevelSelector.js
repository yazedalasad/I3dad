import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { SUDOKU_LEVEL_CONFIG } from '../utils/sudokuLevels';

export default function LevelSelector({
  unlockedLevel = 1,
  onSelect,
  onLockedPress,
  getLevelLabel,
  getHintsLabel,
  getMistakeRuleLabel,
  labels = {},
  isRTL = false,
}) {
  return (
    <View style={[styles.wrapper, isRTL && styles.rtl]}>
      {SUDOKU_LEVEL_CONFIG.map((config) => {
        const { level, hints, mistakeLimit } = config;
        const isLocked = level > unlockedLevel;

        return (
          <Pressable
            key={level}
            disabled={isLocked}
            onPress={() => {
              if (isLocked) {
                onLockedPress?.(level);
                return;
              }
              onSelect?.(level);
            }}
            style={({ pressed }) => [
              styles.card,
              isLocked ? styles.cardLocked : styles.cardOpen,
              pressed && !isLocked && styles.cardPressed,
            ]}
          >
            <View style={[styles.cardHeader, isRTL && styles.cardHeaderRtl]}>
              <Text
                style={[
                  styles.levelTitle,
                  isLocked && styles.levelTitleLocked,
                  isRTL && styles.rtlText,
                ]}
              >
                {getLevelLabel?.(level) || `Level ${level}`}
              </Text>
              {isLocked ? (
                <View style={styles.lockBadge}>
                  <FontAwesome name="lock" size={14} color="#64748B" />
                  <Text style={[styles.lockText, isRTL && styles.rtlText]}>
                    {labels.locked || 'Locked'}
                  </Text>
                </View>
              ) : null}
            </View>
            {!isLocked ? (
              <View style={[styles.metaRow, isRTL && styles.metaRowRtl]}>
                <Text style={[styles.metaText, isRTL && styles.rtlText]}>
                  {getHintsLabel?.(hints) || `Hints: ${hints}`}
                </Text>
                <Text style={[styles.metaText, isRTL && styles.rtlText]}>
                  {getMistakeRuleLabel?.(mistakeLimit != null) ||
                    (mistakeLimit != null ? `Limit: ${mistakeLimit}` : 'No limit')}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  rtl: {
    alignItems: 'stretch',
  },
  card: {
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 6,
  },
  cardOpen: {
    backgroundColor: '#FFFFFF',
    borderColor: '#BFDBFE',
  },
  cardPressed: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  cardLocked: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
    opacity: 0.55,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaRowRtl: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  metaText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  levelTitle: {
    color: '#1E3A8A',
    fontSize: 18,
    fontWeight: '900',
  },
  levelTitleLocked: {
    color: '#64748B',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '800',
  },
  rtlText: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
