import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ScreenContainer,
  GameHeader,
  GameCard,
  ChoiceButton,
} from '../shared';
import { doctorSorokaLevels } from '../data/levels';

export default function DoctorSorokaHomeScreen({ navigation, studentId = 'demo-student-id' }) {
  return (
    <ScreenContainer scroll>
      <GameHeader
        title="רופא בסורוקה"
        subtitle="משחק קליני בעברית: שואלים, בודקים, מאבחנים ומטפלים"
      />

      <GameCard style={styles.introCard}>
        <Text style={styles.title}>ברוך הבא למשמרת</Text>
        <Text style={styles.body}>
          במשחק הזה אתה נכנס לנעליים של רופא בבית החולים סורוקה. בכל מקרה תצטרך
          לחשוב בצורה מסודרת: אילו שאלות לשאול, אילו בדיקות להזמין ומהי האבחנה
          הסבירה ביותר.
        </Text>
      </GameCard>

      <View style={styles.levels}>
        {doctorSorokaLevels.map((level, index) => (
          <ChoiceButton
            key={level.id}
            title={level.title.he}
            description={`שלב ${index + 1} • כ-${level.estimatedMinutes} דקות`}
            variant="secondary"
            onPress={() =>
              navigation?.navigate?.('DoctorSorokaCase', {
                levelId: level.id,
                studentId,
              })
            }
          />
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  introCard: {
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
  },
  levels: {
    marginTop: 4,
  },
});
