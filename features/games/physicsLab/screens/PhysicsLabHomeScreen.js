import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer, GameHeader, GameCard } from '../../shared';
import { physicsLabLevels } from '../data/levels';
import LevelPickerCard from '../components/LevelPickerCard';

const imageMap = {
  physics_lab_level_1: require('../assets/level1-force.png'),
  physics_lab_level_2: require('../assets/level2-speed.png'),
  physics_lab_level_3: require('../assets/level3-acceleration.png'),
};

export default function PhysicsLabHomeScreen({ navigation, studentId = 'demo-student-id' }) {
  return (
    <ScreenContainer scroll>
      <GameHeader
        title="Physics Lab"
        subtitle="Experiment with motion. Tune the controls. Learn by trying."
      />

      <GameCard style={styles.heroCard}>
        <Image
          source={require('../assets/physics-lab-gameplay.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroBody}>
          <Text style={styles.heroTitle}>One idea per level</Text>
          <Text style={styles.heroText}>
            Start with force, then move to speed and acceleration. Each level gives
            short feedback after every run so students can discover the rule on their own.
          </Text>
        </View>
      </GameCard>

      <View style={styles.list}>
        {physicsLabLevels.map((level) => (
          <LevelPickerCard
            key={level.id}
            title={level.title}
            subtitle={level.subtitle}
            imageSource={imageMap[level.id]}
            accentColor={level.themeColor}
            onPress={() =>
              navigation?.navigate?.('PhysicsLabLevel', {
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
  heroCard: {
    marginBottom: 18,
    padding: 12,
    backgroundColor: '#0F2232',
  },
  heroImage: {
    width: '100%',
    height: 190,
    borderRadius: 18,
    backgroundColor: '#0A1520',
  },
  heroBody: {
    marginTop: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  heroText: {
    marginTop: 8,
    color: '#C0DCF2',
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    marginTop: 4,
  },
});
