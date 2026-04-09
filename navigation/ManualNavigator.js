// File: navigation/ManualNavigator.js

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import FloatingLanguageSwitcher from '../components/FloatingLanguageSwitcher';
import Navbar from '../components/Navigation/Navbar';
import { useAuth } from '../contexts/AuthContext';

import AboutScreen from '../screens/About/AboutScreen';
import ActivitiesScreen from '../screens/Activities/ActivitiesScreen';
import AdaptiveTestScreen from '../screens/AdaptiveTest/AdaptiveTestScreen';
import TestResultsScreen from '../screens/AdaptiveTest/TestResultsScreen';
import TotalExamScreen from '../screens/AdaptiveTest/TotalExamScreen';

import ChangePasswordScreen from '../screens/Auth/ChangePasswordScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import PrincipalSetPasswordScreen from '../screens/Auth/PrincipalSetPasswordScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';
import RoleRouterScreen from '../screens/Auth/RoleRouterScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import VerifyCodeScreen from '../screens/Auth/VerifyCodeScreen';

import AdminDashboardScreen from '../screens/Dashboard/AdminDashboardScreen';
import PrincipalDashboardScreen from '../screens/Dashboard/PrincipalDashboardScreen';

import HomeScreen from '../screens/Home/HomeScreen';
import SuccessStoriesScreen from '../screens/SuccessStories/SuccessStoriesScreen';

import EditStudentProfileScreen from '../screens/Profile/EditStudentProfileScreen';
import ExamHistoryScreen from '../screens/Profile/ExamHistoryScreen';
import StudentProfileScreen from '../screens/Profile/StudentProfileScreen';

import StudentRecommendationsScreen from '../screens/Profile/StudentRecommendationsScreen';

import PersonalityResultsScreen from '../screens/AdaptiveTest/PersonalityResultsScreen';
import PersonalityTestScreen from '../screens/AdaptiveTest/PersonalityTestScreen';

import StudentInsightReportScreen from '../screens/StudentInsightReport/StudentInsightReportScreen';

function normalizeLang(lng) {
  const s = String(lng || '').toLowerCase();
  return s.startsWith('he') ? 'he' : 'ar';
}

