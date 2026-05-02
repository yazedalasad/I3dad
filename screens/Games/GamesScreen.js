import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getGameHubItems } from '../../features/games/catalog';

function GameCard({ item, onPress, launchLabel, isRTL }) {
  const gradient = item.gradient || [item.iconBg, item.buttonBg];

  return (
    <View style={[styles.card, { borderColor: item.accentSoft }]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.iconPanel, isRTL && styles.rtlSelf]}
      >
        <View style={styles.iconHalo}>
          <FontAwesome name={item.icon} size={32} color="#fff" />
        </View>
      </LinearGradient>

      <View style={[styles.badge, { backgroundColor: item.accentSoft }, isRTL && styles.rtlSelf]}>
        <Text style={styles.badgeText}>{item.badge}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, isRTL && styles.rtlText]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.cardDesc, isRTL && styles.rtlText]} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={[styles.cardLong, isRTL && styles.rtlText]} numberOfLines={3}>
          {item.longDescription}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.launchBtn, { backgroundColor: item.buttonBg }]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Text style={styles.launchBtnText}>{launchLabel}</Text>
        <FontAwesome name={isRTL ? 'arrow-right' : 'arrow-left'} size={13} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export default function GamesScreen({ navigateTo }) {
  const { t, i18n } = useTranslation('home');
  const isRTL =
    String(i18n.language).toLowerCase().startsWith('ar') ||
    String(i18n.language).toLowerCase().startsWith('he');
  const gameHubItems = getGameHubItems(i18n.language);
  const launchLabel = t('games.launch') === 'games.launch' ? (isRTL ? 'ابدأ اللعبة' : 'Start game') : t('games.launch');

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={['#f8fafc', '#eefdf8', '#eff6ff']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroIcon}>
          <FontAwesome name="gamepad" size={24} color="#0f766e" />
        </View>
        <Text style={[styles.heroTitle, isRTL && styles.rtlText]}>{t('games.pageTitle')}</Text>
        <Text style={[styles.heroBrand, isRTL && styles.rtlText]}>איעדאד</Text>
        <Text style={[styles.heroSubtitle, isRTL && styles.rtlText]}>{t('games.pageSubtitle')}</Text>
      </LinearGradient>

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t('games.sectionTitle')}</Text>
        <Text style={[styles.sectionHint, isRTL && styles.rtlText]}>{t('games.sectionHint')}</Text>
      </View>

      <View style={styles.list}>
        {gameHubItems.map((item) => (
          <GameCard
            key={item.key}
            item={item}
            isRTL={isRTL}
            launchLabel={launchLabel}
            onPress={() => navigateTo?.(item.screen)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f6f8fb',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  hero: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    alignSelf: 'flex-end',
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'left',
  },
  heroBrand: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '900',
    color: '#0f766e',
    textAlign: 'left',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
    textAlign: 'left',
    fontWeight: '700',
  },
  sectionHead: {
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'left',
  },
  sectionHint: {
    marginTop: 4,
    color: '#475569',
    textAlign: 'left',
    fontWeight: '700',
    fontSize: 13,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexBasis: 250,
    flexGrow: 1,
    minHeight: 334,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  iconPanel: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  iconHalo: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  badgeText: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 11,
  },
  cardBody: {
    flex: 1,
    gap: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'left',
  },
  cardDesc: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'left',
  },
  cardLong: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'left',
  },
  launchBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  launchBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  rtlText: {
    textAlign: 'right',
  },
  rtlSelf: {
    alignSelf: 'flex-end',
  },
});
