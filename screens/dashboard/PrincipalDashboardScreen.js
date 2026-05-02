import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getPrincipalDashboardData } from '../../services/principalExperienceService';

const colors = {
  bg: '#F6F8FF',
  primary: '#1E4FBF',
  dark: '#102A68',
  secondary: '#546A99',
  border: '#E5ECFF',
  success: '#2ECC71',
  warning: '#F59E0B',
  danger: '#E74C3C',
};

const actions = [
  { title: 'طلاب المدرسة', description: 'عرض الطلاب المرتبطين بمدرستك', icon: 'users', route: 'principalStudents' },
  { title: 'تحليلات الصفوف', description: 'مقارنة أداء الصفوف والمواد', icon: 'bar-chart', route: 'principalClassAnalytics' },
  { title: 'تتبع الاختبارات', description: 'معرفة من بدأ ومن أكمل الاختبار', icon: 'tasks', route: 'principalTestTracking' },
  { title: 'نقاط القوة والضعف', description: 'تحليل المجالات القوية والضعيفة', icon: 'line-chart', route: 'principalStrengthsWeaknesses' },
  { title: 'تقارير الطلاب', description: 'عرض وتحميل تقارير الطلاب', icon: 'file-text-o', route: 'principalReports' },
  { title: 'إعدادات الحساب', description: 'تعديل الاسم والهاتف واللغة', icon: 'cog', route: 'principalProfileSettings' },
];

