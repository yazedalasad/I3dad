// components/AdaptiveTest/PersonalityQuestionCard.js
import { useMemo } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

function safeNum(x, f = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : f;
}

export default function PersonalityQuestionCard({
  question,
  language = 'ar',

  // controlled values
  scaleValue,
  onScaleChange,

  choiceIndex,
  onChoiceChange,

  textValue,
  onTextChange,
}) {
  const isArabic = String(language).toLowerCase() !== 'he';

  const qText = useMemo(() => {
    if (!question) return '';
    return (isArabic ? question.question_text_ar : question.question_text_he)
      || question.question_text_en
      || '';
  }, [question, isArabic]);

  const options = useMemo(() => {
    const raw = question?.options;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [question]);

  /* ------------------ renderers ------------------ */

  function renderScale10() {
    const min = safeNum(question?.scale_min, 1);
    const max = safeNum(question?.scale_max, 10);
    const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    return (
      <View style={styles.scaleGrid}>
        {values.map((v) => {
          const active = Number(scaleValue) === v;
          return (
            <Pressable
              key={String(v)}
              onPress={() => onScaleChange?.(v)}
              style={({ pressed }) => [
                styles.scaleBtn,
                active && styles.scaleBtnActive,
                pressed && !active && styles.scaleBtnPressed,
              ]}
            >
              <Text style={[styles.scaleText, active && styles.scaleTextActive]}>
                {v}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderMultipleChoice() {
    if (!options.length) {
      return (
        <Text style={styles.muted}>
          {isArabic ? 'لا توجد خيارات.' : 'אין אפשרויות.'}
        </Text>
      );
    }

    return (
      <View style={styles.choiceList}>
        {options.map((opt, idx) => {
          const label =
            (isArabic ? opt.ar : opt.he) ?? opt.en ?? `Option ${idx + 1}`;

          const active = choiceIndex === idx;

          return (
            <Pressable
              key={String(idx)}
              onPress={() => onChoiceChange?.(idx)}
              style={({ pressed }) => [
                styles.choiceItem,
                active && styles.choiceItemActive,
                pressed && !active && styles.choiceItemPressed,
              ]}
            >
              <View style={[styles.radio, active && styles.radioActive]} />
              <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderOpenEnded() {
    return (
      <View style={styles.inputBox}>
        <TextInput
          value={textValue}
          onChangeText={onTextChange}
          placeholder={
            isArabic ? 'اكتب إجابتك هنا...' : 'כתוב/כתבי כאן...'
          }
          placeholderTextColor="#94A3B8"
          multiline
          style={styles.textArea}
          textAlignVertical="top"
        />
      </View>
    );
  }

  function renderByType() {
    switch (question?.question_type) {
      case 'scale_10':
        return renderScale10();
      case 'multiple_choice':
        return renderMultipleChoice();
      case 'open_ended':
        return renderOpenEnded();

      /* 🚀 FUTURE TYPES */
      case 'forced_choice':
        return (
          <Text style={styles.muted}>
            Forced choice type (A vs B) — UI coming soon
          </Text>
        );

      case 'ranking':
        return (
          <Text style={styles.muted}>
            Ranking type — UI coming soon
          </Text>
        );

      default:
        return (
          <Text style={styles.muted}>
            {isArabic ? 'نوع سؤال غير مدعوم.' : 'סוג שאלה לא נתמך.'}
          </Text>
        );
    }
  }

  /* ------------------ layout ------------------ */

  return (
    <View style={styles.card}>
      <Text style={styles.questionText}>{qText}</Text>
      <View style={styles.body}>{renderByType()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
  },

  questionText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 24,
  },

  body: {
    marginTop: 14,
  },

  /* ---------- scale ---------- */

  scaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  scaleBtn: {
    width: '18%',
    minWidth: 46,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  scaleBtnActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#1E4FBF',
  },
  scaleBtnPressed: { transform: [{ scale: 0.98 }] },
  scaleText: { fontWeight: '800', color: '#0F172A' },
  scaleTextActive: { color: '#1E40AF' },

  /* ---------- choice ---------- */

  choiceList: { gap: 10 },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  choiceItemActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#1E4FBF',
  },
  choiceItemPressed: { transform: [{ scale: 0.99 }] },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#94A3B8',
    marginRight: 10,
  },
  radioActive: {
    borderColor: '#1E4FBF',
    backgroundColor: '#1E4FBF',
  },
  choiceText: { flex: 1, fontWeight: '800', color: '#0F172A' },
  choiceTextActive: { color: '#1E40AF' },

  /* ---------- open ---------- */

  inputBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
  },
  textArea: {
    minHeight: 120,
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },

  muted: {
    color: '#64748B',
    fontWeight: '700',
  },
});
