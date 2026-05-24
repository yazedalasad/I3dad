// File: navigation/ManualNavigator.js

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import Navbar from '../components/Navigation/Navbar';
import { useAuth } from '../contexts/AuthContext';

import AboutScreen from '../screens/About/AboutScreen';
import ActivitiesScreen from '../screens/Activities/ActivitiesScreen';
import AdaptiveTestScreen from '../screens/AdaptiveTest/AdaptiveTestScreen';
import TestResultsScreen from '../screens/AdaptiveTest/TestResultsScreen';
import TotalExamScreen from '../screens/AdaptiveTest/TotalExamScreen';
import ReviewAnswersScreen from '../components/AdaptiveTest/ReviewAnswersScreen';

import ChangePasswordScreen from '../screens/Auth/ChangePasswordScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import LoginScreen from '../screens/Auth/LoginScreen.js';
import PrincipalAcceptInviteScreen from '../screens/Auth/PrincipalAcceptInviteScreen';
import PrincipalFirstTimeRegisterScreen from '../screens/Auth/PrincipalFirstTimeRegisterScreen';
import PrincipalOnboardingScreen from '../screens/Auth/PrincipalOnboardingScreen';
import PrincipalSetPasswordScreen from '../screens/Auth/PrincipalSetPasswordScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';
import RoleRouterScreen from '../screens/Auth/RoleRouterScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import VerifyCodeScreen from '../screens/Auth/VerifyCodeScreen';

import AdminDashboardScreen from '../screens/dashboard/AdminDashboardScreen';
import AdminAuditLogScreen from '../screens/dashboard/AdminAuditLogScreen';
import AdminGamesScreen from '../screens/dashboard/AdminGamesScreen';
import AdminInstitutionsScreen from '../screens/dashboard/AdminInstitutionsScreen';
import AdminManagementScreen from '../screens/dashboard/AdminManagementScreen';
import AdminManagersScreen from '../screens/dashboard/AdminManagersScreen';
import AdminQuestionFormScreen from '../screens/dashboard/AdminQuestionFormScreen';
import AdminQuestionsScreen from '../screens/dashboard/AdminQuestionsScreen';
import AdminReportsScreen from '../screens/dashboard/AdminReportsScreen';
import AdminRolesScreen from '../screens/dashboard/AdminRolesScreen';
import AdminSchoolsScreen from '../screens/dashboard/AdminSchoolsScreen';
import AdminSettingsScreen from '../screens/dashboard/AdminSettingsScreen';
import AdminStudentDetailsScreen from '../screens/dashboard/AdminStudentDetailsScreen';
import AdminStudentsScreen from '../screens/dashboard/AdminStudentsScreen';
import AdminSubjectsScreen from '../screens/dashboard/AdminSubjectsScreen';
import AdminTestSessionsScreen from '../screens/dashboard/AdminTestSessionsScreen';
import AdminTranslationsScreen from '../screens/dashboard/AdminTranslationsScreen';
import AssessmentsTrackingScreen from '../screens/dashboard/AssessmentsTrackingScreen';
import ClassesAnalyticsScreen from '../screens/dashboard/ClassesAnalyticsScreen';
import ExportReportsScreen from '../screens/dashboard/ExportReportsScreen';
import GamesAnalyticsScreen from '../screens/dashboard/GamesAnalyticsScreen';
import ManageQuestionsScreen from '../screens/dashboard/ManageQuestionsScreen';
import MajorsAnalyticsScreen from '../screens/dashboard/MajorsAnalyticsScreen';
import PrincipalActivitiesScreen from '../screens/dashboard/PrincipalActivitiesScreen';
import PrincipalDashboardScreen from '../screens/dashboard/PrincipalDashboardScreen';
import PrincipalProfileSettingsScreen from '../screens/dashboard/PrincipalProfileSettingsScreen';
import PrincipalReportsScreen from '../screens/dashboard/PrincipalReportsScreen';
import PrincipalStudentDetailsScreen from '../screens/dashboard/PrincipalStudentDetailsScreen';
import PrincipalStudentsScreen from '../screens/dashboard/PrincipalStudentsScreen';
import SchoolStrengthsWeaknessesScreen from '../screens/dashboard/SchoolStrengthsWeaknessesScreen';
import StudentReportDetailsScreen from '../screens/dashboard/StudentReportDetailsScreen';