export default function PrincipalDashboardScreen({ navigateTo }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getPrincipalDashboardData());
    } catch (err) {
      setError(err?.message || 'تعذر تحميل بيانات المدرسة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.centerText}>جارٍ تحميل بيانات المدرسة...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>تعذر تحميل البيانات</Text>
        <Text style={styles.centerText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const principal = data.principal;
  const dashboard = data.dashboard;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={['#1B3A8A', '#1E4FBF']} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.avatar}>
              <FontAwesome name="university" size={24} color="#fff" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>لوحة مدير المدرسة</Text>
              <Text style={styles.headerGreeting}>أهلًا، {principal.full_name || 'مدير المدرسة'}</Text>
              <Text style={styles.headerSchool}>{principal.school_name || 'مدرستك'}</Text>
            </View>
          </View>
          <View style={styles.chipsRow}>
            <HeaderChip label={`طلاب: ${dashboard.totalStudents}`} />
            <HeaderChip label={`اختبارات: ${dashboard.completedTests}`} />
            <HeaderChip label={`صفوف: ${dashboard.classesCount}`} />
            <HeaderChip label="اليوم" />
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <StatCard icon="users" number={dashboard.totalStudents} label="إجمالي الطلاب" color={colors.primary} />
          <StatCard icon="check-circle" number={dashboard.completedTests} label="اختبارات مكتملة" color={colors.success} />
          <StatCard icon="tachometer" number={`${dashboard.averageScore}%`} label="متوسط المدرسة" color="#7C3AED" />
          <StatCard icon="warning" number={dashboard.atRiskStudents} label="طلاب يحتاجون دعم" color={colors.danger} />
        </View>

        <SectionTitle title="إدارة المدرسة" />
        <View style={styles.actionsGrid}>
          {actions.map((action) => (
            <TouchableOpacity key={action.route} style={styles.actionCard} onPress={() => navigateTo?.(action.route)}>
              <View style={styles.actionIcon}>
                <FontAwesome name={action.icon} size={17} color={colors.primary} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDescription}>{action.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionTitle title="آخر النشاطات" />
        <View style={styles.card}>
          {dashboard.recentActivity.length ? (
            dashboard.recentActivity.map((item) => <ActivityRow key={item.id} item={item} />)
          ) : (
            <Text style={styles.emptyText}>لا توجد نشاطات حديثة حتى الآن</Text>
          )}
        </View>

        <SectionTitle title="نظرة سريعة على المدرسة" />
        <View style={styles.insightGrid}>
          <Insight label="أكثر مجال اهتمامًا" value={dashboard.topInterest} />
          <Insight label="أضعف مادة/مجال" value={dashboard.weakestArea} />
          <Insight label="الصف الأكثر تفاعلًا" value={dashboard.mostActiveClass} />
          <Insight label="نسبة إكمال الاختبارات" value={`${dashboard.completionRate}%`} />
        </View>
      </ScrollView>
      <PrincipalTabs active="home" navigateTo={navigateTo} />
    </View>
  );
}

function HeaderChip({ label }) {
  return (
    <View style={styles.headerChip}>
      <Text style={styles.headerChipText}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function StatCard({ icon, number, label, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <FontAwesome name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statNumber}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActivityRow({ item }) {
  const tone = item.tone === 'success' ? colors.success : item.tone === 'warning' ? colors.warning : colors.primary;
  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityDot, { backgroundColor: tone }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityMeta}>{item.meta ? new Date(item.meta).toLocaleDateString('ar') : 'اليوم'}</Text>
      </View>
    </View>
  );
}

function Insight({ label, value }) {
  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightValue}>{value}</Text>
    </View>
  );
}

export function PrincipalTabs({ active, navigateTo }) {
  const tabs = [
    { key: 'home', label: 'الرئيسية', icon: 'home', route: 'principalDashboard' },
    { key: 'students', label: 'الطلاب', icon: 'users', route: 'principalStudents' },
    { key: 'analytics', label: 'التحليلات', icon: 'bar-chart', route: 'principalClassAnalytics' },
    { key: 'reports', label: 'التقارير', icon: 'file-text-o', route: 'principalReports' },
    { key: 'account', label: 'الحساب', icon: 'user-circle', route: 'principalProfileSettings' },
  ];

  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => (
        <TouchableOpacity key={tab.key} style={styles.tab} onPress={() => navigateTo?.(tab.route)}>
          <FontAwesome name={tab.icon} size={16} color={active === tab.key ? colors.primary : colors.secondary} />
          <Text style={[styles.tabText, active === tab.key && styles.tabTextActive]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 92 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  centerText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center' },
  errorTitle: { color: colors.dark, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12 },
  retryText: { color: '#fff', fontWeight: '900' },
  header: { borderRadius: 28, padding: 20, overflow: 'hidden' },
  headerTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 13 },
  avatar: { width: 58, height: 58, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: '#DDE7FF', fontSize: 13, fontWeight: '800', textAlign: 'right' },
  headerGreeting: { marginTop: 4, color: '#fff', fontSize: 23, fontWeight: '900', textAlign: 'right' },
  headerSchool: { marginTop: 4, color: '#EAF0FF', fontWeight: '800', textAlign: 'right' },
  chipsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  headerChip: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  headerChipText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statCard: { width: '48.5%', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14, alignItems: 'flex-end' },
  statIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statNumber: { marginTop: 12, color: colors.dark, fontSize: 24, fontWeight: '900', textAlign: 'right' },
  statLabel: { marginTop: 3, color: colors.secondary, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  sectionTitle: { marginTop: 22, marginBottom: 10, color: colors.dark, fontSize: 18, fontWeight: '900', textAlign: 'right' },
  actionsGrid: { gap: 10 },
  actionCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 15, alignItems: 'flex-end' },
  actionIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center' },
  actionTitle: { marginTop: 10, color: colors.dark, fontSize: 15, fontWeight: '900', textAlign: 'right' },
  actionDescription: { marginTop: 4, color: colors.secondary, fontSize: 12, fontWeight: '700', lineHeight: 19, textAlign: 'right' },
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 15 },
  activityRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F4FF' },
  activityDot: { width: 10, height: 10, borderRadius: 5 },
  activityTitle: { color: colors.dark, fontWeight: '900', textAlign: 'right' },
  activityMeta: { marginTop: 3, color: colors.secondary, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  emptyText: { color: colors.secondary, fontWeight: '800', textAlign: 'center', paddingVertical: 18 },
  insightGrid: { gap: 10 },
  insightCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 15, alignItems: 'flex-end' },
  insightLabel: { color: colors.secondary, fontSize: 12, fontWeight: '800', textAlign: 'right' },
  insightValue: { marginTop: 6, color: colors.dark, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  tabs: { position: 'absolute', left: 12, right: 12, bottom: 12, minHeight: 64, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  tabText: { color: colors.secondary, fontSize: 10, fontWeight: '900' },
  tabTextActive: { color: colors.primary },
});
