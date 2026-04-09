import React, { useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { ProgressBar, ScreenContainer } from '../../shared';
import { desertTheme } from '../utils/theme';
import { useArabicPoetPuzzle } from '../hooks/useArabicPoetPuzzle';
import PoetPuzzleBoard from '../components/PoetPuzzleBoard';
import HintCard from '../components/HintCard';
import WordAnswerPanel from '../components/WordAnswerPanel';
import FeedbackPanel from '../components/FeedbackPanel';
import WordListChips from '../components/WordListChips';

export default function ArabicPoetPuzzleLevelScreen({ route, navigation }) {
  const levelId = route?.params?.levelId || 'arabic_poet_puzzle_level_1';
  const studentId = route?.params?.studentId || 'demo-student-id';
  const colors = desertTheme.colors;

  const {
    level,
    selectedWord,
    selectWord,
    draftAnswer,
    setDraftAnswer,
    solvedMap,
    feedback,
    progress,
    startLevel,
    submitAnswer,
  } = useArabicPoetPuzzle({ levelId });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    startLevel(studentId).catch(() => {});
  }, [studentId]);

  async function handleSubmit() {
    try {
      setSubmitting(true);
      const result = await submitAnswer();

      if (result?.completed) {
        navigation?.replace?.('ArabicPoetPuzzleResult', {
          levelId,
          result,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ImageBackground
      source={require('../assets/desert-theme-bg.png')}
      resizeMode="cover"
      style={styles.flex}
    >
      <ScreenContainer scroll style={styles.transparent}>
        <View style={[styles.titleCard, { backgroundColor: 'rgba(232,216,191,0.94)', borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.ink }]}>{level.title}</Text>
          <Text style={[styles.subtitle, { color: colors.accentDark }]}>{level.subtitle}</Text>
          <Text style={[styles.instruction, { color: colors.ink }]}>
            اختر كلمة من الشبكة أولًا، ثم اقرأ التلميح، ثم اكتب الإجابة.
          </Text>
        </View>

        <ProgressBar
          progress={progress}
          currentStep={Object.keys(solvedMap).length}
          totalSteps={level.words.length}
          label="تقدّم الكلمات"
        />

        <View style={[styles.boardCard, { backgroundColor: 'rgba(240,219,185,0.94)', borderColor: colors.cardBorder }]}>
          <WordListChips words={level.words} solvedMap={solvedMap} />
          <PoetPuzzleBoard
            board={level.board}
            words={level.words}
            selectedWord={selectedWord}
            solvedMap={solvedMap}
            onPressWord={selectWord}
          />
        </View>

        <HintCard selectedWord={selectedWord} />
        <WordAnswerPanel
          selectedWord={selectedWord}
          value={draftAnswer}
          onChangeText={setDraftAnswer}
          onSubmit={handleSubmit}
          disabled={submitting}
        />
        <FeedbackPanel feedback={feedback} />
      </ScreenContainer>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
  titleCard: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  instruction: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '700',
  },
  boardCard: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 14,
    marginBottom: 16,
  },
});
