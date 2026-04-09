import React from 'react';
import { ImageBackground, StyleSheet, Text, View, Pressable, Image } from 'react-native';
import { ScreenContainer, GameCard } from '../../shared';
import { arabicPoetPuzzleLevels } from '../data/levels';
import { desertTheme } from '../utils/theme';

export default function ArabicPoetPuzzleHomeScreen({ navigation, studentId = 'demo-student-id' }) {
  const colors = desertTheme.colors;
  const firstLevel = arabicPoetPuzzleLevels[0];

  return (
    <ImageBackground
      source={require('../assets/desert-theme-bg.png')}
      resizeMode="cover"
      style={styles.flex}
    >
      <ScreenContainer scroll style={styles.transparent}>
        <View style={styles.topBanner}>
          <Text style={styles.mainTitle}>كنوز الألفاظ</Text>
          <Text style={styles.mainSubtitle}>ألفاظ شعرية قديمة • لعبة كلمات عربية</Text>
        </View>

        <GameCard style={[styles.heroCard, { backgroundColor: 'rgba(232,216,191,0.94)', borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.ink }]}>طريقة اللعب</Text>
          <Text style={[styles.body, { color: colors.ink }]}>
            اضغط على موضع الكلمة في الشبكة، واقرأ التلميح، ثم اكتب اللفظ الصحيح في الصندوق المزخرف.
          </Text>

          <Pressable
            onPress={() =>
              navigation?.navigate?.('ArabicPoetPuzzleLevel', {
                levelId: firstLevel.id,
                studentId,
              })
            }
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent, borderColor: colors.accentDark },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>ابدأ المستوى الأول</Text>
          </Pressable>
        </GameCard>

        <GameCard style={[styles.previewCard, { backgroundColor: 'rgba(232,216,191,0.94)', borderColor: colors.cardBorder }]}>
          <Text style={[styles.previewTitle, { color: colors.ink }]}>معاينة الشكل</Text>
          <Image
            source={require('../assets/level1-preview-styled.png')}
            style={styles.previewImage}
            resizeMode="cover"
          />
        </GameCard>
      </ScreenContainer>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
  topBanner: {
    marginBottom: 14,
    paddingVertical: 10,
  },
  mainTitle: {
    color: '#F7E4BE',
    fontSize: 38,
    fontWeight: '900',
    textAlign: 'center',
  },
  mainSubtitle: {
    marginTop: 4,
    color: '#E8D4AF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroCard: { marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'right',
  },
  body: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
  },
  button: {
    marginTop: 14,
    borderWidth: 2,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF8EB',
    fontSize: 19,
    fontWeight: '900',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  previewCard: {
    marginBottom: 20,
    padding: 12,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'right',
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: 360,
    borderRadius: 18,
  },
});
