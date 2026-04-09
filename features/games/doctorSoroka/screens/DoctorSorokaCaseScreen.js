import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ErrorState,
  GameHeader,
  LoadingState,
  ProgressBar,
  ScreenContainer,
} from '../shared';
import DoctorCaseHero from '../components/DoctorCaseHero';
import PatientInfoCard from '../components/PatientInfoCard';
import DiagnosticOptionsList from '../components/DiagnosticOptionsList';
import DoctorStatusBar from '../components/DoctorStatusBar';
import { useDoctorSorokaGame } from '../hooks/useDoctorSorokaGame';

export default function DoctorSorokaCaseScreen({
  route,
  navigation,
}) {
  const levelId = route?.params?.levelId || 'doctor_soroka_level_1';
  const studentId = route?.params?.studentId || 'demo-student-id';

  const {
    loading,
    error,
    t,
    currentScene,
    level,
    progressApi,
    seconds,
    startGame,
    choose,
    getSummary,
  } = useDoctorSorokaGame({ levelId });

  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    startGame(studentId).catch(() => {});
  }, [studentId, startGame]);

  async function handleChoose(choice) {
    try {
      setSelecting(true);
      const result = await choose(choice);

      if (result?.completed) {
        navigation?.replace?.('DoctorSorokaSummary', {
          levelId,
          summary: getSummary(),
        });
      }
    } finally {
      setSelecting(false);
    }
  }

  if (loading && !currentScene) {
    return <LoadingState label="טוען את המקרה..." />;
  }

  if (error && !currentScene) {
    return <ErrorState title="שגיאה בטעינת המקרה" message={error.message} />;
  }

  if (!currentScene) {
    return <ErrorState title="לא נמצא מקרה" message="נסה להיכנס מחדש לשלב." />;
  }

  return (
    <ScreenContainer scroll>
      <GameHeader
        title={level?.title?.he || 'רופא בסורוקה'}
        subtitle={currentScene?.title?.he}
        bottomContent={
          <DoctorStatusBar
            seconds={seconds}
            currentStep={progressApi.currentStep}
            totalSteps={progressApi.totalSteps}
          />
        }
      />

      <ProgressBar
        progress={progressApi.progress}
        currentStep={progressApi.currentStep}
        totalSteps={progressApi.totalSteps}
        label="התקדמות בתיק הקליני"
      />

      <DoctorCaseHero
        image={currentScene?.image}
        title={currentScene?.title?.he}
        subtitle="מיון • בירור • אבחנה • החלטה"
      />

      <PatientInfoCard
        title="מה קורה כאן?"
        body={currentScene?.body?.he}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>מה תעשה עכשיו?</Text>

        <DiagnosticOptionsList
          choices={currentScene?.choices || []}
          t={t}
          onChoose={handleChoose}
          disabled={selecting}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
});
