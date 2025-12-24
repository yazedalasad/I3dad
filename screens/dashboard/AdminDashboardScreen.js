import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const COLORS = {
  bg: '#F3F6FB',
  text: '#0F172A',
  muted: '#64748B',
  card: '#FFFFFF',
  border: 'rgba(15, 23, 42, 0.08)',

  green1: '#22C55E',
  green2: '#16A34A',
  green3: '#0EA5A1', // teal-ish accent
  sidebarDark: '#0B6B53',
  sidebarText: 'rgba(255,255,255,0.92)',
  sidebarMuted: 'rgba(255,255,255,0.65)',

  blue: '#3B82F6',
  orange: '#F59E0B',
  pink: '#EC4899',
};

function toast(title) {
  Alert.alert(title, 'Placeholder button (coming soon).');
}

function ChipTab({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ icon, color, title, value, sub }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <FontAwesome name={icon} size={16} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {!!sub && <Text style={styles.statSub}>{sub}</Text>}
      </View>
    </View>
  );
}

function Panel({ title, rightActionText, onRightAction, children }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        {!!rightActionText && (
          <TouchableOpacity onPress={onRightAction} activeOpacity={0.9} style={styles.panelAction}>
            <Text style={styles.panelActionText}>{rightActionText}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function ActionTile({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.actionTile} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.actionIcon}>
        <FontAwesome name={icon} size={18} color={COLORS.green2} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <FontAwesome name="chevron-right" size={12} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

function TimelineItem({ dotColor, title, sub, badge }) {
  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.timelineTitle}>{title}</Text>
        {!!sub && <Text style={styles.timelineSub}>{sub}</Text>}
      </View>
      {!!badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function AdminDashboardScreen({ navigateTo }) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');

  const pages = useMemo(
    () => [
      { icon: 'users', label: 'Students', onPress: () => toast('Students') },
      { icon: 'graduation-cap', label: 'Principals', onPress: () => toast('Principals') },
      { icon: 'calendar', label: 'Activities', onPress: () => toast('Activities') },
      { icon: 'ticket', label: 'Registrations', onPress: () => toast('Registrations') },
      { icon: 'book', label: 'Subjects', onPress: () => toast('Subjects') },
      { icon: 'question-circle', label: 'Questions', onPress: () => toast('Questions') },
      { icon: 'sitemap', label: 'Degrees', onPress: () => toast('Degrees') },
      { icon: 'briefcase', label: 'Programs', onPress: () => toast('Programs') },
      { icon: 'institution', label: 'Institutions', onPress: () => toast('Institutions') },
      { icon: 'star', label: 'Success Stories', onPress: () => toast('Success Stories') },
      { icon: 'line-chart', label: 'Analytics', onPress: () => toast('Analytics') },
      { icon: 'cog', label: 'Settings', onPress: () => toast('Settings') },
    ],
    []
  );

  const handleLogout = async () => {
    await signOut();
    navigateTo('home');
  };

  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.root}>
      {/* LEFT SIDEBAR (desktop/web style). On mobile, it becomes a top mini bar */}
      <View style={[styles.sidebar, !isWeb && styles.sidebarMobile]}>
        <LinearGradient
          colors={[COLORS.green3, COLORS.green2]}
          style={styles.sidebarGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <FontAwesome name="shield" size={18} color="#fff" />
            </View>
            <Text style={styles.brandText}>Admin</Text>
          </View>

          <View style={styles.navSection}>
            <Text style={styles.navTitle}>MENU</Text>

            {[
              { label: 'Dashboard', icon: 'dashboard' },
              { label: 'Management', icon: 'sliders' },
              { label: 'Reports', icon: 'bar-chart' },
              { label: 'Users', icon: 'users' },
            ].map((x) => (
              <TouchableOpacity
                key={x.label}
                onPress={() => toast(x.label)}
                activeOpacity={0.9}
                style={styles.navItem}
              >
                <FontAwesome name={x.icon} size={14} color={COLORS.sidebarText} />
                <Text style={styles.navText}>{x.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity onPress={handleLogout} activeOpacity={0.9} style={styles.navItemDanger}>
            <FontAwesome name="sign-out" size={16} color="#fff" />
            <Text style={styles.navText}>Sign Out</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* MAIN CONTENT */}
      <View style={styles.main}>
        {/* TOP BAR */}
        <View style={styles.topbar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Analytics Dashboard</Text>
            <Text style={styles.pageSub}>
              This is a demo admin layout (buttons are placeholders).
            </Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => toast('Star')} activeOpacity={0.9}>
              <FontAwesome name="star" size={16} color={COLORS.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => toast('Buttons')} activeOpacity={0.9}>
              <FontAwesome name="plus" size={14} color="#fff" />
              <Text style={styles.primaryBtnText}>Buttons</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabsRow}>
          {['Overview', 'Management', 'Demographics', 'More'].map((t) => (
            <ChipTab key={t} label={t} active={activeTab === t} onPress={() => setActiveTab(t)} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* KPI / Portfolio */}
          <Panel
            title="Portfolio Performance"
            rightActionText="View All"
            onRightAction={() => toast('View All')}
          >
            <View style={styles.statsRow}>
              <StatCard
                icon="money"
                color={COLORS.orange}
                title="Cash Deposits"
                value="1.7M"
                sub="▼ 54.1% less earnings"
              />
              <StatCard
                icon="graduation-cap"
                color={COLORS.pink}
                title="Invited Students"
                value="9M"
                sub="▲ 14.1% grow rate"
              />
              <StatCard
                icon="line-chart"
                color={COLORS.green2}
                title="Capital Gains"
                value="$563"
                sub="▲ 7.35% increased"
              />
            </View>

            <TouchableOpacity
              onPress={() => toast('View Complete Report')}
              activeOpacity={0.9}
              style={styles.centerCta}
            >
              <Text style={styles.centerCtaText}>View Complete Report</Text>
            </TouchableOpacity>
          </Panel>

          {/* TWO PANELS */}
          <View style={styles.twoCols}>
            <Panel title="Technical Support" rightActionText="View" onRightAction={() => toast('Support View')}>
              <View style={styles.fakeChartBox}>
                <Text style={styles.fakeChartTitle}>NEW ACCOUNTS SINCE 2018</Text>
                <Text style={styles.fakeChartBig}>
                  78<Text style={styles.fakeChartBigSmall}>%</Text>{' '}
                  <Text style={styles.fakeChartGreen}>+14</Text>
                </Text>
                <View style={styles.fakeChart} />
                <View style={styles.fakeChartFooter}>
                  <Text style={styles.fakeChartFooterMuted}>Total Orders</Text>
                  <Text style={styles.fakeChartFooterValue}>$1896</Text>
                </View>
              </View>
            </Panel>

            <Panel title="Timeline" rightActionText="All" onRightAction={() => toast('Timeline All')}>
              <View style={{ gap: 12 }}>
                <TimelineItem dotColor={COLORS.blue} title="All Hands Meeting" sub="Today • 10:00" />
                <TimelineItem dotColor={COLORS.orange} title="Yet another one" sub="Today • 15:00" />
                <TimelineItem dotColor={COLORS.green2} title="Build the production release" badge="NEW" />
                <TimelineItem dotColor={COLORS.pink} title="Something not important" />
                <TimelineItem dotColor={COLORS.blue} title="This dot has an info state" />
              </View>

              <TouchableOpacity
                onPress={() => toast('View All Messages')}
                activeOpacity={0.9}
                style={styles.panelBottomBtn}
              >
                <Text style={styles.panelBottomBtnText}>View All Messages</Text>
              </TouchableOpacity>
            </Panel>
          </View>

          {/* QUICK ACTIONS / PAGES */}
          <Panel title="Admin Pages" rightActionText="Open" onRightAction={() => toast('Open Pages')}>
            <View style={styles.actionsGrid}>
              {pages.map((p) => (
                <ActionTile key={p.label} icon={p.icon} label={p.label} onPress={p.onPress} />
              ))}
            </View>
          </Panel>

          <View style={{ height: 18 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.bg },

  /* SIDEBAR */
  sidebar: { width: 250, backgroundColor: COLORS.sidebarDark },
  sidebarMobile: { width: 92 }, // small on mobile
  sidebarGradient: { flex: 1, paddingTop: 18, paddingHorizontal: 14, paddingBottom: 14 },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { color: '#fff', fontWeight: '900', fontSize: 16 },

  navSection: { marginTop: 6 },
  navTitle: { color: COLORS.sidebarMuted, fontWeight: '800', fontSize: 12, marginBottom: 10 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  navItemDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  navText: { color: COLORS.sidebarText, fontWeight: '800' },

  /* MAIN */
  main: { flex: 1 },
  topbar: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  pageSub: { marginTop: 2, color: COLORS.muted, fontWeight: '700', fontSize: 12 },

  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.blue,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },

  tabsRow: { paddingHorizontal: 18, flexDirection: 'row', gap: 10, paddingBottom: 8 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  tabText: { color: COLORS.muted, fontWeight: '900', fontSize: 12 },
  tabTextActive: { color: '#fff' },

  content: { paddingHorizontal: 18, paddingBottom: 18, gap: 14 },

  /* PANELS */
  panel: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  panelTitle: { fontWeight: '900', color: COLORS.text },
  panelAction: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  panelActionText: { color: COLORS.text, fontWeight: '900', fontSize: 12 },

  /* KPI */
  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: {
    flex: 1,
    minWidth: 230,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTitle: { color: COLORS.muted, fontWeight: '800', fontSize: 12 },
  statValue: { color: COLORS.text, fontWeight: '900', fontSize: 20, marginTop: 2 },
  statSub: { color: COLORS.muted, fontWeight: '700', fontSize: 11, marginTop: 2 },

  centerCta: {
    marginTop: 12,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  centerCtaText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  /* TWO COLS */
  twoCols: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },

  /* Fake chart */
  fakeChartBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  fakeChartTitle: { color: COLORS.muted, fontWeight: '800', fontSize: 11 },
  fakeChartBig: { marginTop: 6, fontSize: 28, fontWeight: '900', color: COLORS.text },
  fakeChartBigSmall: { fontSize: 16, fontWeight: '900' },
  fakeChartGreen: { color: COLORS.green2, fontWeight: '900', fontSize: 16 },
  fakeChart: {
    marginTop: 10,
    height: 90,
    borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  fakeChartFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  fakeChartFooterMuted: { color: COLORS.muted, fontWeight: '800', fontSize: 12 },
  fakeChartFooterValue: { color: COLORS.green2, fontWeight: '900', fontSize: 14 },

  /* Timeline */
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 999 },
  timelineTitle: { color: COLORS.text, fontWeight: '800', fontSize: 13 },
  timelineSub: { color: COLORS.muted, fontWeight: '700', fontSize: 12, marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  badgeText: { color: '#B91C1C', fontWeight: '900', fontSize: 11 },

  panelBottomBtn: {
    marginTop: 12,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0F172A',
  },
  panelBottomBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  /* Actions grid */
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionTile: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(34,197,94,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.22)',
  },
  actionLabel: { flex: 1, color: COLORS.text, fontWeight: '900' },
});
