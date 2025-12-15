import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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

// ✅ Role router
import RoleRouterScreen from '../screens/Auth/RoleRouterScreen';

// ✅ Dashboards
import AdminDashboardScreen from '../screens/Dashboard/AdminDashboardScreen';
import PrincipalDashboardScreen from '../screens/Dashboard/PrincipalDashboardScreen';

import HomeScreen from '../screens/Home/HomeScreen';
import PersonalityResultsScreen from '../screens/PersonalityTest/PersonalityResultsScreen';
import PersonalityTestScreen from '../screens/PersonalityTest/PersonalityTestScreen';
import SuccessStoriesScreen from '../screens/SuccessStories/SuccessStoriesScreen';

// ✅ New Profile screens
import EditStudentProfileScreen from '../screens/Profile/EditStudentProfileScreen';
import StudentProfileScreen from '../screens/Profile/StudentProfileScreen';

export default function ManualNavigator() {
  const { user, loading } = useAuth();

  const [currentScreen, setCurrentScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('home');
  const [screenParams, setScreenParams] = useState({});

  // ✅ After successful login/signup -> roleRouter (automatic)
  useEffect(() => {
    if (user && (currentScreen === 'login' || currentScreen === 'signup')) {
      navigateTo('roleRouter');
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

  const renderScreen = () => {
    // Auth screens
    if (currentScreen === 'login') return <LoginScreen navigateTo={navigateTo} />;
    if (currentScreen === 'signup') return <SignupScreen navigateTo={navigateTo} />;
    if (currentScreen === 'forgotPassword') return <ForgotPasswordScreen navigateTo={navigateTo} />;

    if (currentScreen === 'verifyCode') {
      return <VerifyCodeScreen navigateTo={navigateTo} email={screenParams.email} />;
    }

    if (currentScreen === 'resetPassword') {
      return <ResetPasswordScreen navigateTo={navigateTo} email={screenParams.email} />;
    }

    // ✅ Role router (auto redirect)
    if (currentScreen === 'roleRouter') {
      return <RoleRouterScreen navigateTo={navigateTo} />;
    }

    // ✅ Dashboards
    if (currentScreen === 'adminDashboard') {
      if (!user) return <LoginScreen navigateTo={navigateTo} />;
      return <AdminDashboardScreen navigateTo={navigateTo} />;
    }

    if (currentScreen === 'principalDashboard') {
      if (!user) return <LoginScreen navigateTo={navigateTo} />;
      return <PrincipalDashboardScreen navigateTo={navigateTo} />;
    }

    // Main screens with navigation
    switch (currentScreen) {
      case 'home':
        return <HomeScreen navigateTo={navigateTo} />;

      case 'about':
        return <AboutScreen navigateTo={navigateTo} />;

      case 'activities':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <ActivitiesScreen navigateTo={navigateTo} />;

      case 'successStories':
        return <SuccessStoriesScreen navigateTo={navigateTo} />;

      case 'adaptiveTest':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <TotalExamScreen navigateTo={navigateTo} />;

      case 'startAdaptiveTest':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
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
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <TestResultsScreen
            navigateTo={navigateTo}
            results={screenParams.results}
            subjectName={screenParams.subjectName}
            subjectNames={screenParams.subjectNames}
            isComprehensive={screenParams.isComprehensive}
            subjectIds={screenParams.subjectIds}
          />
        );

      case 'personalityTest':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <PersonalityTestScreen navigateTo={navigateTo} />;

      case 'personalityResults':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <PersonalityResultsScreen navigateTo={navigateTo} profiles={screenParams.profiles} />;

      // ✅ New profile screens
      case 'profile':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <StudentProfileScreen navigateTo={navigateTo} />;

      case 'editProfile':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <EditStudentProfileScreen navigateTo={navigateTo} />;

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

  // ✅ Hide navbar on auth/about/router/dashboards/edit profile
  const hideNavbarOn = [
    'login',
    'signup',
    'forgotPassword',
    'verifyCode',
    'resetPassword',
    'about',
    'roleRouter',
    'adminDashboard',
    'principalDashboard',
    'editProfile',
  ];

  return (
    <View style={styles.container}>
      <FloatingLanguageSwitcher />
      <View style={{ flex: 1 }}>{renderScreen()}</View>

      {!hideNavbarOn.includes(currentScreen) && (
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
});
