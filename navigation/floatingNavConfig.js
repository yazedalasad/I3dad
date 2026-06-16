/** Screen-level rules for global floating back/forward controls. */

export const ADMIN_SCREENS = new Set([
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
  'manageQuestions',
  'exportReports',
]);

export const PRINCIPAL_SCREENS = new Set([
  'principalDashboard',
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
]);

/** Screens where floating controls are never shown. */
export const HIDDEN_FLOATING_NAV_SCREENS = new Set([
  'signup',
  'forgotPassword',
  'verifyCode',
  'resetPassword',
  'changePassword',
  'principalSetPassword',
  'principalAcceptInvite',
  'principalOnboarding',
  'roleRouter',
  'startAdaptiveTest',
  ...ADMIN_SCREENS,
  ...PRINCIPAL_SCREENS,
]);

/** Active test flows — back shows a confirmation dialog unless disabled via guard. */
export const CONFIRM_BACK_SCREENS = new Set(['personalityTest']);

export function getFloatingNavConfig(screen) {
  if (HIDDEN_FLOATING_NAV_SCREENS.has(screen)) {
    return { hidden: true, confirmBack: false };
  }
  if (CONFIRM_BACK_SCREENS.has(screen)) {
    return { hidden: false, confirmBack: true };
  }
  return { hidden: false, confirmBack: false };
}

export function getDefaultBackScreen() {
  return 'home';
}

/** Extra bottom padding so scrollable content clears floating nav buttons. */
export const FLOATING_NAV_BOTTOM_INSET = 76;
