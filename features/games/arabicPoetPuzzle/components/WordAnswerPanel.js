import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { desertTheme } from '../utils/theme';

export default function WordAnswerPanel({
  selectedWord,
  value,
  onChangeText,
  onSubmit,
  disabled = false,
}) {
  const colors = desertTheme.colors;

  return (
    <View style={[styles.card, { backgroundColor: colors.panelDark, borderColor: colors.cardBorder }]}>
      <Text style={[styles.label, { color: '#F9E7C7' }]}>اكتب الكلمة</Text>

      <View style={[styles.inputShell, { backgroundColor: colors.panelLight, borderColor: colors.cardBorder }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={!disabled && Boolean(selectedWord)}
          placeholder={selectedWord ? 'أدخل اللفظ هنا' : 'اختر كلمة من الشبكة أولًا'}
          placeholderTextColor="#9A7C5D"
          style={[styles.input, { color: colors.ink }]}
          textAlign="center"
        />
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.toolButton}>
          <Text style={styles.toolLabel}>بدّل</Text>
        </Pressable>
        <Pressable style={styles.toolButton}>
          <Text style={styles.toolLabel}>امسح</Text>
        </Pressable>
        <Pressable
          onPress={onSubmit}
          disabled={disabled || !selectedWord}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: disabled || !selectedWord ? '#A58D74' : colors.accent,
              borderColor: colors.accentDark,
            },
            pressed && !disabled && selectedWord && styles.pressed,
          ]}
        >
          <Text style={styles.submitLabel}>ثبّت الكلمة</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'right',
  },
  inputShell: {
    marginTop: 12,
    borderWidth: 2,
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  input: {
    fontSize: 28,
    fontWeight: '900',
    minHeight: 54,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row-reverse',
    gap: 8,
    alignItems: 'center',
  },
  toolButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: '#8A623B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#BC9360',
  },
  toolLabel: {
    color: '#FFF3DC',
    fontSize: 15,
    fontWeight: '900',
  },
  submitButton: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  submitLabel: {
    color: '#FFF8EB',
    fontSize: 17,
    fontWeight: '900',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
