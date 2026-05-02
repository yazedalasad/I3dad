import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
import { getAdminDashboardOverview } from '../../services/adminPanelService';

export default function AdminDashboardScreen({ navigateTo }) {
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

  return (
    <AdminShell
      activeKey="dashboard"
      title="لوحة التحكم"
      subtitle="نظرة عامة على أداء النظام والطلاب"
      navigateTo={navigateTo}
    >
      {loading ? (
        <LoadingState />
      ) : error && !overview ? (
        <ErrorState message={error} />
      ) : (
        <>
          <View style={[styles.statsGrid, isMobile && styles.mobileGrid, isTablet && styles.tabletGrid]}>
            <StatCard icon="users" label="عدد الطلاب الكلي" value={stats.students ?? 0} tone={adminColors.primary2} />
            <StatCard icon="building" label="عدد المدارس" value={stats.schools ?? 0} hint="TODO: تأكيد جدول schools" tone="#2563EB" />
            <StatCard icon="id-badge" label="مديرو المدارس" value={stats.principals ?? 0} tone={adminColors.success} />
            <StatCard icon="question-circle" label="أسئلة بنك الأسئلة" value={stats.questions ?? 0} tone={adminColors.warning} />
            <StatCard icon="check-circle" label="اختبارات مكتملة" value={stats.completedSessions ?? 0} tone="#0F766E" />
            <StatCard icon="pause-circle" label="اختبارات غير مكتملة" value={stats.incompleteSessions ?? 0} tone={adminColors.danger} />
            <StatCard icon="line-chart" label="متوسط أداء الطلاب" value={stats.averageScore || '-'} tone="#7C3AED" />
            <StatCard icon="star" label="أكثر مادة عليها اهتمام" value={stats.topSubject || '-'} tone="#0891B2" />
          </View>

          <View style={[styles.chartGrid, isMobile && styles.mobileGrid, isTablet && styles.tabletGrid]}>
            <ChartCard title="عدد الاختبارات خلال آخر 7 أيام" data={overview?.charts?.testsByDay || []} tone={adminColors.primary2} />
            <ChartCard title="توزيع الطلاب حسب المواد أو القدرات" data={overview?.charts?.studentsBySubject || []} tone={adminColors.success} />
            <ChartCard title="متوسط النتائج حسب المادة" data={overview?.charts?.averageBySubject || []} tone="#7C3AED" />
            <ChartCard title="أكثر الألعاب استخدامًا" data={overview?.charts?.gamesUsage || []} tone={adminColors.warning} />
          </View>

          <View style={[styles.twoCols, isMobile && styles.mobileGrid]}>
            <AdminCard title="آخر النشاطات" subtitle="آخر عمليات تمت في النظام">
              <View style={styles.list}>
                {(overview?.activities || []).map((item, index) => (
                  <View key={`${item.title}-${index}`} style={styles.activity}>
                    <View style={styles.activityIcon}>
                      <FontAwesome name="circle" size={8} color={adminColors.primary2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle}>{item.title}</Text>
                      <Text style={styles.activitySub}>{item.subtitle}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </AdminCard>

            <AdminCard title="تنبيهات النظام" subtitle="مشاكل تحتاج متابعة إدارية">
              <View style={styles.list}>
                {(overview?.alerts || []).map((alert) => (
                  <View key={alert} style={styles.alertRow}>
                    <FontAwesome name="exclamation-triangle" size={15} color={adminColors.warning} />
                    <Text style={styles.alertText}>{alert}</Text>
                  </View>
                ))}
                {!overview?.alerts?.length && (
                  <View style={styles.alertRow}>
                    <FontAwesome name="check-circle" size={15} color={adminColors.success} />
                    <Text style={styles.alertText}>لا توجد تنبيهات حرجة الآن.</Text>
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

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
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
