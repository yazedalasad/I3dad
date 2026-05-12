import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AdminCard,
  AdminShell,
  ChartCard,
  ErrorState,
  LoadingState,
  StatCard,
  useAdminBreakpoints,
} from '../../components/Admin/AdminLayout';
import { adminColors } from '../../components/Admin/adminTheme';
import { useAdminTranslator } from '../../components/Admin/adminTranslations';
import { getAdminDashboardOverview } from '../../services/adminPanelService';

export default function AdminDashboardScreen({ navigateTo }) {
  const tr = useAdminTranslator();
  const { i18n } = useTranslation();
  const isHe = String(i18n.language || '').startsWith('he');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const { isMobile, isTablet } = useAdminBreakpoints();

  useEffect(() => {
    let mounted = true;
    getAdminDashboardOverview()
      .then((data) => {
        if (!mounted) return;
        setOverview(data);
        setError(data?.warnings?.[0] || null);
      })
      .catch((err) => mounted && setError(err?.message || 'تعذر تحميل لوحة التحكم'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const stats = overview?.stats || {};
  const copy = dashboardCopy(isHe);
  const topSubject = localizeAdminSubject(stats.topSubject, isHe);
  const testsByDay = overview?.charts?.testsByDay || [];
  const studentsBySubject = localizeChartSubjects(overview?.charts?.studentsBySubject || [], isHe);
  const averageBySubject = localizeChartSubjects(overview?.charts?.averageBySubject || [], isHe);
  const gamesUsage = localizeGameLabels(overview?.charts?.gamesUsage || [], isHe);

  return (
    <AdminShell
      activeKey="dashboard"
      title={copy.title}
      subtitle={copy.subtitle}
      navigateTo={navigateTo}
    >
      {loading ? (
        <LoadingState />
      ) : error && !overview ? (
        <ErrorState message={error} />
      ) : (
        <>
          <View style={[styles.statsGrid, isMobile && styles.statsGridMobile, isTablet && styles.tabletGrid]}>
            <StatCard icon="users" label={copy.totalStudents} value={stats.students ?? 0} tone={adminColors.primary2} />
            <StatCard icon="building" label={copy.schools} value={stats.schools ?? 0} hint={copy.schoolsHint} tone="#2563EB" />
            <StatCard icon="id-badge" label={copy.principals} value={stats.principals ?? 0} tone={adminColors.success} />
            <StatCard icon="question-circle" label={copy.questions} value={stats.questions ?? 0} tone={adminColors.warning} />
            <StatCard icon="check-circle" label={copy.completed} value={stats.completedSessions ?? 0} tone="#0F766E" />
            <StatCard icon="pause-circle" label={copy.incomplete} value={stats.incompleteSessions ?? 0} tone={adminColors.danger} />
            <StatCard icon="line-chart" label={copy.averageScore} value={stats.averageScore || '-'} tone="#7C3AED" />
            <StatCard icon="star" label={copy.topSubject} value={topSubject || '-'} tone="#0891B2" />
          </View>

          <View style={[styles.chartGrid, isMobile && styles.mobileGrid, isTablet && styles.tabletGrid]}>
            <ChartCard title={copy.testsLast7Days} data={testsByDay} tone={adminColors.primary2} />
            <ChartCard title={copy.studentsBySubject} data={studentsBySubject} tone={adminColors.success} />
            <ChartCard title={copy.averageBySubject} data={averageBySubject} tone="#7C3AED" />
            <ChartCard title={copy.gamesUsage} data={gamesUsage} tone={adminColors.warning} />
          </View>

          <View style={[styles.twoCols, isMobile && styles.mobileGrid]}>
            <AdminCard title={copy.latestActivities} subtitle={copy.latestActivitiesSub}>
              <View style={styles.list}>
                {(overview?.activities || []).map((item, index) => (
                  <View key={`${item.title}-${index}`} style={styles.activity}>
                    <View style={styles.activityIcon}>
                      <FontAwesome name="circle" size={8} color={adminColors.primary2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle}>{tr(item.title)}</Text>
                      <Text style={styles.activitySub}>{tr(item.subtitle)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </AdminCard>

            <AdminCard title={copy.systemAlerts} subtitle={copy.systemAlertsSub}>
              <View style={styles.list}>
                {(overview?.alerts || []).map((alert) => (
                  <View key={alert} style={styles.alertRow}>
                    <FontAwesome name="exclamation-triangle" size={15} color={adminColors.warning} />
                    <Text style={styles.alertText}>{tr(alert)}</Text>
                  </View>
                ))}
                {!overview?.alerts?.length && (
                  <View style={styles.alertRow}>
                    <FontAwesome name="check-circle" size={15} color={adminColors.success} />
                    <Text style={styles.alertText}>{copy.noAlerts}</Text>
                  </View>
                )}
              </View>
            </AdminCard>
          </View>
        </>
      )}
    </AdminShell>
  );
}

function dashboardCopy(isHe) {
  if (isHe) {
    return {
      title: 'לוח בקרה',
      subtitle: 'סקירה כללית של ביצועי המערכת והתלמידים',
      totalStudents: 'סה"כ תלמידים',
      schools: 'מספר בתי ספר',
      schoolsHint: 'נבדק מול טבלת בתי הספר',
      principals: 'מנהלי בתי ספר',
      questions: 'שאלות במאגר',
      completed: 'מבחנים שהושלמו',
      incomplete: 'מבחנים שלא הושלמו',
      averageScore: 'ממוצע ביצועי התלמידים',
      topSubject: 'המקצוע עם הכי הרבה עניין',
      testsLast7Days: 'מספר מבחנים ב-7 הימים האחרונים',
      studentsBySubject: 'התפלגות תלמידים לפי מקצועות או יכולות',
      averageBySubject: 'ממוצע תוצאות לפי מקצוע',
      gamesUsage: 'המשחקים הנפוצים ביותר',
      latestActivities: 'פעילויות אחרונות',
      latestActivitiesSub: 'הפעולות האחרונות שבוצעו במערכת',
      systemAlerts: 'התראות מערכת',
      systemAlertsSub: 'נושאים הדורשים מעקב מנהלי',
      noAlerts: 'אין כרגע התראות קריטיות.',
    };
  }
  return {
    title: 'لوحة التحكم',
    subtitle: 'نظرة عامة على أداء النظام والطلاب',
    totalStudents: 'عدد الطلاب الكلي',
    schools: 'عدد المدارس',
    schoolsHint: 'تم التحقق من جدول المدارس',
    principals: 'مديرو المدارس',
    questions: 'أسئلة بنك الأسئلة',
    completed: 'اختبارات مكتملة',
    incomplete: 'اختبارات غير مكتملة',
    averageScore: 'متوسط أداء الطلاب',
    topSubject: 'أكثر مادة عليها اهتمام',
    testsLast7Days: 'عدد الاختبارات خلال آخر 7 أيام',
    studentsBySubject: 'توزيع الطلاب حسب المواد أو القدرات',
    averageBySubject: 'متوسط النتائج حسب المادة',
    gamesUsage: 'أكثر الألعاب استخدامًا',
    latestActivities: 'آخر النشاطات',
    latestActivitiesSub: 'آخر عمليات تمت في النظام',
    systemAlerts: 'تنبيهات النظام',
    systemAlertsSub: 'مشاكل تحتاج متابعة إدارية',
    noAlerts: 'لا توجد تنبيهات حرجة الآن.',
  };
}

const SUBJECT_AR_TO_HE = [
  ['فيزياء', 'פיזיקה'],
  ['رياضيات', 'מתמטיקה'],
  ['أحياء', 'ביולוגיה'],
  ['كيمياء', 'כימיה'],
  ['لغة عربية', 'ערבית'],
  ['لغة عبرية', 'עברית'],
  ['علوم الحاسوب', 'מדעי המחשב'],
  ['أدب', 'ספרות'],
  ['الاستدلال اللفظي', 'הסקה מילולית'],
  ['الاستدلال الكمي', 'הסקה כמותית'],
  ['تفسير المعطيات', 'פירוש נתונים'],
  ['التفكير المنطقي والمجرد', 'חשיבה לוגית ומופשטת'],
  ['غير محدد', 'לא מוגדר'],
  ['مادة', 'מקצוע'],
];

const SUBJECT_CODE_HE = {
  physics: 'פיזיקה',
  math: 'מתמטיקה',
  biology: 'ביולוגיה',
  chemistry: 'כימיה',
  arabic: 'ערבית',
  hebrew: 'עברית',
  computer_science: 'מדעי המחשב',
  literature: 'ספרות',
  VR: 'הסקה מילולית',
  QR: 'הסקה כמותית',
  DI: 'פירוש נתונים',
  LR: 'חשיבה לוגית ומופשטת',
};

function localizeAdminSubject(value, isHe) {
  if (!isHe) return value;
  const text = String(value || '');
  if (SUBJECT_CODE_HE[text]) return SUBJECT_CODE_HE[text];
  const match = SUBJECT_AR_TO_HE.find(([ar]) => text.includes(ar));
  return match ? match[1] : text;
}

function localizeChartSubjects(data = [], isHe) {
  if (!isHe) return data;
  return data.map((item) => ({
    ...item,
    label: localizeAdminSubject(item.label, isHe),
  }));
}

function localizeGameLabels(data = [], isHe) {
  if (!isHe) return data;
  const map = {
    physics_bridge_game: 'מהנדס גשרים',
    physics_lab: 'מעבדת פיזיקה',
    doctor_soroka: 'רופא בסורוקה',
    arabic_poet_puzzle: 'אוצרות המילים',
    'Bridge Engineer': 'מהנדס גשרים',
    'Physics Lab': 'מעבדת פיזיקה',
    'Doctor at Soroka': 'רופא בסורוקה',
    'Word Treasures': 'אוצרות המילים',
  };
  return data.map((item) => ({
    ...item,
    label: map[item.label] || item.label,
  }));
}

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  statsGridMobile: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 10 },
  chartGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 14 },
  twoCols: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 14 },
  tabletGrid: { gap: 12 },
  mobileGrid: { flexDirection: 'column', flexWrap: 'nowrap' },
  list: { gap: 10 },
  activity: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: adminColors.bg },
  activityIcon: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.softBlue },
  activityTitle: { color: adminColors.text, fontWeight: '900', textAlign: 'right' },
  activitySub: { marginTop: 2, color: adminColors.muted, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  alertRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 11, borderRadius: 14, backgroundColor: adminColors.softOrange },
  alertText: { flex: 1, color: adminColors.text, fontWeight: '800', textAlign: 'right' },
});
