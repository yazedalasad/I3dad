import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FeatureCard from '../../components/FeatureCard';
import { useAuth } from '../../contexts/AuthContext';

export default function HomeScreen({ navigateTo }) {
  const { t } = useTranslation();
  const { user, studentData } = useAuth();

  const featuresMini = [
    {
      icon: "compass",
      title: t('home.features.careerDiscovery.title'),
      description: t('home.features.careerDiscovery.description'),
    },
    {
      icon: "graduation-cap",
      title: t('home.features.universityGuide.title'),
      description: t('home.features.universityGuide.description'),
    },
    {
      icon: "lightbulb-o",
      title: t('home.features.activities.title'),
      description: t('home.features.activities.description'),
    },
  ];

  const handleGetStarted = () => {
    if (user) navigateTo('adaptiveTest');
    else navigateTo('signup');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
      {/* HERO (same style, smaller) */}
      <LinearGradient
        colors={['#27ae60', '#2ecc71', '#d5f5e3']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.heroTitle}>{t('home.title')}</Text>
        <Text style={styles.heroSubtitle}>{t('home.subtitle')}</Text>

        {user && studentData ? (
          <View style={styles.welcomeBanner}>
            <FontAwesome name="star" size={16} color="#f39c12" />
            <Text style={styles.welcomeText}>
              {t('home.welcome', { name: studentData.first_name })}
            </Text>
          </View>
        ) : null}

        <View style={styles.heroButtons}>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleGetStarted}>
            <FontAwesome name="rocket" size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>
              {user ? t('home.startAssessment') : t('home.getStarted')}
            </Text>
          </TouchableOpacity>

          {!user && (
            <TouchableOpacity style={styles.btnSecondary} onPress={() => navigateTo('login')}>
              <FontAwesome name="sign-in" size={16} color="#27ae60" />
              <Text style={styles.btnSecondaryText}>{t('home.login')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* optional small link instead of a full section */}
        <TouchableOpacity
          style={styles.smallLink}
          onPress={() => (user ? navigateTo('personalityTest') : navigateTo('signup'))}
          activeOpacity={0.85}
        >
          <FontAwesome name="user-circle" size={16} color="#2c3e50" />
          <Text style={styles.smallLinkText}>
            {t('home.tryPersonality', 'جرّب اختبار الشخصية السريع')}
          </Text>
          <FontAwesome name="arrow-left" size={14} color="#2c3e50" />
        </TouchableOpacity>
      </LinearGradient>

      {/* MINI FEATURES (only 3) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home.features.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('home.features.subtitle')}</Text>

        <View style={{ gap: 12, marginTop: 14 }}>
          {featuresMini.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </View>
      </View>

      {/* HOW IT WORKS (only 3 steps) */}
      <View style={[styles.section, { paddingTop: 10 }]}>
        <Text style={styles.sectionTitle}>{t('home.howItWorks.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('home.howItWorks.subtitle')}</Text>

        <View style={styles.stepsRow}>
          <StepItem
            n="1"
            icon="check-square-o"
            title={t('home.howItWorks.step2.title')}
          />
          <StepItem
            n="2"
            icon="lightbulb-o"
            title={t('home.howItWorks.step3.title')}
          />
          <StepItem
            n="3"
            icon="graduation-cap"
            title={t('home.howItWorks.step4.title')}
          />
        </View>
      </View>

      {/* SMALL CTA */}
      <View style={styles.ctaBox}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>{t('home.cta.title')}</Text>
          <Text style={styles.ctaText}>{t('home.cta.note')}</Text>
        </View>
        <TouchableOpacity style={styles.ctaBtn} onPress={handleGetStarted} activeOpacity={0.9}>
          <Text style={styles.ctaBtnText}>{t('home.cta.button')}</Text>
          <FontAwesome name="arrow-left" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StepItem({ n, icon, title }) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{n}</Text>
      </View>
      <FontAwesome name={icon} size={22} color="#27ae60" />
      <Text style={styles.stepText} numberOfLines={2}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  hero: {
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 28,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 14,
  },

  heroButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnPrimary: {
    backgroundColor: '#2c3e50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 28,
    gap: 10,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  btnSecondary: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#2c3e50',
    gap: 8,
  },
  btnSecondaryText: { color: '#2c3e50', fontWeight: '800', fontSize: 15 },

  welcomeBanner: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    gap: 8,
    marginTop: 8,
  },
  welcomeText: { fontSize: 14.5, fontWeight: '700', color: '#2c3e50' },

  smallLink: {
    marginTop: 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallLinkText: { fontSize: 14, fontWeight: '800', color: '#2c3e50' },

  section: { paddingHorizontal: 24, paddingTop: 22 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: '#2c3e50', textAlign: 'center' },
  sectionSubtitle: { marginTop: 8, fontSize: 14, color: '#7f8c8d', textAlign: 'center', lineHeight: 20 },

  stepsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  stepItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#27ae60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { color: '#fff', fontWeight: '900' },
  stepText: { textAlign: 'center', fontSize: 12.5, color: '#2c3e50', fontWeight: '800' },

  ctaBox: {
    marginTop: 22,
    marginHorizontal: 24,
    backgroundColor: '#27ae60',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  ctaTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  ctaText: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 12.5, lineHeight: 18 },
  ctaBtn: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  ctaBtnText: { color: '#fff', fontWeight: '900' },
});