import HomeScreen from '../screens/Home/HomeScreen';
import GamesScreen from '../screens/Games/GamesScreen';
import SuccessStoriesScreen from '../screens/SuccessStories/SuccessStoriesScreen';

import EditStudentProfileScreen from '../screens/Profile/EditStudentProfileScreen';
import ExamHistoryScreen from '../screens/Profile/ExamHistoryScreen';
import FinalReportScreen from '../screens/Profile/FinalReportScreen';
import InstitutionDetailsScreen from '../screens/Profile/InstitutionDetailsScreen';
import MajorDetailsScreen from '../screens/Profile/MajorDetailsScreen';
import MiniTasksScreen from '../screens/Profile/MiniTasksScreen';
import SkillsProfileScreen from '../screens/Profile/SkillsProfileScreen';
import StudentProfileScreen from '../screens/Profile/StudentProfileScreen';
import UniversitiesAndCollegesScreen from '../screens/Profile/UniversitiesAndCollegesPage.js';

import StudentRecommendationsScreen from '../screens/Profile/StudentRecommendationsScreen';

import PersonalityResultsScreen from '../screens/AdaptiveTest/PersonalityResultsScreen';
import PersonalityTestScreen from '../screens/AdaptiveTest/PersonalityTestScreen';

import StudentInsightReportScreen from '../screens/StudentInsightReport/StudentInsightReportScreen';
import {
  ArabicPoetPuzzleHomeScreen,
  ArabicPoetPuzzleLevelScreen,
  ArabicPoetPuzzleResultScreen,
} from '../features/games/arabicPoetPuzzle';
import {
  DoctorSorokaCaseScreen,
  DoctorSorokaHomeScreen,
  DoctorSorokaSummaryScreen,
} from '../features/games/doctorSoroka';
import {
  PhysicsLabHomeScreen,
  PhysicsLabLevelScreen,
  PhysicsLabResultScreen,
} from '../features/games/physicsLab';
import {
  PhysicsBridgeGameScreen,
  PhysicsBridgeLevelSelectScreen,
} from '../features/games/physicsBridge';
import { SudokuHomeScreen, SudokuGameScreen } from '../features/games/sudoku';

function normalizeLang(lng) {
  const s = String(lng || '').toLowerCase();
  return s.startsWith('he') ? 'he' : 'ar';
}

const NAVBAR_TAB_SCREENS = [
  'home',
  'successStories',
  'activities',
  'games',
  'universitiesAndColleges',
  'adaptiveTest',
  'profile',
  'about',
  'login',
];

const STUDENT_ID_REQUIRED_SCREENS = new Set([
  'adaptiveTest',
  'startAdaptiveTest',
  'testResults',
  'reviewAnswers',
  'personalityTest',
  'personalityResults',
  'studentInsightReport',
  'finalReport',
  'DoctorSorokaHome',
  'DoctorSorokaCase',
  'DoctorSorokaSummary',
  'PhysicsLabHome',
  'PhysicsLabLevel',
  'PhysicsLabResult',
  'ArabicPoetPuzzleHome',
  'ArabicPoetPuzzleLevel',
  'ArabicPoetPuzzleResult',
  'physicsBridgeLevelSelect',
  'physicsBridgeGame',
  'SudokuHome',
  'SudokuGame',
]);

