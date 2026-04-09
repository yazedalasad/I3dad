import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ChoiceButton({
  title,
  description,
  onPress,
  disabled = false,
  variant = 'primary',
  rightSlot = null,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant] || styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={[styles.title, variant === 'ghost' && styles.ghostTitle]}>
            {title}
          </Text>

          {description ? (
            <View style={styles.descriptionWrap}>
              <Text style={[styles.description, variant === 'ghost' && styles.ghostDescription]}>
                {description}
              </Text>
            </View>
          ) : null}
        </View>

        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  secondary: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: '#E2E8F0',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  rightSlot: {
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  ghostTitle: {
    color: '#1E293B',
  },
  descriptionWrap: {
    marginTop: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
  ghostDescription: {
    color: '#64748B',
  },
});
