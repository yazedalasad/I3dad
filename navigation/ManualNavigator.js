import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FloatingLanguageSwitcher from '../components/FloatingLanguageSwitcher';
import Navbar from '../components/Navigation/Navbar';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import AdaptiveTestScreen from '../screens/AdaptiveTest/AdaptiveTestScreen';
import TestResultsScreen from '../screens/AdaptiveTest/TestResultsScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import VerifyCodeScreen from '../screens/Auth/VerifyCodeScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import PersonalityResultsScreen from '../screens/PersonalityTest/PersonalityResultsScreen';
import PersonalityTestScreen from '../screens/PersonalityTest/PersonalityTestScreen';

export default function ManualNavigator() {
  const { user, loading, signOut, studentData } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('home');
  const [screenParams, setScreenParams] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Load subjects from database
  // Auto-redirect to home after successful login
  useEffect(() => {
   if (user && (currentScreen === 'login' || currentScreen === 'signup')) {
      navigateTo('home');
    }
  }, [user, currentScreen]);
  useEffect(() => {
    if (currentScreen === 'accountant' && user) {
      loadSubjects();
    }
  }, [currentScreen, user]);

  const loadSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name_ar');

      if (error) throw error;
      console.log('Loaded subjects:', data);
      setSubjects(data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const navigateTo = (screen, params = {}) => {
    console.log('Navigating to:', screen, 'with params:', params);
    setCurrentScreen(screen);
    setScreenParams(params);
    
    // Update active tab only for main navigation tabs
    if (['home', 'accountant', 'profile'].includes(screen)) {
      setActiveTab(screen);
    }
  };

  const handleTabPress = (tabId) => {
    console.log('Tab pressed:', tabId);
    
    // Check if user needs to be logged in for certain screens
    if ((tabId === 'accountant' || tabId === 'profile') && !user) {
      navigateTo('login');
      return;
    }
    
    navigateTo(tabId);
  };

  const handleLogout = async () => {
    await signOut();
    navigateTo('home');
  };

  const renderScreen = () => {
    // Auth screens
    if (currentScreen === 'login') {
      return <LoginScreen navigateTo={navigateTo} />;
    }
    
    if (currentScreen === 'signup') {
      return <SignupScreen navigateTo={navigateTo} />;
    }

    if (currentScreen === 'forgotPassword') {
      return <ForgotPasswordScreen navigateTo={navigateTo} />;
    }

    if (currentScreen === 'verifyCode') {
      return <VerifyCodeScreen navigateTo={navigateTo} email={screenParams.email} />;
    }

    if (currentScreen === 'resetPassword') {
      return <ResetPasswordScreen navigateTo={navigateTo} email={screenParams.email} />;
    }

    // Adaptive Test screens
    if (currentScreen === 'testResults') {
      if (!user) {
        return <LoginScreen navigateTo={navigateTo} />;
      }
      return <TestResultsScreen navigateTo={navigateTo} results={screenParams.results} subjectName={screenParams.subjectName} />;
    }

    // Personality Test screens
    if (currentScreen === 'personalityTest') {
      if (!user) {
        return <LoginScreen navigateTo={navigateTo} />;
      }
      return <PersonalityTestScreen navigateTo={navigateTo} />;
    }

    if (currentScreen === 'personalityResults') {
      if (!user) {
        return <LoginScreen navigateTo={navigateTo} />;
      }
      return <PersonalityResultsScreen navigateTo={navigateTo} profiles={screenParams.profiles} />;
    }

    // Main screens
    switch (currentScreen) {
      case 'home':
        return <HomeScreen navigateTo={navigateTo} />;
      case 'accountant':
        if (!user) {
          return <LoginScreen navigateTo={navigateTo} />;
        }
        // Show subject selection
        return (
          <View style={styles.screenContainer}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>اختر موضوع الاختبار</Text>
              <Text style={styles.selectionSubtitle}>اختر المادة التي تريد تقييم قدراتك فيها</Text>
            </View>
            {loadingSubjects ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#27ae60" />
                <Text style={styles.loadingText}>جاري تحميل المواد...</Text>
              </View>
            ) : (
              <ScrollView style={styles.subjectList}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    style={styles.subjectCard}
                    onPress={() => navigateTo('adaptiveTest', { 
                      subjectId: subject.id, 
                      subjectName: subject.name_ar 
                    })}
                  >
                    <FontAwesome name="book" size={32} color="#27ae60" />
                    <Text style={styles.subjectName}>{subject.name_ar}</Text>
                    <FontAwesome name="arrow-left" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        );
      case 'adaptiveTest':
        if (!user) {
          return <LoginScreen navigateTo={navigateTo} />;
        }
        return (
          <AdaptiveTestScreen 
            navigateTo={navigateTo}
            subjectId={screenParams.subjectId}
            subjectName={screenParams.subjectName}
          />
        );
      case 'profile':
        if (!user) {
          return <LoginScreen navigateTo={navigateTo} />;
        }
        return (
          <View style={styles.screenContainer}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <FontAwesome name="user" size={50} color="#fff" />
              </View>
              <Text style={styles.profileName}>
                {studentData?.first_name} {studentData?.last_name}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.infoCard}>
                <FontAwesome name="id-card" size={24} color="#27ae60" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>رقم الهوية</Text>
                  <Text style={styles.infoValue}>{studentData?.student_id}</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <FontAwesome name="phone" size={24} color="#27ae60" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>رقم الهاتف</Text>
                  <Text style={styles.infoValue}>{studentData?.phone}</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <FontAwesome name="university" size={24} color="#27ae60" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>المدرسة</Text>
                  <Text style={styles.infoValue}>{studentData?.school_name}</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <FontAwesome name="graduation-cap" size={24} color="#27ae60" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>الصف الدراسي</Text>
                  <Text style={styles.infoValue}>الصف {studentData?.grade}</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <FontAwesome name="calendar" size={24} color="#27ae60" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>تاريخ الميلاد</Text>
                  <Text style={styles.infoValue}>
                    {studentData?.birthday ? new Date(studentData.birthday).toLocaleDateString('ar-EG') : '-'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <FontAwesome name="sign-out" size={20} color="#e74c3c" />
              <Text style={styles.logoutText}>تسجيل الخروج</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return <HomeScreen navigateTo={navigateTo} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FloatingLanguageSwitcher />
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>
      {!['login', 'signup', 'forgotPassword', 'verifyCode', 'resetPassword'].includes(currentScreen) && (
        <Navbar activeTab={activeTab} onTabPress={handleTabPress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 60,
  },
  screenTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  screenSubtitle: {
    color: '#94A3B8',
    fontSize: 18,
    textAlign: 'center',
  },
  welcomeText: {
    color: '#27ae60',
    fontSize: 20,
    marginTop: 20,
    textAlign: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#1e293b',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  profileEmail: {
    fontSize: 16,
    color: '#94A3B8',
  },
  profileInfo: {
    padding: 20,
    gap: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'right',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
  },
  selectionHeader: {
    padding: 24,
    alignItems: 'center',
  },
  selectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  selectionSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  subjectList: {
    flex: 1,
    padding: 20,
  },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  subjectName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'right',
  },
});
