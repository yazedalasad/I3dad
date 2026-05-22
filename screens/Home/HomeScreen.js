import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import FeatureCard from '../../components/FeatureCard';
import { useAuth } from '../../contexts/AuthContext';
import { font, lh, textColors } from '../../src/theme/typography';
import { getStudentJourneySnapshot } from '../../services/studentJourneyService';

export default function HomeScreen({ navigateTo }) {
  const { t, i18n } = useTranslation(['home', 'about']);
  const { width } = useWindowDimensions();
  const { user, profile, studentData, studentIdentity } = useAuth();
  const [journeySnapshot, setJourneySnapshot] = useState(null);

  const isRTL = I18nManager.isRTL || String(i18n.language).toLowerCase() !== 'en';
  const isHebrew = String(i18n.language || '').toLowerCase().startsWith('he');
  const welcomeName = studentIdentity?.firstName || '';
  const role = String(user?.app_metadata?.role || profile?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const horizontalPadding = isMobile ? 16 : isTablet ? 24 : 32;
  const contentStyle = [
    styles.contentBand,
    {
      paddingHorizontal: horizontalPadding,
      maxWidth: Platform.OS === 'web' ? 1440 : undefined,
    },
  ];
  const featureCardWidth = isMobile ? '100%' : isTablet ? '48%' : '31.8%';
  const smartCardWidth = isMobile ? '100%' : isTablet ? '48%' : '23.5%';

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsHorizontalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#27ae60', '#2ecc71', '#d5f5e3']}
        style={[styles.hero, contentStyle, isMobile && styles.heroMobile]}
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

      <View style={[styles.section, contentStyle]}>
        <Text style={styles.sectionTitle}>{t('features.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('features.subtitle')}</Text>

        {user && studentData && (
          <View style={styles.smartGrid}>
            <SmartCard
              style={{ width: smartCardWidth }}
              title={smartCopy.continueExam}
              subtitle={smartCopy.continueExamSubtitle}
              icon="check-square-o"
              onPress={() => navigateTo('adaptiveTest')}
            />
            <SmartCard
              style={{ width: smartCardWidth }}
              title={smartCopy.skillsProfile}
              subtitle={smartCopy.skillsProfileSubtitle}
              icon="area-chart"
              onPress={() => navigateTo('skillsProfile')}
            />
            <SmartCard
              style={{ width: smartCardWidth }}
              title={smartCopy.recommendedMajor}
              subtitle={journeySnapshot?.topRecommendation?.name || smartCopy.recommendedMajorSubtitle}
              icon="graduation-cap"
              onPress={() => navigateTo('recommendations')}
            />
            <SmartCard
              style={{ width: smartCardWidth }}
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

        <View style={styles.featureGrid}>
          {featuresMini.map((feature, index) => (
            <View key={index} style={[styles.featureCardWrap, { width: featureCardWidth }]}>
              <FeatureCard feature={feature} />
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.section, contentStyle, { paddingTop: 10 }]}>
        <Text style={styles.sectionTitle}>{t('howItWorks.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('howItWorks.subtitle')}</Text>

        <View style={styles.stepsRow}>
          <StepItem n="1" icon="check-square-o" title={t('howItWorks.step2.title')} />
          <StepItem n="2" icon="lightbulb-o" title={t('howItWorks.step3.title')} />
          <StepItem n="3" icon="graduation-cap" title={t('howItWorks.step4.title')} />
        </View>
      </View>

      <View style={[styles.ctaBox, contentStyle, isMobile && styles.ctaBoxMobile]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>{t('cta.title')}</Text>
          <Text style={styles.ctaText}>{t('cta.note')}</Text>
        </View>
        <TouchableOpacity style={styles.ctaBtn} onPress={handleGetStarted} activeOpacity={0.9}>
          <Text style={styles.ctaBtnText}>{t('cta.button')}</Text>
          <FontAwesome name="arrow-left" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.footerWrap, contentStyle]}>
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

function SmartCard({ title, subtitle, icon, onPress, style }) {
  return (
    <TouchableOpacity style={[styles.smartCard, style]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.smartIcon}>
        <FontAwesome name={icon} size={16} color="#fff" />
      </View>
      <Text style={styles.smartTitle}>{title}</Text>
      <Text style={styles.smartSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', backgroundColor: '#F6F8FF' },
  scrollContent: {
    width: '100%',
    paddingBottom: 28,
    alignItems: 'center',
  },
  contentBand: {
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    paddingTop: 44,
    paddingBottom: 28,
    width: '100%',
  },
  heroMobile: { paddingTop: 32, paddingBottom: 24 },
  heroTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: font('bodyLarge'),
    lineHeight: lh('bodyLarge'),
    fontWeight: '700',
    color: textColors.secondary,
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
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: font('body'), lineHeight: lh('body') },
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
  btnSecondaryText: { color: '#2c3e50', fontWeight: '800', fontSize: font('body'), lineHeight: lh('body') },
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
  welcomeText: { fontSize: 16.5, fontWeight: '700', color: '#2c3e50' },
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
  smallLinkText: { fontSize: 16, fontWeight: '800', color: '#2c3e50' },
  section: { paddingTop: 22 },
  sectionTitle: {
    fontSize: font('sectionTitle'),
    lineHeight: lh('sectionTitle'),
    fontWeight: '900',
    color: textColors.primary,
    textAlign: 'center',
  },
  sectionSubtitle: {
    marginTop: 10,
    fontSize: font('body'),
    lineHeight: lh('body'),
    color: textColors.muted,
    fontWeight: '600',
    textAlign: 'center',
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
  stepText: { textAlign: 'center', fontSize: 17.5, color: '#2c3e50', fontWeight: '800' },
  smartGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  smartCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    padding: 14,
  },
  featureGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  featureCardWrap: {
    minWidth: 0,
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
    fontSize: font('cardTitle'),
    lineHeight: lh('cardTitle'),
    fontWeight: '900',
    color: textColors.primary,
  },
  smartSubtitle: {
    marginTop: 8,
    color: textColors.secondary,
    lineHeight: lh('body'),
    fontSize: font('body'),
    fontWeight: '700',
  },
  ctaBox: {
    marginTop: 22,
    backgroundColor: '#27ae60',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  ctaBoxMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  ctaTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  ctaText: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 17.5, lineHeight: 18 },
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
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 16,
    color: '#486056',
    fontWeight: '600',
  },
});
