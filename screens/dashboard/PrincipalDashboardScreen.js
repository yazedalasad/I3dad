import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

/**
 * PrincipalDashboardScreen (UI like the image) - REAL DATA
 *
 * All numbers now come from your schema:
 * - Total Students: public.students by principal.school_id
 * - Active Sessions Today: public.test_sessions started today (school students)
 * - Subjects Covered (This Month): distinct subjects answered this month
 * - Avg Accuracy (This Month): student_responses correctness for completed sessions this month
 * - Focus Lost Today: sum(test_sessions.focus_lost_count) for sessions started today
 *
 * Charts:
 * - Junior vs Senior: avg student_abilities.ability_score for grades 9-10 vs 11-12
 * - This Month vs Last Month: accuracy %
 * - Interests distribution: top 4 subjects by avg student_interests.interest_score
 * - Participation: counts by test_sessions.status (completed / in_progress / abandoned)
 *
 * Notes:
 * - If your RLS blocks some reads, you must add policies or use RPC/views.
 * - If there are no rows yet, UI shows zeros (still looks good).
 */

export default function PrincipalDashboardScreen({ navigateTo }) {
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [principal, setPrincipal] = useState(null);

  // REAL KPIs
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [subjectsCovered, setSubjectsCovered] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [focusLostToday, setFocusLostToday] = useState(0);

  // REAL performance
  const [juniorPerf, setJuniorPerf] = useState(0);
  const [seniorPerf, setSeniorPerf] = useState(0);
  const [thisMonth, setThisMonth] = useState(0);
  const [lastMonth, setLastMonth] = useState(0);

  // REAL participation
  const [participation, setParticipation] = useState({
    completed: 0,
    inProgress: 0,
    notStarted: 0, // mapped from "abandoned"
  });

  // REAL interests (top 4)
  const [interests, setInterests] = useState([
    { label: '—', value: 0, dot: '#1D9BF0' },
    { label: '—', value: 0, dot: '#F59E0B' },
    { label: '—', value: 0, dot: '#EF4444' },
    { label: '—', value: 0, dot: '#7C3AED' },
  ]);

  useEffect(() => {
    let mounted = true;

    const startOfTodayISO = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    };

    const startOfMonthISO = (offsetMonths = 0) => {
      const d = new Date();
      d.setMonth(d.getMonth() + offsetMonths, 1);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    };

    const pct = (num) => Math.max(0, Math.min(100, Math.round(Number(num || 0))));

    const loadAvgAbility = async (studentIds) => {
      if (!studentIds?.length) return 0;

      const res = await supabase
        .from('student_abilities')
        .select('ability_score')
        .in('student_id', studentIds);

      if (res.error) return 0;
      const arr = res.data || [];
      if (!arr.length) return 0;

      const avg = arr.reduce((a, x) => a + Number(x.ability_score || 0), 0) / arr.length;
      return avg;
    };

    const calcAccuracy = async (sessionIds) => {
      if (!sessionIds?.length) return 0;

      const res = await supabase
        .from('student_responses')
        .select('is_correct')
        .in('session_id', sessionIds);

      if (res.error) return 0;

      const rows = res.data || [];
      if (!rows.length) return 0;

      const correct = rows.reduce((a, r) => a + (r.is_correct ? 1 : 0), 0);
      return (correct / rows.length) * 100;
    };

    const load = async () => {
      try {
        if (!user?.id) {
          navigateTo('login');
          return;
        }

        setLoading(true);

        // 1) Principal row
        const { data, error } = await supabase
          .from('principals')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.log('load principal error:', error.message);
          Alert.alert('Error', 'Failed to load principal data.');
          return;
        }

        if (!data) {
          Alert.alert('Access denied', 'Your account is not registered as a principal.');
          navigateTo('home');
          return;
        }

        if (!mounted) return;
        setPrincipal(data);

        const schoolId = data.school_id;
        if (!schoolId) {
          // show zeros if school_id missing
          setTotalStudents(0);
          setActiveToday(0);
          setSubjectsCovered(0);
          setAttendanceRate(0);
          setFocusLostToday(0);
          setJuniorPerf(0);
          setSeniorPerf(0);
          setThisMonth(0);
          setLastMonth(0);
          setParticipation({ completed: 0, inProgress: 0, notStarted: 0 });
          return;
        }

        // 2) Students (also gives us grade + ids)
        const studentsRes = await supabase
          .from('students')
          .select('id, grade', { count: 'exact' })
          .eq('school_id', schoolId);

        if (!studentsRes.error && typeof studentsRes.count === 'number') {
          if (mounted) setTotalStudents(studentsRes.count);
        }

        const students = studentsRes.data || [];
        const studentIds = students.map((s) => s.id);
        if (!studentIds.length) return;

        // 3) Participation (all time, for this school)
        const sessionsRes = await supabase
          .from('test_sessions')
          .select('status')
          .in('student_id', studentIds);

        if (!sessionsRes.error) {
          const stats = { completed: 0, inProgress: 0, notStarted: 0 };
          for (const s of sessionsRes.data || []) {
            if (s.status === 'completed') stats.completed += 1;
            else if (s.status === 'in_progress') stats.inProgress += 1;
            else if (s.status === 'abandoned') stats.notStarted += 1;
          }
          if (mounted) setParticipation(stats);
        }

        const todayISO = startOfTodayISO();

        // 4) Active sessions today
        const activeTodayRes = await supabase
          .from('test_sessions')
          .select('id', { count: 'exact', head: true })
          .in('student_id', studentIds)
          .gte('started_at', todayISO);

        if (!activeTodayRes.error && typeof activeTodayRes.count === 'number') {
          if (mounted) setActiveToday(activeTodayRes.count);
        }

        // 5) Focus lost today (sum focus_lost_count)
        const focusRes = await supabase
          .from('test_sessions')
          .select('focus_lost_count')
          .in('student_id', studentIds)
          .gte('started_at', todayISO);

        if (!focusRes.error) {
          const sum = (focusRes.data || []).reduce(
            (acc, r) => acc + Number(r.focus_lost_count || 0),
            0
          );
          if (mounted) setFocusLostToday(sum);
        }

        // 6) Junior vs Senior performance from student_abilities
        const juniorStudentIds = students.filter((s) => Number(s.grade) <= 10).map((s) => s.id);
        const seniorStudentIds = students.filter((s) => Number(s.grade) >= 11).map((s) => s.id);

        const juniorAvg = await loadAvgAbility(juniorStudentIds);
        const seniorAvg = await loadAvgAbility(seniorStudentIds);

        if (mounted) {
          setJuniorPerf(pct(juniorAvg));
          setSeniorPerf(pct(seniorAvg));
        }

        // 7) This Month vs Last Month accuracy
        const monthStart = startOfMonthISO(0);
        const lastMonthStart = startOfMonthISO(-1);

        const sessionsThisMonth = await supabase
          .from('test_sessions')
          .select('id')
          .in('student_id', studentIds)
          .eq('status', 'completed')
          .gte('completed_at', monthStart);

        const sessionsLastMonth = await supabase
          .from('test_sessions')
          .select('id')
          .in('student_id', studentIds)
          .eq('status', 'completed')
          .gte('completed_at', lastMonthStart)
          .lt('completed_at', monthStart);

        const thisMonthIds = (sessionsThisMonth.data || []).map((x) => x.id);
        const lastMonthIds = (sessionsLastMonth.data || []).map((x) => x.id);

        const accThis = await calcAccuracy(thisMonthIds);
        const accLast = await calcAccuracy(lastMonthIds);

        if (mounted) {
          setThisMonth(pct(accThis));
          setLastMonth(pct(accLast));
          setAttendanceRate(pct(accThis)); // tile uses "Avg Accuracy (This Month)"
        }

        // 8) Subjects covered this month (distinct subjects via responses -> questions)
        let covered = 0;
        if (thisMonthIds.length) {
          const resp = await supabase
            .from('student_responses')
            .select('question_id')
            .in('session_id', thisMonthIds);

          if (!resp.error) {
            const qIds = Array.from(new Set((resp.data || []).map((r) => r.question_id))).slice(
              0,
              500
            );

            if (qIds.length) {
              const qRes = await supabase.from('questions').select('id, subject_id').in('id', qIds);

              if (!qRes.error) {
                const subjectSet = new Set((qRes.data || []).map((q) => q.subject_id));
                covered = subjectSet.size;
              }
            }
          }
        }
        if (mounted) setSubjectsCovered(covered);

        // 9) Interests distribution: top 4 subjects by avg interest_score
        const interestsRes = await supabase
          .from('student_interests')
          .select('subject_id, interest_score')
          .in('student_id', studentIds);

        if (!interestsRes.error) {
          const map = new Map(); // subject_id -> {sum,count}
          for (const row of interestsRes.data || []) {
            const sid = row.subject_id;
            const v = Number(row.interest_score || 0);
            const cur = map.get(sid) || { sum: 0, count: 0 };
            cur.sum += v;
            cur.count += 1;
            map.set(sid, cur);
          }

          const ranked = Array.from(map.entries())
            .map(([subject_id, v]) => ({ subject_id, avg: v.count ? v.sum / v.count : 0 }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 4);

          const subjectIds = ranked.map((x) => x.subject_id);

          let nameById = new Map();
          if (subjectIds.length) {
            const subRes = await supabase.from('subjects').select('id, name_en').in('id', subjectIds);
            if (!subRes.error) {
              nameById = new Map((subRes.data || []).map((s) => [s.id, s.name_en]));
            }
          }

          const dots = ['#1D9BF0', '#F59E0B', '#EF4444', '#7C3AED'];
          const finalInterests =
            ranked.length > 0
              ? ranked.map((x, idx) => ({
                  label: nameById.get(x.subject_id) || 'Subject',
                  value: Math.round(x.avg),
                  dot: dots[idx % dots.length],
                }))
              : [
                  { label: '—', value: 0, dot: '#1D9BF0' },
                  { label: '—', value: 0, dot: '#F59E0B' },
                  { label: '—', value: 0, dot: '#EF4444' },
                  { label: '—', value: 0, dot: '#7C3AED' },
                ];

          if (mounted) setInterests(finalInterests);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    navigateTo('home');
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading dashboard…</Text>
      </View>
    );
  }

  const city = principal?.city_he || principal?.city_ar || '—';
  const schoolName = principal?.school_name || '—';
  const fullName = principal?.full_name || '—';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Top header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Principal Dashboard Overview</Text>
          <Text style={styles.headerSub}>Empowering Educators with Aggregated Insights</Text>

          <View style={styles.headerMetaRow}>
            <View style={styles.metaPill}>
              <FontAwesome name="user" size={12} color="#0F172A" />
              <Text style={styles.metaText} numberOfLines={1}>
                {fullName}
              </Text>
            </View>

            <View style={styles.metaPill}>
              <FontAwesome name="map-marker" size={12} color="#0F172A" />
              <Text style={styles.metaText} numberOfLines={1}>
                {city}
              </Text>
            </View>

            <View style={styles.metaPill}>
              <FontAwesome name="university" size={12} color="#0F172A" />
              <Text style={styles.metaText} numberOfLines={1}>
                {schoolName}
              </Text>
            </View>
          </View>
        </View>

        {/* KPI tiles */}
        <View style={styles.kpiGrid}>
          <KpiTile
            colors={['#2E6CE6', '#1D4ED8']}
            icon="users"
            value={formatNumber(totalStudents || 0)}
            label="Total Students"
          />
          <KpiTile
            colors={['#16A34A', '#22C55E']}
            icon="bolt"
            value={formatNumber(activeToday)}
            label="Active Sessions Today"
          />
          <KpiTile
            colors={['#F59E0B', '#F97316']}
            icon="book"
            value={formatNumber(subjectsCovered)}
            label="Subjects Covered (This Month)"
          />
          <KpiTile
            colors={['#EF4444', '#F97316']}
            icon="line-chart"
            value={`${attendanceRate}%`}
            label="Avg Accuracy (This Month)"
            rightSmall={`${focusLostToday} Focus Lost Today`}
          />
        </View>

        {/* Main charts row */}
        <View style={styles.row2}>
          {/* Performance */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Average Student Performance</Text>
            <View style={styles.divider} />

            <View style={styles.barWrap}>
              <Bar label="Junior High" percent={juniorPerf} color="#2563EB" width={120} />
              <Bar label="Senior High" percent={seniorPerf} color="#16A34A" width={120} />
            </View>

            <View style={styles.smallStatsRow}>
              <Text style={styles.smallStat}>
                This Month: <Text style={styles.smallStatBold}>{thisMonth}%</Text>{' '}
                <Text style={styles.upArrow}>↑</Text>
              </Text>
              <Text style={styles.smallStat}>
                Last Month: <Text style={styles.smallStatBold}>{lastMonth}%</Text>{' '}
                <Text style={styles.upArrow}>↑</Text>
              </Text>
            </View>
          </View>

          {/* Interests */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Career Interests Distribution</Text>
            <View style={styles.divider} />

            <View style={styles.interestsList}>
              {interests.map((it) => (
                <View key={it.label} style={styles.interestRow}>
                  <View style={[styles.dot, { backgroundColor: it.dot }]} />
                  <Text style={styles.interestLabel}>{it.label}</Text>
                  <Text style={styles.interestValue}>{it.value}%</Text>
                </View>
              ))}
            </View>

            <View style={styles.ringBox}>
              <View style={styles.ringOuter}>
                <View style={styles.ringInner} />
              </View>
              <Text style={styles.ringText}>Interests</Text>
            </View>
          </View>
        </View>

        {/* Bottom row: participation + insights + export */}
        <View style={styles.panel}>
          <View style={styles.bottomGrid}>
            {/* Participation */}
            <View style={styles.bottomCol}>
              <Text style={styles.panelTitle}>Test Participation</Text>
              <View style={styles.divider} />

              <ParticipationRow
                icon="check-circle"
                label="Completed"
                percent={participation.completed}
                color="#16A34A"
              />
              <ParticipationRow
                icon="hourglass-half"
                label="In Progress"
                percent={participation.inProgress}
                color="#F59E0B"
              />
              <ParticipationRow
                icon="times-circle"
                label="Abandoned"
                percent={participation.notStarted}
                color="#EF4444"
              />
            </View>

            {/* Insights */}
            <View style={styles.bottomCol}>
              <Text style={styles.panelTitle}>Insights & Recommendations</Text>
              <View style={styles.divider} />

              <Bullet text="High STEM Potential" />
              <Bullet text="Focus on Literacy Skills" />
              <Bullet text="Career Guidance Events" />

              <TouchableOpacity
                style={styles.fakeLink}
                onPress={() => Alert.alert('Info', 'Later: open detailed insights screen')}
              >
                <Text style={styles.fakeLinkText}>View detailed insights →</Text>
              </TouchableOpacity>
            </View>

            {/* Export */}
            <View style={styles.bottomCol}>
              <Text style={styles.panelTitle}>Export Reports</Text>
              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.exportBtn}
                onPress={() => Alert.alert('Export', 'Later: generate school report PDF')}
              >
                <FontAwesome name="file-text" size={16} color="#fff" />
                <Text style={styles.exportText}>Download School Report</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportBtn}
                onPress={() => Alert.alert('Export', 'Later: generate class reports PDF')}
              >
                <FontAwesome name="files-o" size={16} color="#fff" />
                <Text style={styles.exportText}>Download Class Reports</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>

          <ActionBtn
            icon="users"
            text="Manage Students"
            onPress={() => Alert.alert('Next step', 'Create Principal Students screen')}
          />
          <ActionBtn icon="calendar" text="Activities" onPress={() => navigateTo('activities')} />
          <ActionBtn
            icon="bar-chart"
            text="Reports"
            onPress={() => Alert.alert('Next step', 'Create Principal Reports screen')}
          />

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <FontAwesome name="sign-out" size={18} color="#DC2626" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>Logged in as: {user?.email || '—'}</Text>
      </ScrollView>
    </View>
  );
}

/* -------------------- Small components -------------------- */

function KpiTile({ colors, icon, value, label, rightSmall }) {
  return (
    <LinearGradient colors={colors} style={styles.kpiTile}>
      <View style={styles.kpiTopRow}>
        <View style={styles.kpiIcon}>
          <FontAwesome name={icon} size={18} color="#fff" />
        </View>
        {!!rightSmall && <Text style={styles.kpiSmall}>{rightSmall}</Text>}
      </View>

      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </LinearGradient>
  );
}

function Bar({ label, percent, color, width = 120 }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const h = (clamped / 100) * 140;

  return (
    <View style={[styles.barItem, { width }]}>
      <Text style={styles.barPercent}>{clamped}%</Text>
      <View style={styles.barBase}>
        <View style={[styles.barFill, { height: h, backgroundColor: color }]} />
      </View>
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

function ParticipationRow({ icon, label, percent, color }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.partRow}>
      <FontAwesome name={icon} size={16} color={color} />
      <Text style={styles.partLabel}>{label}</Text>
      <View style={styles.partTrack}>
        <View style={[styles.partFill, { width: `${clamped}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.partVal}>{clamped}%</Text>
    </View>
  );
}

function Bullet({ text }) {
  return (
    <View style={styles.bulletRow}>
      <FontAwesome name="check" size={14} color="#16A34A" />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function ActionBtn({ icon, text, onPress }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View style={styles.actionLeft}>
        <View style={styles.actionIcon}>
          <FontAwesome name={icon} size={16} color="#1D4ED8" />
        </View>
        <Text style={styles.actionText}>{text}</Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color="#64748B" />
    </TouchableOpacity>
  );
}

function formatNumber(n) {
  try {
    return new Intl.NumberFormat().format(Number(n || 0));
  } catch {
    return String(n || 0);
  }
}

/* -------------------- Styles -------------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F6FB' },
  content: { padding: 16, paddingBottom: 26 },

  loadingWrap: {
    flex: 1,
    backgroundColor: '#F3F6FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: 10, color: '#334155', fontSize: 14, fontWeight: '700' },

  header: {
    backgroundColor: '#EAF1FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  headerSub: {
    marginTop: 6,
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '700',
  },
  headerMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    maxWidth: '100%',
  },
  metaText: { color: '#0F172A', fontSize: 12, fontWeight: '800' },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kpiTile: {
    width: '48.5%',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiSmall: { color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '900' },
  kpiValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  kpiLabel: { marginTop: 2, color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '800' },

  row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  panel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  panelTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  divider: {
    marginTop: 10,
    marginBottom: 12,
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },

  barWrap: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    gap: 14,
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  barItem: { alignItems: 'center' },
  barPercent: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  barBase: {
    width: 56,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.08)',
  },
  barFill: { width: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  barLabel: { marginTop: 10, fontSize: 12, color: '#334155', fontWeight: '800' },

  smallStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  smallStat: { fontSize: 12, color: '#334155', fontWeight: '700' },
  smallStatBold: { color: '#0F172A', fontWeight: '900' },
  upArrow: { color: '#16A34A', fontWeight: '900' },

  interestsList: { gap: 10, marginBottom: 14 },
  interestRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 999, marginRight: 10 },
  interestLabel: { flex: 1, color: '#334155', fontWeight: '800', fontSize: 12 },
  interestValue: { color: '#0F172A', fontWeight: '900', fontSize: 12 },

  ringBox: { alignItems: 'center', marginTop: 2 },
  ringOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 12,
    borderColor: 'rgba(37, 99, 235, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  ringText: { marginTop: 8, color: '#64748B', fontSize: 12, fontWeight: '800' },

  bottomGrid: { flexDirection: 'row', gap: 12 },
  bottomCol: { flex: 1 },

  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  partLabel: { width: 82, color: '#334155', fontWeight: '800', fontSize: 12 },
  partTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  partFill: { height: '100%', borderRadius: 999 },
  partVal: { width: 42, textAlign: 'right', color: '#0F172A', fontWeight: '900', fontSize: 12 },

  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  bulletText: { color: '#334155', fontSize: 12, fontWeight: '800', flex: 1 },

  fakeLink: { marginTop: 4, alignSelf: 'flex-start' },
  fakeLinkText: { color: '#2563EB', fontWeight: '900', fontSize: 12 },

  exportBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  exportText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  actionsCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  actionsTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginBottom: 10 },

  actionBtn: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    marginBottom: 10,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#0F172A', fontWeight: '900', fontSize: 13 },

  logoutBtn: {
    marginTop: 6,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: 'rgba(220, 38, 38, 0.35)',
    backgroundColor: 'rgba(220, 38, 38, 0.06)',
  },
  logoutText: { color: '#DC2626', fontWeight: '900' },

  footerNote: {
    marginTop: 10,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
});
