import React from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  ScreenContainer,
  GameHeader,
  ChoiceButton,
  GameCard,
} from '../shared';
import LevelResultCard from '../components/LevelResultCard';

export default function DoctorSorokaSummaryScreen({ route, navigation }) {
  const summary = route?.params?.summary || {};

  return (
    <ScreenContainer scroll>
      <GameHeader
        title="סיום שלב"
        subtitle="כך נראתה החשיבה הקלינית שלך במקרה הזה"
      />

      <LevelResultCard summary={summary} />

      <GameCard style={styles.noteCard}>
        <Text style={styles.noteTitle}>מה המשחק בודק?</Text>
        <Text style={styles.noteBody}>
          המשחק מחפש לא רק תשובה נכונה, אלא גם דרך חשיבה: האם אתה שואל קודם?
          האם אתה מזמין בדיקות מתאימות? האם אתה מחבר נתונים לפני החלטה?
        </Text>
      </GameCard>

      <ChoiceButton
        title="לחזור למסך הראשי"
        description="בחירה של שלב נוסף"
        variant="secondary"
        onPress={() => navigation?.navigate?.('DoctorSorokaHome')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  noteCard: {
    marginTop: 16,
    marginBottom: 16,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  noteBody: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
  },
});
