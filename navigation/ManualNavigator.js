import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FloatingLanguageSwitcher from '../components/FloatingLanguageSwitcher';
import Navbar from '../components/Navigation/Navbar';
import { useAuth } from '../contexts/AuthContext';
import AboutScreen from '../screens/About/AboutScreen';
import ActivitiesScreen from '../screens/Activities/ActivitiesScreen';
import AdaptiveTestScreen from '../screens/AdaptiveTest/AdaptiveTestScreen';
import TestResultsScreen from '../screens/AdaptiveTest/TestResultsScreen';
import TotalExamScreen from '../screens/AdaptiveTest/TotalExamScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import VerifyCodeScreen from '../screens/Auth/VerifyCodeScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import PersonalityResultsScreen from '../screens/PersonalityTest/PersonalityResultsScreen';
import PersonalityTestScreen from '../screens/PersonalityTest/PersonalityTestScreen';
import SuccessStoriesScreen from '../screens/SuccessStories/SuccessStoriesScreen';

export default function ManualNavigator() {
  const { user, loading, signOut, studentData } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('home');
  const [screenParams, setScreenParams] = useState({});
  
  // Auto-redirect to home after successful login
  useEffect(() => {
    if (user && (currentScreen === 'login' || currentScreen === 'signup')) {
      navigateTo('home');
    }
  }, [user, currentScreen]);

  const navigateTo = (screen, params = {}) => {
    console.log('Navigating to:', screen, 'with params:', params);
    setCurrentScreen(screen);
    setScreenParams(params);
    
    // Update active tab only for main navigation tabs
    if (['home', 'adaptiveTest', 'profile', 'about'].includes(screen)) {
      setActiveTab(screen);
    }
  };

  const handleTabPress = (tabId) => {
    console.log('Tab pressed:', tabId);
    
    // Check if user needs to be logged in for certain screens
    if ((tabId === 'adaptiveTest' || tabId === 'profile') && !user) {
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

    // Main screens with navigation
    switch (currentScreen) {
      case 'home':
        return <HomeScreen navigateTo={navigateTo} />;
      
      case 'about':
        return <AboutScreen navigateTo={navigateTo} />;
      
      case 'activities':
        if (!user) {
          return <LoginScreen navigateTo={navigateTo} />;
        }
        return <ActivitiesScreen navigateTo={navigateTo} />;
      
      case 'successStories':
        return <SuccessStoriesScreen navigateTo={navigateTo} />;
      
      case 'adaptiveTest':
        if (!user) {
          return <LoginScreen navigateTo={navigateTo} />;
        }
        return <TotalExamScreen navigateTo={navigateTo} />;
      
      case 'startAdaptiveTest':
        if (!user) {
          return <LoginScreen navigateTo={navigateTo} />;
        }
        return (
          <AdaptiveTestScreen 
            navigateTo={navigateTo}
            subjectId={screenParams.subjectId}
            subjectIds={screenParams.subjectIds}
            subjectName={screenParams.subjectName}
            subjectNames={screenParams.subjectNames}
            isComprehensive={screenParams.isComprehensive}
          />
        );
      
      case 'testResults':
        if (!user) {
          return <LoginScreen navigateTo={navigateTo} />;
        }
        return <TestResultsScreen 
          navigateTo={navigateTo} 
          results={screenParams.results} 
          subjectName={screenParams.subjectName}
          subjectNames={screenParams.subjectNames}
          isComprehensive={screenParams.isComprehensive}
          subjectIds={screenParams.subjectIds}
        />;
      
      case 'personalityTest':
        if (!user) {
          return <LoginScreen navigateTo={navigateTo} />;
        }
        return <PersonalityTestScreen navigateTo={navigateTo} />;
      
      case 'personalityResults':
        if (!user) {
          return <LoginScreen navigateTo={navigateTo} />;
        }
        return <PersonalityResultsScreen navigateTo={navigateTo} profiles={screenParams.profiles} />;
      
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
                  <Text style={styles.infoLabel}>Student ID</Text>
                  <Text style={styles.infoValue}>{studentData?.student_id || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <FontAwesome name="phone" size={24} color="#27ae60" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{studentData?.phone || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <FontAwesome name="university" size={24} color="#27ae60" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>School</Text>
                  <Text style={styles.infoValue}>{studentData?.school_name || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <FontAwesome name="graduation-cap" size={24} color="#27ae60" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Grade Level</Text>
                  <Text style={styles.infoValue}>{studentData?.grade ? `Grade ${studentData.grade}` : 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <FontAwesome name="calendar" size={24} color="#27ae60" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Birth Date</Text>
                  <Text style={styles.infoValue}>
                    {studentData?.birthday ? new Date(studentData.birthday).toLocaleDateString('en-US') : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <FontAwesome name="sign-out" size={20} color="#e74c3c" />
              <Text style={styles.logoutText}>Sign Out</Text>
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FloatingLanguageSwitcher />
      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>
      {/* Hide navbar on auth and about screens */}
      {!['login', 'signup', 'forgotPassword', 'verifyCode', 'resetPassword', 'about'].includes(currentScreen) && (
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
});