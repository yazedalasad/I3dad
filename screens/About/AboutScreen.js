import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AboutScreen({ navigateTo }) {
  const { t } = useTranslation(['about']);

  return (
    <View style={styles.page}>
      <View style={styles.navbar}>
        <View style={styles.navSpacer} />

        <Text style={styles.navTitle}>{t('title')}</Text>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => navigateTo?.('home')}
          activeOpacity={0.9}
        >
          <FontAwesome name="arrow-right" size={15} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <LinearGradient
          colors={['#2c3e50', '#34495e', '#7f8c8d']}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome name="info-circle" size={60} color="#fff" />
          <Text style={styles.heroTitle}>{t('title')}</Text>
          <Text style={styles.heroSubtitle}>{t('subtitle')}</Text>
        </LinearGradient>

        <View style={styles.missionSection}>
          <View style={styles.missionContent}>
            <FontAwesome name="bullseye" size={40} color="#27ae60" />
            <Text style={styles.missionTitle}>{t('missionTitle')}</Text>
            <Text style={styles.missionText}>{t('missionText')}</Text>
          </View>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>{t('impactTitle')}</Text>
          <Text style={styles.statsSubtitle}>{t('impactSubtitle')}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient colors={['#3498db', '#2980b9']} style={styles.statGradient}>
                <FontAwesome name="users" size={32} color="#fff" />
                <Text style={styles.statNumber}>5000+</Text>
                <Text style={styles.statLabel}>طلاب مستفيدون</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient colors={['#e74c3c', '#c0392b']} style={styles.statGradient}>
                <FontAwesome name="briefcase" size={32} color="#fff" />
                <Text style={styles.statNumber}>200+</Text>
                <Text style={styles.statLabel}>مسار مهني</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient colors={['#27ae60', '#229954']} style={styles.statGradient}>
                <FontAwesome name="graduation-cap" size={32} color="#fff" />
                <Text style={styles.statNumber}>50+</Text>
                <Text style={styles.statLabel}>{t('universities')}</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient colors={['#9b59b6', '#8e44ad']} style={styles.statGradient}>
                <FontAwesome name="star" size={32} color="#fff" />
                <Text style={styles.statNumber}>95%</Text>
                <Text style={styles.statLabel}>رضى المستخدمين</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        <View style={styles.visionSection}>
          <View style={styles.visionContent}>
            <FontAwesome name="eye" size={40} color="#f39c12" />
            <Text style={styles.visionTitle}>{t('visionTitle')}</Text>
            <Text style={styles.visionText}>{t('visionText')}</Text>
          </View>
        </View>

        <View style={styles.valuesSection}>
          <Text style={styles.valuesTitle}>{t('valuesTitle')}</Text>

          <View style={styles.valuesGrid}>
            <View style={styles.valueCard}>
              <View style={[styles.valueIcon, { backgroundColor: '#3498db' }]}>
                <FontAwesome name="heart" size={24} color="#fff" />
              </View>
              <Text style={styles.valueTitle}>{t('value1.title')}</Text>
              <Text style={styles.valueDescription}>{t('value1.description')}</Text>
            </View>

            <View style={styles.valueCard}>
              <View style={[styles.valueIcon, { backgroundColor: '#27ae60' }]}>
                <FontAwesome name="balance-scale" size={24} color="#fff" />
              </View>
              <Text style={styles.valueTitle}>{t('value2.title')}</Text>
              <Text style={styles.valueDescription}>{t('value2.description')}</Text>
            </View>

            <View style={styles.valueCard}>
              <View style={[styles.valueIcon, { backgroundColor: '#e74c3c' }]}>
                <FontAwesome name="lightbulb-o" size={24} color="#fff" />
              </View>
              <Text style={styles.valueTitle}>{t('value3.title')}</Text>
              <Text style={styles.valueDescription}>{t('value3.description')}</Text>
            </View>

            <View style={styles.valueCard}>
              <View style={[styles.valueIcon, { backgroundColor: '#9b59b6' }]}>
                <FontAwesome name="handshake-o" size={24} color="#fff" />
              </View>
              <Text style={styles.valueTitle}>{t('value4.title')}</Text>
              <Text style={styles.valueDescription}>{t('value4.description')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.partnersSection}>
          <Text style={styles.partnersTitle}>{t('partnersTitle')}</Text>
          <Text style={styles.partnersSubtitle}>{t('partnersSubtitle')}</Text>

          <View style={styles.partnersGrid}>
            <View style={styles.partnerLogo}>
              <FontAwesome name="university" size={40} color="#2c3e50" />
              <Text style={styles.partnerName}>{t('partners.1')}</Text>
            </View>

            <View style={styles.partnerLogo}>
              <FontAwesome name="building" size={40} color="#2c3e50" />
              <Text style={styles.partnerName}>{t('partners.2')}</Text>
            </View>

            <View style={styles.partnerLogo}>
              <FontAwesome name="globe" size={40} color="#2c3e50" />
              <Text style={styles.partnerName}>{t('partners.3')}</Text>
            </View>

            <View style={styles.partnerLogo}>
              <FontAwesome name="graduation-cap" size={40} color="#2c3e50" />
              <Text style={styles.partnerName}>{t('partners.4')}</Text>
            </View>
          </View>
        </View>

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
  navbar: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0b1223',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navSpacer: {
    width: 38,
    height: 38,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
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
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginTop: 12,
  },
});