export default function ManualNavigator() {
  const { user, loading, studentData } = useAuth();
  const { i18n } = useTranslation();

  const [currentScreen, setCurrentScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('home');
  const [screenParams, setScreenParams] = useState({});

  // ✅ Prevent loops: only route to roleRouter ONCE after login/signup
  const routedAfterLoginRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    // If logged out, reset the ref so next login will route again
    if (!user) {
      routedAfterLoginRef.current = false;
      return;
    }

    // Only if user is on login/signup, route one time
    if ((currentScreen === 'login' || currentScreen === 'signup') && !routedAfterLoginRef.current) {
      routedAfterLoginRef.current = true;
      navigateTo('roleRouter');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, currentScreen]);

  const navigateTo = (screen, params = {}) => {
    const currentLang = normalizeLang(i18n.language);
    const nextParams = { ...params };

    if (!nextParams.language) {
      nextParams.language = currentLang;
    } else {
      nextParams.language = normalizeLang(nextParams.language);
    }

    setCurrentScreen(screen);
    setScreenParams(nextParams);

    if (['home', 'adaptiveTest', 'profile', 'about'].includes(screen)) {
      setActiveTab(screen);
    }
  };

  // ✅ MIN CHANGE: make navbar "adaptiveTest" behave like Home "Start Exam"
  const handleTabPress = (tabId) => {
    if (tabId === 'adaptiveTest') {
      navigateTo(user ? 'adaptiveTest' : 'signup');
      return;
    }

    if (tabId === 'profile' && !user) {
      navigateTo('login');
      return;
    }

    navigateTo(tabId);
  };

  const renderScreen = () => {
    // Auth screens
    if (currentScreen === 'login') return <LoginScreen navigateTo={navigateTo} />;
    if (currentScreen === 'signup') return <SignupScreen navigateTo={navigateTo} />;

    // ✅ FIX: pass email so the screen can prefill and keep flow consistent
    if (currentScreen === 'forgotPassword') {
      return <ForgotPasswordScreen navigateTo={navigateTo} email={screenParams.email} />;
    }

    if (currentScreen === 'verifyCode') {
      return <VerifyCodeScreen navigateTo={navigateTo} email={screenParams.email} />;
    }

    if (currentScreen === 'resetPassword') {
      return <ResetPasswordScreen navigateTo={navigateTo} email={screenParams.email} />;
    }

    if (currentScreen === 'changePassword') {
      if (!user) return <LoginScreen navigateTo={navigateTo} />;
      return <ChangePasswordScreen navigateTo={navigateTo} />;
    }

    if (currentScreen === 'principalSetPassword') {
      return <PrincipalSetPasswordScreen navigateTo={navigateTo} />;
    }

    if (currentScreen === 'roleRouter') {
      return <RoleRouterScreen navigateTo={navigateTo} />;
    }

    // App screens
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
        return (
          <TotalExamScreen
            navigateTo={navigateTo}
            studentId={studentData?.id}
            studentName={
              studentData
                ? `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim()
                : 'طالب'
            }
            language={screenParams.language || normalizeLang(i18n.language)}
          />
        );

      case 'startAdaptiveTest':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <AdaptiveTestScreen
            navigateTo={navigateTo}
            sessionId={screenParams.sessionId}
            studentId={screenParams.studentId}
            subjectStates={screenParams.subjectStates}
            subjectIds={screenParams.subjectIds}
            language={screenParams.language || normalizeLang(i18n.language)}
            isComprehensive={screenParams.isComprehensive}
            subjectNames={screenParams.subjectNames}
          />
        );

      case 'testResults':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <TestResultsScreen
            navigateTo={navigateTo}
            sessionId={screenParams.sessionId}
            subjectId={screenParams.subjectId}
            personalitySessionId={screenParams.personalitySessionId || null}
            studentId={screenParams.studentId || studentData?.id}
            language={screenParams.language || normalizeLang(i18n.language)}
          />
        );

      case 'personalityTest':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <PersonalityTestScreen
            navigateTo={navigateTo}
            studentId={screenParams.studentId || studentData?.id}
            language={screenParams.language || normalizeLang(i18n.language)}
            abilitySessionId={screenParams.abilitySessionId || null}
            abilityJustFinished={!!screenParams.abilityJustFinished}
            existingPersonalitySessionId={screenParams.existingPersonalitySessionId || null}
          />
        );

      case 'personalityResults':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <PersonalityResultsScreen
            navigateTo={navigateTo}
            studentId={screenParams.studentId || studentData?.id}
            language={screenParams.language || normalizeLang(i18n.language)}
          />
        );

      case 'studentInsightReport':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <StudentInsightReportScreen
            navigateTo={navigateTo}
            studentId={screenParams.studentId || studentData?.id}
            abilitySessionId={screenParams.abilitySessionId || screenParams.sessionId || null}
            personalitySessionId={screenParams.personalitySessionId || null}
            language={screenParams.language || normalizeLang(i18n.language)}
          />
        );

      case 'adminDashboard':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminDashboardScreen navigateTo={navigateTo} />;

      case 'principalDashboard':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <PrincipalDashboardScreen navigateTo={navigateTo} />;

      case 'profile':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <StudentProfileScreen navigateTo={navigateTo} />;

      case 'editProfile':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <EditStudentProfileScreen navigateTo={navigateTo} />;

      case 'examHistory':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <ExamHistoryScreen navigateTo={navigateTo} />;

      case 'recommendations':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <StudentRecommendationsScreen navigateTo={navigateTo} />;

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

  const hideNavbarOn = [
    'login',
    'signup',
    'forgotPassword',
    'verifyCode',
    'resetPassword',
    'changePassword',
    'principalSetPassword',
    'about',
    'roleRouter',
    'adminDashboard',
    'principalDashboard',
    'editProfile',
    'examHistory',
    'recommendations',
    'startAdaptiveTest',
    'personalityTest',
    'personalityResults',
    'testResults',
  ];

  return (
    <View style={styles.container}>
      <FloatingLanguageSwitcher />

      {!hideNavbarOn.includes(currentScreen) && (
        <Navbar activeTab={activeTab} onTabPress={handleTabPress} />
      )}

      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
});