export default function ManualNavigator() {
  const { user, initializingAuth, profile, studentData, studentDataLoading, studentId, studentIdentity, profileError } = useAuth();
  const { i18n } = useTranslation();

  const [currentScreen, setCurrentScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('home');
  const [screenParams, setScreenParams] = useState({});
  const [historyStack, setHistoryStack] = useState([]);

  // ✅ Prevent loops: only route to roleRouter ONCE after login/signup
  const routedAfterLoginRef = useRef(false);

  useEffect(() => {
    if (initializingAuth) return;

    // If logged out, reset the ref so next login will route again
    if (!user) {
      routedAfterLoginRef.current = false;
      return;
    }

    const role = String(user?.app_metadata?.role || profile?.role || '').toLowerCase();
    const isAdministrativeRole = ['admin', 'principal', 'school_admin'].includes(role);

    if (!isAdministrativeRole && studentDataLoading) return;

    const shouldRouteAfterAuth =
      currentScreen === 'login' ||
      (currentScreen === 'home' && isAdministrativeRole);

    // Only route once after an auth transition or an invited admin/principal callback.
    if (shouldRouteAfterAuth && !routedAfterLoginRef.current) {
      routedAfterLoginRef.current = true;
      navigateTo('roleRouter', {}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, initializingAuth, profile?.role, user?.app_metadata?.role, studentDataLoading, currentScreen]);

  const navigateTo = (screen, params = {}, options = {}) => {
    const currentLang = normalizeLang(i18n.language);
    const nextParams = { ...params };
    const { replace = false, resetHistory = false } = options;

    if (!nextParams.language) {
      nextParams.language = currentLang;
    } else {
      nextParams.language = normalizeLang(nextParams.language);
    }

    if (resetHistory) {
      setHistoryStack([]);
    } else if (replace) {
      // Keep the stack as-is and swap the current screen.
    } else if (screen !== currentScreen) {
      setHistoryStack((prev) => [...prev, { screen: currentScreen, params: screenParams }]);
    }

    setCurrentScreen(screen);
    setScreenParams(nextParams);

    if (NAVBAR_TAB_SCREENS.includes(screen)) {
      setActiveTab(screen);
    }
  };

  useEffect(() => {
    const href = typeof window !== 'undefined' && window.location?.href;
    if (!href) return;

    const url = new URL(href);
    if (!['/principal-register', '/principal/accept-invite'].includes(url.pathname)) return;

    const token = url.searchParams.get('token') || '';
    if (!token) return;
    const code = url.searchParams.get('code') || '';

    navigateTo('principalRegister', { token, code }, { replace: true, resetHistory: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ MIN CHANGE: make navbar "adaptiveTest" behave like Home "Start Exam"
  const handleTabPress = (tabId) => {
    if (tabId === 'adaptiveTest') {
      navigateTo(user ? 'adaptiveTest' : 'signup', {}, { resetHistory: true });
      return;
    }

    if (tabId === 'profile' && !user) {
      navigateTo('login', {}, { resetHistory: true });
      return;
    }

    if (tabId === 'universitiesAndColleges' && !user) {
      navigateTo('login', {}, { resetHistory: true });
      return;
    }

    navigateTo(tabId, {}, { resetHistory: true });
  };

  const handleGoBack = () => {
    setHistoryStack((prev) => {
      if (!prev.length) return prev;

      const nextHistory = [...prev];
      const previousEntry = nextHistory.pop();

      setCurrentScreen(previousEntry.screen);
      setScreenParams(previousEntry.params || {});

      if (NAVBAR_TAB_SCREENS.includes(previousEntry.screen)) {
        setActiveTab(previousEntry.screen);
      }

      return nextHistory;
    });
  };

  const gameNavigation = {
    navigate: (screen, params = {}) => navigateTo(screen, params),
    replace: (screen, params = {}) => navigateTo(screen, params, { replace: true }),
  };

  const resolvedStudentId = screenParams.studentId || studentId || studentData?.id || null;
  const gameRoute = {
    params: {
      ...screenParams,
      studentId: screenParams.studentId || resolvedStudentId,
    },
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

    if (currentScreen === 'principalAcceptInvite') {
      return <PrincipalAcceptInviteScreen navigateTo={navigateTo} route={gameRoute} />;
    }

    if (currentScreen === 'principalRegister') {
      return <PrincipalFirstTimeRegisterScreen navigateTo={navigateTo} route={gameRoute} />;
    }

    if (currentScreen === 'principalOnboarding') {
      if (!user) return <LoginScreen navigateTo={navigateTo} />;
      return <PrincipalOnboardingScreen navigateTo={navigateTo} />;
    }

    if (currentScreen === 'roleRouter') {
      if (studentDataLoading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#27ae60" />
            <Text style={styles.loadingText}>
              {normalizeLang(i18n.language) === 'he'
                ? 'טוען את פרטי המשתמש...'
                : 'جاري تحميل بيانات المستخدم...'}
            </Text>
          </View>
        );
      }

      if (profileError) {
        return (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{profileError}</Text>
          </View>
        );
      }

      return <RoleRouterScreen navigateTo={navigateTo} />;
    }

    if (user && STUDENT_ID_REQUIRED_SCREENS.has(currentScreen) && !resolvedStudentId) {
      if (studentDataLoading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#27ae60" />
            <Text style={styles.loadingText}>
              {normalizeLang(i18n.language) === 'he' ? 'טוען את פרטי התלמיד...' : 'جاري تحميل بيانات الطالب...'}
            </Text>
          </View>
        );
      }

      return <EditStudentProfileScreen navigateTo={navigateTo} />;
    }

    // App screens
    switch (currentScreen) {
      case 'home':
        return <HomeScreen navigateTo={navigateTo} />;

      case 'about':
        return <AboutScreen navigateTo={navigateTo} />;

      case 'games':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <GamesScreen navigateTo={navigateTo} />;

      case 'activities':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <ActivitiesScreen navigateTo={navigateTo} />;

      case 'DoctorSorokaHome':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <DoctorSorokaHomeScreen
            navigation={gameNavigation}
            studentId={resolvedStudentId}
          />
        );

      case 'DoctorSorokaCase':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <DoctorSorokaCaseScreen
            navigation={gameNavigation}
            route={gameRoute}
          />
        );

      case 'DoctorSorokaSummary':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <DoctorSorokaSummaryScreen
            navigation={gameNavigation}
            route={gameRoute}
          />
        );

      case 'PhysicsLabHome':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <PhysicsLabHomeScreen
            navigation={gameNavigation}
            studentId={resolvedStudentId}
          />
        );

      case 'PhysicsLabLevel':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <PhysicsLabLevelScreen
            navigation={gameNavigation}
            route={gameRoute}
          />
        );

      case 'PhysicsLabResult':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <PhysicsLabResultScreen
            navigation={gameNavigation}
            route={gameRoute}
          />
        );

      case 'ArabicPoetPuzzleHome':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <ArabicPoetPuzzleHomeScreen
            navigation={gameNavigation}
            studentId={resolvedStudentId}
          />
        );

      case 'ArabicPoetPuzzleLevel':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <ArabicPoetPuzzleLevelScreen
            navigation={gameNavigation}
            route={gameRoute}
          />
        );

      case 'ArabicPoetPuzzleResult':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <ArabicPoetPuzzleResultScreen
            navigation={gameNavigation}
            route={gameRoute}
          />
        );

      case 'physicsBridgeLevelSelect':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <PhysicsBridgeLevelSelectScreen
            navigation={gameNavigation}
            navigateTo={navigateTo}
            studentId={resolvedStudentId}
          />
        );

      case 'physicsBridgeGame':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <PhysicsBridgeGameScreen
            navigation={gameNavigation}
            route={gameRoute}
            navigateTo={navigateTo}
            studentId={resolvedStudentId}
          />
        );

      case 'SudokuHome':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <SudokuHomeScreen
            navigation={gameNavigation}
            studentId={resolvedStudentId}
          />
        );

      case 'SudokuGame':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <SudokuGameScreen
            navigation={gameNavigation}
            route={gameRoute}
            studentId={resolvedStudentId}
          />
        );

      case 'successStories':
        return <SuccessStoriesScreen navigateTo={navigateTo} />;

      case 'adaptiveTest':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <TotalExamScreen
            navigateTo={navigateTo}
            studentId={resolvedStudentId}
            studentDataLoading={studentDataLoading}
            studentName={studentIdentity?.fullName || 'Student'}
            language={screenParams.language || normalizeLang(i18n.language)}
          />
        );

      case 'startAdaptiveTest':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <AdaptiveTestScreen
            navigateTo={navigateTo}
            sessionId={screenParams.sessionId}
            studentId={resolvedStudentId}
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
            studentId={screenParams.studentId || resolvedStudentId}
            skippedCount={screenParams.skippedCount}
            totalTimeSpent={screenParams.totalTimeSpent}
            assessmentCompleted={!!screenParams.assessmentCompleted}
            recommendationRefreshError={screenParams.recommendationRefreshError || null}
            language={screenParams.language || normalizeLang(i18n.language)}
          />
        );

      case 'reviewAnswers':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <ReviewAnswersScreen
            navigateTo={navigateTo}
            sessionId={screenParams.sessionId}
            language={screenParams.language || normalizeLang(i18n.language)}
          />
        );

      case 'personalityTest':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <PersonalityTestScreen
            navigateTo={navigateTo}
            studentId={resolvedStudentId}
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
            studentId={resolvedStudentId}
            language={screenParams.language || normalizeLang(i18n.language)}
          />
        );

      case 'studentInsightReport':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <StudentInsightReportScreen
            navigateTo={navigateTo}
            studentId={resolvedStudentId}
            abilitySessionId={screenParams.abilitySessionId || screenParams.sessionId || null}
            personalitySessionId={screenParams.personalitySessionId || null}
            language={screenParams.language || normalizeLang(i18n.language)}
          />
        );

      case 'adminDashboard':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminDashboardScreen navigateTo={navigateTo} />;

      case 'adminManagement':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminManagementScreen navigateTo={navigateTo} route={gameRoute} />;

      case 'adminStudents':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminStudentsScreen navigateTo={navigateTo} />;

      case 'adminStudentDetails':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminStudentDetailsScreen navigateTo={navigateTo} route={gameRoute} />;

      case 'adminManagers':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminManagersScreen navigateTo={navigateTo} />;

      case 'adminSchools':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminSchoolsScreen navigateTo={navigateTo} />;

      case 'adminSubjects':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminSubjectsScreen navigateTo={navigateTo} />;

      case 'adminQuestions':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminQuestionsScreen navigateTo={navigateTo} />;

      case 'adminQuestionForm':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminQuestionFormScreen navigateTo={navigateTo} />;

      case 'adminGames':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminGamesScreen navigateTo={navigateTo} />;

      case 'adminTestSessions':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminTestSessionsScreen navigateTo={navigateTo} />;

      case 'adminReports':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminReportsScreen navigateTo={navigateTo} />;

      case 'adminInstitutions':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminInstitutionsScreen navigateTo={navigateTo} />;

      case 'adminTranslations':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminTranslationsScreen navigateTo={navigateTo} />;

      case 'adminRoles':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminRolesScreen navigateTo={navigateTo} />;

      case 'adminAuditLog':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminAuditLogScreen navigateTo={navigateTo} />;

      case 'adminSettings':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AdminSettingsScreen navigateTo={navigateTo} />;

      case 'manageQuestions':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <ManageQuestionsScreen navigateTo={navigateTo} />;

      case 'exportReports':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <ExportReportsScreen navigateTo={navigateTo} />;

      case 'principalDashboard':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <PrincipalDashboardScreen navigateTo={navigateTo} />;

      case 'principalStudents':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <PrincipalStudentsScreen navigateTo={navigateTo} />;

      case 'studentReportDetails':
      case 'principalStudentDetails':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        if (currentScreen === 'principalStudentDetails') {
          return <PrincipalStudentDetailsScreen navigateTo={navigateTo} route={gameRoute} />;
        }
        return <StudentReportDetailsScreen navigateTo={navigateTo} route={gameRoute} />;

      case 'classesAnalytics':
      case 'principalClassAnalytics':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <ClassesAnalyticsScreen navigateTo={navigateTo} />;

      case 'majorsAnalytics':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <MajorsAnalyticsScreen navigateTo={navigateTo} />;

      case 'schoolStrengthsWeaknesses':
      case 'principalStrengthsWeaknesses':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <SchoolStrengthsWeaknessesScreen navigateTo={navigateTo} />;

      case 'assessmentsTracking':
      case 'principalTestTracking':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <AssessmentsTrackingScreen navigateTo={navigateTo} />;

      case 'gamesAnalytics':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <GamesAnalyticsScreen navigateTo={navigateTo} />;

      case 'principalActivities':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <PrincipalActivitiesScreen navigateTo={navigateTo} />;

      case 'principalReports':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <PrincipalReportsScreen navigateTo={navigateTo} />;

      case 'principalProfileSettings':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <PrincipalProfileSettingsScreen navigateTo={navigateTo} />;

      case 'profile':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        if (!studentData?.id) {
          return <EditStudentProfileScreen navigateTo={navigateTo} />;
        }
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

      case 'skillsProfile':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <SkillsProfileScreen navigateTo={navigateTo} />;

      case 'majorDetails':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <MajorDetailsScreen navigateTo={navigateTo} route={gameRoute} />;

      case 'universitiesAndColleges':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <UniversitiesAndCollegesScreen navigateTo={navigateTo} route={gameRoute} />;

      case 'institutionDetails':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <InstitutionDetailsScreen navigateTo={navigateTo} route={gameRoute} />;

      case 'miniTasks':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return <MiniTasksScreen navigateTo={navigateTo} route={gameRoute} />;

      case 'finalReport':
        if (!user) return <LoginScreen navigateTo={navigateTo} />;
        return (
          <FinalReportScreen
            navigateTo={navigateTo}
            studentId={resolvedStudentId}
            studentName={studentIdentity?.fullName || 'Student'}
            language={screenParams.language || normalizeLang(i18n.language)}
          />
        );

      default:
        return <HomeScreen navigateTo={navigateTo} />;
    }
  };

  if (initializingAuth) {
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
    'principalAcceptInvite',
    'principalRegister',
    'principalOnboarding',
    'roleRouter',
    'adminDashboard',
    'adminManagement',
    'adminStudents',
    'adminStudentDetails',
    'adminManagers',
    'adminSchools',
    'adminSubjects',
    'adminQuestions',
    'adminQuestionForm',
    'adminGames',
    'adminTestSessions',
    'adminReports',
    'adminInstitutions',
    'adminTranslations',
    'adminRoles',
    'adminAuditLog',
    'adminSettings',
    'principalDashboard',
    'manageQuestions',
    'exportReports',
    'principalStudents',
    'studentReportDetails',
    'principalStudentDetails',
    'classesAnalytics',
    'principalClassAnalytics',
    'majorsAnalytics',
    'schoolStrengthsWeaknesses',
    'principalStrengthsWeaknesses',
    'assessmentsTracking',
    'principalTestTracking',
    'gamesAnalytics',
    'principalActivities',
    'principalReports',
    'principalProfileSettings',
    'editProfile',
    'examHistory',
    'recommendations',
    'skillsProfile',
    'majorDetails',
    'institutionDetails',
    'miniTasks',
    'finalReport',
    'startAdaptiveTest',
    'DoctorSorokaHome',
    'DoctorSorokaCase',
    'DoctorSorokaSummary',
    'PhysicsLabHome',
    'PhysicsLabLevel',
    'PhysicsLabResult',
    'ArabicPoetPuzzleHome',
    'ArabicPoetPuzzleLevel',
    'ArabicPoetPuzzleResult',
    'physicsBridgeLevelSelect',
    'physicsBridgeGame',
    'SudokuHome',
    'SudokuGame',
    'personalityTest',
    'personalityResults',
    'testResults',
    'reviewAnswers',
  ];

  return (
    <View style={styles.container}>
      {!hideNavbarOn.includes(currentScreen) && (
        <Navbar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          canGoBack={historyStack.length > 0}
          onBackPress={handleGoBack}
        />
      )}

      <View style={styles.screenHost}>{renderScreen()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', backgroundColor: '#F6F8FF', minHeight: 0 },
  screenHost: { flex: 1, width: '100%', minHeight: 0 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
});
