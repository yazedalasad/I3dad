import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AboutScreen({ navigateTo }) {
  const { t } = useTranslation();

  return (
    <View style={styles.page}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => navigateTo?.('home')}
          activeOpacity={0.9}
        >
          <FontAwesome name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.navTitle}>{t('about.title', 'عن إعداد')}</Text>

        <View style={{ width: 42 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Hero Section for About */}
        <LinearGradient
          colors={['#2c3e50', '#34495e', '#7f8c8d']}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome name="info-circle" size={60} color="#fff" />
          <Text style={styles.heroTitle}>{t('about.title', 'عن إعداد')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('about.subtitle', 'منصة متكاملة لتوجيه الطلاب العرب في إسرائيل')}
          </Text>
        </LinearGradient>

        {/* Mission Section */}
        <View style={styles.missionSection}>
          <View style={styles.missionContent}>
            <FontAwesome name="bullseye" size={40} color="#27ae60" />
            <Text style={styles.missionTitle}>{t('home.mission.title', 'رسالتنا')}</Text>
            <Text style={styles.missionText}>
              {t(
                'home.mission.description',
                'إعداد هي منصة توجيه مهني رائدة مصممة خصيصًا للطلاب العرب في إسرائيل. نهدف إلى سد الفجوة بين التعليم والتوظيف من خلال توفير أدوات شاملة لاكتشاف المسارات الوظيفية، والتوجيه الأكاديمي، وفرص التطوير المهني. نؤمن بأن كل طالب لديه إمكانات فريدة، ومهمتنا هي مساعدتك في اكتشافها وتطويرها لتحقيق النجاح في سوق العمل الإسرائيلي الديناميكي.'
              )}
            </Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>{t('about.impactTitle', 'الأثر والإنجازات')}</Text>
          <Text style={styles.statsSubtitle}>{t('about.impactSubtitle', 'أرقام تتحدث عن نفسها')}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient colors={['#3498db', '#2980b9']} style={styles.statGradient}>
                <FontAwesome name="users" size={32} color="#fff" />
                <Text style={styles.statNumber}>5000+</Text>
                <Text style={styles.statLabel}>{t('home.mission.stats.students', 'طالب مستفيد')}</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient colors={['#e74c3c', '#c0392b']} style={styles.statGradient}>
                <FontAwesome name="briefcase" size={32} color="#fff" />
                <Text style={styles.statNumber}>200+</Text>
                <Text style={styles.statLabel}>{t('home.mission.stats.careers', 'مسار وظيفي')}</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient colors={['#27ae60', '#229954']} style={styles.statGradient}>
                <FontAwesome name="graduation-cap" size={32} color="#fff" />
                <Text style={styles.statNumber}>50+</Text>
                <Text style={styles.statLabel}>{t('about.universities', 'جامعة شريكة')}</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient colors={['#9b59b6', '#8e44ad']} style={styles.statGradient}>
                <FontAwesome name="star" size={32} color="#fff" />
                <Text style={styles.statNumber}>95%</Text>
                <Text style={styles.statLabel}>
                  {t('home.mission.stats.satisfaction', 'رضى المستخدمين')}
                </Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Vision Section */}
        <View style={styles.visionSection}>
          <View style={styles.visionContent}>
            <FontAwesome name="eye" size={40} color="#f39c12" />
            <Text style={styles.visionTitle}>{t('about.visionTitle', 'رؤيتنا')}</Text>
            <Text style={styles.visionText}>
              {t(
                'about.visionText',
                'نسعى لأن نكون المنصة الرائدة في الشرق الأوسط لتوجيه الطلاب نحو المسارات الوظيفية المناسبة، حيث نهدف إلى تمكين مليون شاب وشابة عربي في إسرائيل من خلال تزويدهم بالأدوات والمعرفة اللازمة لتحقيق طموحاتهم الأكاديمية والمهنية. نؤمن بمجتمع عربي قوي ومزدهر يساهم بشكل فعّال في بناء اقتصاد إسرائيل الحديث.'
              )}
            </Text>
          </View>
        </View>

        {/* Values Section */}
        <View style={styles.valuesSection}>
          <Text style={styles.valuesTitle}>{t('about.valuesTitle', 'قيمنا')}</Text>

          <View style={styles.valuesGrid}>
            <View style={styles.valueCard}>
              <View style={[styles.valueIcon, { backgroundColor: '#3498db' }]}>
                <FontAwesome name="heart" size={24} color="#fff" />
              </View>
              <Text style={styles.valueTitle}>{t('about.value1.title', 'التمكين')}</Text>
              <Text style={styles.valueDescription}>
                {t('about.value1.description', 'تمكين الشباب العربي من خلال المعرفة والمهارات')}
              </Text>
            </View>

            <View style={styles.valueCard}>
              <View style={[styles.valueIcon, { backgroundColor: '#27ae60' }]}>
                <FontAwesome name="balance-scale" size={24} color="#fff" />
              </View>
              <Text style={styles.valueTitle}>{t('about.value2.title', 'الإنصاف')}</Text>
              <Text style={styles.valueDescription}>
                {t('about.value2.description', 'توفير فرص متكافئة للجميع بغض النظر عن الخلفية')}
              </Text>
            </View>

            <View style={styles.valueCard}>
              <View style={[styles.valueIcon, { backgroundColor: '#e74c3c' }]}>
                <FontAwesome name="lightbulb-o" size={24} color="#fff" />
              </View>
              <Text style={styles.valueTitle}>{t('about.value3.title', 'الابتكار')}</Text>
              <Text style={styles.valueDescription}>
                {t('about.value3.description', 'استخدام أحدث التقنيات والأساليب في التوجيه المهني')}
              </Text>
            </View>

            <View style={styles.valueCard}>
              <View style={[styles.valueIcon, { backgroundColor: '#9b59b6' }]}>
                <FontAwesome name="handshake-o" size={24} color="#fff" />
              </View>
              <Text style={styles.valueTitle}>{t('about.value4.title', 'المجتمع')}</Text>
              <Text style={styles.valueDescription}>
                {t('about.value4.description', 'بناء مجتمع داعم من الخبراء والمرشدين')}
              </Text>
            </View>
          </View>
        </View>

        {/* Team/Partners Section */}
        <View style={styles.partnersSection}>
          <Text style={styles.partnersTitle}>{t('about.partnersTitle', 'شركاؤنا')}</Text>
          <Text style={styles.partnersSubtitle}>
            {t('about.partnersSubtitle', 'نعمل مع أفضل المؤسسات التعليمية والشركات')}
          </Text>

          <View style={styles.partnersGrid}>
            <View style={styles.partnerLogo}>
              <FontAwesome name="university" size={40} color="#2c3e50" />
              <Text style={styles.partnerName}>جامعات إسرائيلية</Text>
            </View>

            <View style={styles.partnerLogo}>
              <FontAwesome name="building" size={40} color="#2c3e50" />
              <Text style={styles.partnerName}>شركات رائدة</Text>
            </View>

            <View style={styles.partnerLogo}>
              <FontAwesome name="globe" size={40} color="#2c3e50" />
              <Text style={styles.partnerName}>منظمات دولية</Text>
            </View>

            <View style={styles.partnerLogo}>
              <FontAwesome name="graduation-cap" size={40} color="#2c3e50" />
              <Text style={styles.partnerName}>مدارس ثانوية</Text>
            </View>
          </View>
        </View>

        {/* Contact CTA */}
        <LinearGradient colors={['#2c3e50', '#34495e']} style={styles.contactSection}>
          <Text style={styles.contactTitle}>{t('about.contactTitle', 'تواصل معنا')}</Text>
          <Text style={styles.contactText}>
            {t('about.contactText', 'هل لديك أسئلة أو ترغب في التعاون معنا؟')}
          </Text>

          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <FontAwesome name="envelope" size={20} color="#27ae60" />
              <Text style={styles.contactDetail}>info@i3dad.com</Text>
            </View>

            <View style={styles.contactItem}>
              <FontAwesome name="phone" size={20} color="#27ae60" />
              <Text style={styles.contactDetail}>+972-3-1234567</Text>
            </View>

            <View style={styles.contactItem}>
              <FontAwesome name="map-marker" size={20} color="#27ae60" />
              <Text style={styles.contactDetail}>تل أبيب، إسرائيل</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Navbar
  navbar: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0b1223',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },

  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    paddingBottom: 16,
  },

  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    alignItems: 'center',
    paddingBottom: 40,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  missionSection: {
    padding: 32,
    backgroundColor: '#fff',
  },
  missionContent: {
    alignItems: 'center',
  },
  missionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  missionText: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'center',
    lineHeight: 26,
  },
  statsSection: {
    padding: 32,
    backgroundColor: '#f8f9fa',
  },
  statsTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  statsSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  statCard: {
    width: '47%',
    minWidth: 160,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  statGradient: {
    padding: 24,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.95,
  },
  visionSection: {
    padding: 32,
    backgroundColor: '#fff',
  },
  visionContent: {
    alignItems: 'center',
  },
  visionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  visionText: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'center',
    lineHeight: 26,
  },
  valuesSection: {
    padding: 32,
    backgroundColor: '#f8f9fa',
  },
  valuesTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 32,
  },
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  valueCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '47%',
    minWidth: 160,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  valueIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  valueDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  partnersSection: {
    padding: 32,
    backgroundColor: '#fff',
  },
  partnersTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  partnersSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 32,
  },
  partnersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  partnerLogo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 24,
    width: '47%',
    minWidth: 160,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 16,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginTop: 12,
  },
  contactSection: {
    padding: 40,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
  },
  contactInfo: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactDetail: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
});
