import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FeatureCard from '../../components/FeatureCard';
import StudentCard from '../../components/StudentCard';
import { useAuth } from '../../contexts/AuthContext';


const studentsData = [
  {
    name: "أحمد حسن",
    degree: "بكالوريوس علوم الحاسوب - معهد التخنيون",
    story: "كنت ضائعاً بين الهندسة والطب. أظهر التقييم شغفي بحل المشكلات. اليوم، أنا مهندس برمجيات في شركة إسرائيلية رائدة، أبني منتجات تخدم مجتمعنا.",
    job: "مهندس برمجيات أول - ويكس"
  },
  {
    name: "مريم خليل",
    degree: "بكالوريوس العمل الاجتماعي - الجامعة العبرية",
    story: "نشأت في الناصرة، أردت مساعدة مجتمعي لكنني لم أعرف كيف. ربطني I3dad بالعمل الاجتماعي. الآن أدعم العائلات العربية في التنقل في نظام الرعاية الاجتماعية الإسرائيلي بلغتهم الأم.",
    job: "عامل اجتماعي مجتمعي - بلدية الناصرة"
  },
  {
    name: "عمر سليمان",
    degree: "دكتور في الطب - جامعة تل أبيب",
    story: "أراد عائلتي أن أكون مهندساً، لكنني حلمت بالشفاء. منحني المنصة الثقة لمتابعة الطب. أنا الآن مقيم في مستشفى رمبام، أمثل مجتمعنا في الرعاية الصحية.",
    job: "مقيم طبي - مركز رمبام الطبي"
  },
  {
    name: "نور دياب",
    degree: "بكالوريوس التعليم الرياضيات - كلية بيت برل",
    story: "أحببت الرياضيات لكنني اعتقدت أن التدريس ليس طموحاً كافياً. أظهر لي I3dad كيف يغير المعلمون العرب الإسرائيليون التعليم. الآن ألهم الجيل القادم من الفتيات العرب في العلوم والتكنولوجيا والهندسة والرياضيات في مدرستي الثانوية القديمة في الطيبة.",
    job: "معلم رياضيات - مدرسة الطيبة الثانوية"
  },
  {
    name: "يوسف حامد",
    degree: "بكالوريوس العمارة - أكاديمية بتسلئيل",
    story: "جذبتني الفن والعلم معاً. أظهر لي العمارة أنها تجمع بينهما. أصمم الآن مباني مستدامة تمزج بين العمارة الإسرائيلية الحديثة والتصاميم التقليدية العربية.",
    job: "مهندس معماري مبتدئ - شركة تل أبيب"
  },
  {
    name: "ليلى ناصر",
    degree: "بكالوريوس الاقتصاد والإدارة - جامعة بن غوريون",
    story: "من الرهط، أردت إحضار الفرص الاقتصادية للمجتمع البدوي. ربطني I3dad بالمرشدين الذين وجهوني. الآن أطور السياسات الاقتصادية لوزارة الاقتصاد.",
    job: "محلل سياسات - وزارة الاقتصاد"
  }
];

