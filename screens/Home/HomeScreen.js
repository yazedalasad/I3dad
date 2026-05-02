import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import FeatureCard from '../../components/FeatureCard';
import { useAuth } from '../../contexts/AuthContext';
import { getStudentJourneySnapshot } from '../../services/studentJourneyService';

export default function HomeScreen({ navigateTo }) {
  const { t, i18n } = useTranslation(['home', 'about']);
  const { user, profile, studentData, studentIdentity } = useAuth();
  const [journeySnapshot, setJourneySnapshot] = useState(null);

  const isRTL = I18nManager.isRTL || String(i18n.language).toLowerCase() !== 'en';
  const isHebrew = String(i18n.language || '').toLowerCase().startsWith('he');
  const welcomeName = studentIdentity?.firstName || '';
  const role = String(user?.app_metadata?.role || user?.user_metadata?.role || profile?.role || '').toLowerCase();
  const isAdmin = role === 'admin';

  const smartCopy = isHebrew
    ? {
        continueExam: 'המשך מבחן',
        continueExamSubtitle: 'סיימו את ההערכה וחזקו את הפרופיל האישי.',
        skillsProfile: 'פרופיל מיומנויות',
        skillsProfileSubtitle: 'ראו חוזקות כמו לוגיקה, ריכוז וחשיבה מדעית.',
        recommendedMajor: 'תחום מומלץ',
        recommendedMajorSubtitle: 'פתחו את ההתאמה המובילה שלכם ואת הצעדים הבאים.',
        finalReport: 'דוח סופי',
        finalReportSubtitle: 'פתחו את הדוח המלא עם מבחן, משחקים והמלצות.',
      }
    : {
        continueExam: 'أكمل الاختبار',
        continueExamSubtitle: 'أنهِ التقييم وواصل بناء ملفك الشخصي.',
        skillsProfile: 'ملف المهارات',
        skillsProfileSubtitle: 'شاهد نقاط القوة مثل المنطق، التركيز، والتفكير العلمي.',
        recommendedMajor: 'التخصص المناسب',
        recommendedMajorSubtitle: 'افتح أفضل توصية لك والخطوات التالية.',
        finalReport: 'التقرير النهائي',
        finalReportSubtitle: 'افتح التقرير الكامل الذي يجمع الاختبار، الألعاب، والتوصيات.',
      };

  const featuresMini = useMemo(
    () => [
      {
        icon: 'compass',
        title: t('features.careerDiscovery.title'),
        description: t('features.careerDiscovery.description'),
      },
      {
        icon: 'graduation-cap',
        title: t('features.universityGuide.title'),
        description: t('features.universityGuide.description'),
      },
      {
        icon: 'lightbulb-o',
        title: t('features.activities.title'),
        description: t('features.activities.description'),
      },
    ],
    [t]
  );

  const handleGetStarted = () => {
    if (user) navigateTo('adaptiveTest');
    else navigateTo('signup');
  };

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      if (!studentData?.id) return;
      const result = await getStudentJourneySnapshot(studentData.id, {
        language: i18n.language,
      });

      if (cancelled || !result?.success) return;
      setJourneySnapshot(result.data || null);
    }

    loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [studentData?.id, i18n.language]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
      <LinearGradient
        colors={['#27ae60', '#2ecc71', '#d5f5e3']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.heroTitle}>{t('title')}</Text>
        <Text style={styles.heroSubtitle}>{t('subtitle')}</Text>

        {user && welcomeName ? (
          <View style={styles.welcomeBanner}>
            <FontAwesome name="star" size={16} color="#f39c12" />
            <Text style={styles.welcomeText}>
              {t('welcome', { name: welcomeName })}
            </Text>
          </View>
        ) : null}

        <View style={styles.heroButtons}>
          {isAdmin && (
            <TouchableOpacity style={styles.btnAdmin} onPress={() => navigateTo('adminDashboard')} activeOpacity={0.9}>
              <FontAwesome name="dashboard" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>لوحة الأدمن</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleGetStarted} activeOpacity={0.9}>
            <FontAwesome name="rocket" size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>
              {user ? t('startAssessment') : t('getStarted')}
            </Text>
          </TouchableOpacity>

          {!user && (
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => navigateTo('login')}
              activeOpacity={0.9}
            >
              <FontAwesome name="sign-in" size={16} color="#27ae60" />
              <Text style={styles.btnSecondaryText}>{t('login')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.smallLink}
          onPress={() => (user ? navigateTo('personalityTest') : navigateTo('signup'))}
          activeOpacity={0.88}
        >
          {!isRTL && <FontAwesome name="arrow-left" size={14} color="#2c3e50" />}
          <FontAwesome name="user-circle" size={16} color="#2c3e50" />
          <Text style={styles.smallLinkText}>{t('tryPersonality')}</Text>
          {isRTL && <FontAwesome name="arrow-left" size={14} color="#2c3e50" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.smallLink}
          onPress={() => navigateTo('games')}
          activeOpacity={0.88}
        >
          {!isRTL && <FontAwesome name="arrow-left" size={14} color="#2c3e50" />}
          <FontAwesome name="gamepad" size={16} color="#2c3e50" />
          <Text style={styles.smallLinkText}>{t('games.browse')}</Text>
          {isRTL && <FontAwesome name="arrow-left" size={14} color="#2c3e50" />}
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('features.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('features.subtitle')}</Text>

        {user && studentData && (
          <View style={styles.smartGrid}>
            <SmartCard
              title={smartCopy.continueExam}
              subtitle={smartCopy.continueExamSubtitle}
              icon="check-square-o"
              onPress={() => navigateTo('adaptiveTest')}
            />
            <SmartCard
              title={smartCopy.skillsProfile}
              subtitle={smartCopy.skillsProfileSubtitle}
              icon="area-chart"
              onPress={() => navigateTo('skillsProfile')}
            />
            <SmartCard
              title={smartCopy.recommendedMajor}
              subtitle={journeySnapshot?.topRecommendation?.name || smartCopy.recommendedMajorSubtitle}
              icon="graduation-cap"
              onPress={() => navigateTo('recommendations')}
            />
            <SmartCard
              title={smartCopy.finalReport}
              subtitle={smartCopy.finalReportSubtitle}
              icon="file-text"
              onPress={() =>
                navigateTo('finalReport', {
                  studentId: studentData?.id,
                  language: i18n.language,
                })
              }
            />
          </View>
        )}

        <View style={{ gap: 12, marginTop: 14 }}>
          {featuresMini.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </View>
      </View>

      <View style={[styles.section, { paddingTop: 10 }]}>
        <Text style={styles.sectionTitle}>{t('howItWorks.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('howItWorks.subtitle')}</Text>

        <View style={styles.stepsRow}>
          <StepItem n="1" icon="check-square-o" title={t('howItWorks.step2.title')} />
          <StepItem n="2" icon="lightbulb-o" title={t('howItWorks.step3.title')} />
          <StepItem n="3" icon="graduation-cap" title={t('howItWorks.step4.title')} />
        </View>
      </View>

      <View style={styles.ctaBox}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>{t('cta.title')}</Text>
          <Text style={styles.ctaText}>{t('cta.note')}</Text>
        </View>
        <TouchableOpacity style={styles.ctaBtn} onPress={handleGetStarted} activeOpacity={0.9}>
          <Text style={styles.ctaBtnText}>{t('cta.button')}</Text>
          <FontAwesome name="arrow-left" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.footerWrap}>
        <LinearGradient
          colors={['#f4fbf6', '#eef7f1']}
          style={styles.footer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.footerBrand}>
            <View style={styles.footerLogo}>
              <FontAwesome name="leaf" size={18} color="#27ae60" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.footerBrandTitle}>{t('title')}</Text>
              <Text style={styles.footerBrandText}>{t('subtitle')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.footerLink}
            onPress={() => navigateTo('about')}
            activeOpacity={0.88}
          >
            <Text style={styles.footerLinkText}>{t('title', { ns: 'about' })}</Text>
            <FontAwesome name="arrow-left" size={13} color="#2c3e50" />
          </TouchableOpacity>

          <View style={styles.footerDivider} />

          <View style={styles.footerInfoRow}>
            <View style={styles.footerInfoItem}>
              <FontAwesome name="envelope-o" size={14} color="#27ae60" />
              <Text style={styles.footerInfoText}>info@i3dad.com</Text>
            </View>

            <View style={styles.footerInfoItem}>
              <FontAwesome name="map-marker" size={14} color="#27ae60" />
              <Text style={styles.footerInfoText}>{t('contactLocation', { ns: 'about' })}</Text>
            </View>
          </View>
        </LinearGradient>
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
      <Text style={styles.stepText} numberOfLines={2}>
        {title}
      </Text>
    </View>
  );
}

function SmartCard({ title, subtitle, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.smartCard} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.smartIcon}>
        <FontAwesome name={icon} size={16} color="#fff" />
      </View>
      <Text style={styles.smartTitle}>{title}</Text>
      <Text style={styles.smartSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
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
  btnAdmin: {
    backgroundColor: '#1B3A8A',
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
  sectionSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
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
  smartGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  smartCard: {
    flexBasis: 240,
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    padding: 14,
  },
  smartIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#27ae60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartTitle: {
    marginTop: 10,
    fontWeight: '900',
    color: '#2c3e50',
  },
  smartSubtitle: {
    marginTop: 6,
    color: '#5f6f68',
    lineHeight: 18,
    fontSize: 12.5,
    fontWeight: '700',
  },
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
  footerWrap: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 10,
  },
  footer: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dcefe2',
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dcefe2',
  },
  footerBrandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#203040',
  },
  footerBrandText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#5f6f68',
  },
  footerLink: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#dcefe2',
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2c3e50',
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#dcefe2',
    marginVertical: 16,
  },
  footerInfoRow: {
    gap: 10,
  },
  footerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerInfoText: {
    fontSize: 13,
    color: '#486056',
    fontWeight: '600',
  },
});