export default function HomeScreen({ navigateTo }) {
  const { t } = useTranslation();
  const { user, studentData } = useAuth();
  const scrollViewRef = useRef(null);

  // Get translated features data
  const mainFeaturesData = [
    {
      icon: "compass",
      title: t('home.features.careerDiscovery.title'),
      description: t('home.features.careerDiscovery.description')
    },
    {
      icon: "graduation-cap",
      title: t('home.features.universityGuide.title'),
      description: t('home.features.universityGuide.description')
    },
    {
      icon: "lightbulb-o",
      title: t('home.features.activities.title'),
      description: t('home.features.activities.description')
    },
    {
      icon: "book",
      title: t('home.features.courses.title'),
      description: t('home.features.courses.description')
    },
    {
      icon: "trophy",
      title: t('home.features.competitions.title'),
      description: t('home.features.competitions.description')
    },
    {
      icon: "users",
      title: t('home.features.mentorship.title'),
      description: t('home.features.mentorship.description')
    }
  ];

  // Get translated pathways data
  const pathwaysData = [
    {
      icon: "code",
      title: t('home.pathways.tech.title'),
      description: t('home.pathways.tech.description'),
      color: "#3498db"
    },
    {
      icon: "heartbeat",
      title: t('home.pathways.medicine.title'),
      description: t('home.pathways.medicine.description'),
      color: "#e74c3c"
    },
    {
      icon: "balance-scale",
      title: t('home.pathways.law.title'),
      description: t('home.pathways.law.description'),
      color: "#9b59b6"
    },
    {
      icon: "paint-brush",
      title: t('home.pathways.arts.title'),
      description: t('home.pathways.arts.description'),
      color: "#e67e22"
    },
    {
      icon: "flask",
      title: t('home.pathways.science.title'),
      description: t('home.pathways.science.description'),
      color: "#1abc9c"
    },
    {
      icon: "briefcase",
      title: t('home.pathways.business.title'),
      description: t('home.pathways.business.description'),
      color: "#f39c12"
    }
  ];

  const scrollToStudents = () => {
    scrollViewRef.current?.scrollTo({ y: 1200, animated: true });
  };

  // FIXED: Changed 'accountant' to 'adaptiveTest' to match ManualNavigator.js
  const handleGetStarted = () => {
    if (user) {
      navigateTo('adaptiveTest'); // Changed from 'accountant'
    } else {
      navigateTo('signup');
    }
  };

  const handlePersonalityTest = () => {
    if (user) {
      navigateTo('personalityTest');
    } else {
      navigateTo('signup');
    }
  };

  return (
    <ScrollView ref={scrollViewRef} style={styles.container}>
      {/* Hero Section */}
      <LinearGradient
        colors={['#27ae60', '#2ecc71', '#d5f5e3']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{t('home.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('home.subtitle')}</Text>
          <Text style={styles.heroDescription}>{t('home.description')}</Text>
          
          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={handleGetStarted}
            >
              <FontAwesome name="rocket" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>
                {user ? t('home.startAssessment') : t('home.getStarted')}
              </Text>
            </TouchableOpacity>
            {!user && (
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => navigateTo('login')}
              >
                <FontAwesome name="sign-in" size={16} color="#27ae60" />
                <Text style={styles.btnSecondaryText}>{t('home.login')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {user && studentData && (
            <View style={styles.welcomeBanner}>
              <FontAwesome name="star" size={16} color="#f39c12" />
              <Text style={styles.welcomeText}>
                {t('home.welcome', { name: studentData.first_name })}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Mission Section */}
      <View style={styles.missionSection}>
        <View style={styles.missionContent}>
          <FontAwesome name="bullseye" size={40} color="#27ae60" />
          <Text style={styles.missionTitle}>{t('home.mission.title')}</Text>
          <Text style={styles.missionText}>{t('home.mission.description')}</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>5000+</Text>
              <Text style={styles.statLabel}>{t('home.mission.stats.students')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>200+</Text>
              <Text style={styles.statLabel}>{t('home.mission.stats.careers')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>95%</Text>
              <Text style={styles.statLabel}>{t('home.mission.stats.satisfaction')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Personality Test Highlight Section */}
      <View style={styles.personalitySection}>
        <LinearGradient
          colors={['#9b59b6', '#8e44ad', '#6c3483']}
          style={styles.personalityGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome name="user-circle" size={48} color="#fff" />
          <Text style={styles.personalityTitle}>
            {t('personalityTest.title')}
          </Text>
          <Text style={styles.personalityDescription}>
            {t('personalityTest.description')}
          </Text>
          <TouchableOpacity
            style={styles.personalityButton}
            onPress={handlePersonalityTest}
          >
            <FontAwesome name="star" size={18} color="#9b59b6" />
            <Text style={styles.personalityButtonText}>
              {user ? t('personalityTest.startTest') : t('home.getStarted')}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Main Features Section */}
      <View style={styles.featuresSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.features.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('home.features.subtitle')}</Text>
        </View>
        <View style={styles.featuresGrid}>
          {mainFeaturesData.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </View>
      </View>

      {/* Career Pathways Section */}
      <View style={styles.pathwaysSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.pathways.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('home.pathways.subtitle')}</Text>
        </View>
        <View style={styles.pathwaysGrid}>
          {pathwaysData.map((pathway, index) => (
            <TouchableOpacity key={index} style={styles.pathwayCard}>
              <View style={[styles.pathwayIcon, { backgroundColor: pathway.color }]}>
                <FontAwesome name={pathway.icon} size={28} color="#fff" />
              </View>
              <Text style={styles.pathwayTitle}>{pathway.title}</Text>
              <Text style={styles.pathwayDescription}>{pathway.description}</Text>
              <View style={styles.pathwayArrow}>
                <FontAwesome name="arrow-left" size={16} color={pathway.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Activities & Opportunities Section */}
      <View style={styles.opportunitiesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.opportunities.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('home.opportunities.subtitle')}</Text>
        </View>
        
        <View style={styles.opportunitiesGrid}>
          <View style={styles.opportunityCard}>
            <LinearGradient
              colors={['#3498db', '#2980b9']}
              style={styles.opportunityGradient}
            >
              <FontAwesome name="code" size={32} color="#fff" />
              <Text style={styles.opportunityTitle}>{t('home.opportunities.hackathons.title')}</Text>
              <Text style={styles.opportunityText}>{t('home.opportunities.hackathons.description')}</Text>
            </LinearGradient>
          </View>

          <View style={styles.opportunityCard}>
            <LinearGradient
              colors={['#e74c3c', '#c0392b']}
              style={styles.opportunityGradient}
            >
              <FontAwesome name="certificate" size={32} color="#fff" />
              <Text style={styles.opportunityTitle}>{t('home.opportunities.certifiedCourses.title')}</Text>
              <Text style={styles.opportunityText}>{t('home.opportunities.certifiedCourses.description')}</Text>
            </LinearGradient>
          </View>

          <View style={styles.opportunityCard}>
            <LinearGradient
              colors={['#f39c12', '#e67e22']}
              style={styles.opportunityGradient}
            >
              <FontAwesome name="users" size={32} color="#fff" />
              <Text style={styles.opportunityTitle}>{t('home.opportunities.workshops.title')}</Text>
              <Text style={styles.opportunityText}>{t('home.opportunities.workshops.description')}</Text>
            </LinearGradient>
          </View>

          <View style={styles.opportunityCard}>
            <LinearGradient
              colors={['#9b59b6', '#8e44ad']}
              style={styles.opportunityGradient}
            >
              <FontAwesome name="trophy" size={32} color="#fff" />
              <Text style={styles.opportunityTitle}>{t('home.opportunities.contests.title')}</Text>
              <Text style={styles.opportunityText}>{t('home.opportunities.contests.description')}</Text>
            </LinearGradient>
          </View>
        </View>
      </View>

      {/* Success Stories Section */}
      <View style={styles.studentsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.successStories.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('home.successStories.subtitle')}</Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.studentsGrid}
          contentContainerStyle={styles.studentsGridContent}
        >
          {studentsData.map((student, index) => (
            <StudentCard key={index} student={student} />
          ))}
        </ScrollView>
      </View>

      {/* How It Works Section */}
      <View style={styles.howItWorksSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.howItWorks.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('home.howItWorks.subtitle')}</Text>
        </View>
        
        <View style={styles.stepsContainer}>
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <FontAwesome name="user-plus" size={32} color="#27ae60" />
            <Text style={styles.stepTitle}>{t('home.howItWorks.step1.title')}</Text>
            <Text style={styles.stepDescription}>{t('home.howItWorks.step1.description')}</Text>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <FontAwesome name="check-square-o" size={32} color="#3498db" />
            <Text style={styles.stepTitle}>{t('home.howItWorks.step2.title')}</Text>
            <Text style={styles.stepDescription}>{t('home.howItWorks.step2.description')}</Text>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <FontAwesome name="lightbulb-o" size={32} color="#f39c12" />
            <Text style={styles.stepTitle}>{t('home.howItWorks.step3.title')}</Text>
            <Text style={styles.stepDescription}>{t('home.howItWorks.step3.description')}</Text>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <FontAwesome name="rocket" size={32} color="#e74c3c" />
            <Text style={styles.stepTitle}>{t('home.howItWorks.step4.title')}</Text>
            <Text style={styles.stepDescription}>{t('home.howItWorks.step4.description')}</Text>
          </View>
        </View>
      </View>

      {/* CTA Section */}
      <LinearGradient
        colors={['#27ae60', '#2ecc71', '#1abc9c']}
        style={styles.ctaSection}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <FontAwesome name="star" size={50} color="#fff" style={styles.ctaIcon} />
        <Text style={styles.ctaTitle}>{t('home.cta.title')}</Text>
        <Text style={styles.ctaSubtitle}>{t('home.cta.subtitle')}</Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleGetStarted}
        >
          <FontAwesome name="magic" size={18} color="#27ae60" />
          <Text style={styles.ctaButtonText}>
            {user ? t('home.cta.buttonLoggedIn') : t('home.cta.button')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.ctaNote}>{t('home.cta.note')}</Text>
      </LinearGradient>
    </ScrollView>
  );
}

// Styles remain the same...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  hero: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    paddingBottom: 80,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  btnPrimary: {
    backgroundColor: '#2c3e50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  btnSecondary: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#2c3e50',
    gap: 8,
  },
  btnSecondaryText: {
    color: '#2c3e50',
    fontWeight: '700',
    fontSize: 16,
  },
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  missionSection: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 60,
    paddingHorizontal: 24,
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
    fontSize: 18,
    color: '#34495e',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statBox: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#27ae60',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  featuresSection: {
    padding: 32,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresGrid: {
    gap: 16,
  },
  pathwaysSection: {
    padding: 32,
    backgroundColor: '#f8f9fa',
  },
  pathwaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  pathwayCard: {
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
  },
  pathwayIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  pathwayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  pathwayDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  pathwayArrow: {
    marginTop: 8,
  },
  imageSection: {
    height: 300,
    position: 'relative',
  },
  universityImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  imageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  imageDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  opportunitiesSection: {
    padding: 32,
    backgroundColor: '#fff',
  },
  opportunitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  opportunityCard: {
    width: '47%',
    minWidth: 160,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  opportunityGradient: {
    padding: 24,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  opportunityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  opportunityText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 20,
  },
  studentsSection: {
    padding: 32,
    backgroundColor: '#f8f9fa',
  },
  studentsGrid: {
    paddingVertical: 16,
  },
  studentsGridContent: {
    paddingRight: 16,
  },
  howItWorksSection: {
    padding: 32,
    backgroundColor: '#fff',
  },
  stepsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  stepCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 24,
    width: '47%',
    minWidth: 160,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumberText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaSection: {
    padding: 48,
    alignItems: 'center',
  },
  ctaIcon: {
    marginBottom: 16,
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.95,
    lineHeight: 26,
  },
  ctaButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  ctaButtonText: {
    color: '#27ae60',
    fontWeight: '700',
    fontSize: 18,
  },
  ctaNote: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  personalitySection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#f8f9fa',
  },
  personalityGradient: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  personalityTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  personalityDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.95,
    lineHeight: 24,
  },
  personalityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  personalityButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9b59b6',
  },
});