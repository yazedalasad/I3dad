import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { adminColors, adminShadow } from './adminTheme';
import { useAdminTranslator } from './adminTranslations';

export const adminNavItems = [
  { key: 'dashboard', labelAr: 'لوحة التحكم الرئيسية', labelHe: 'לוח בקרה ראשי', icon: 'dashboard', screen: 'adminDashboard' },
  { key: 'students', labelAr: 'إدارة الطلاب', labelHe: 'ניהול תלמידים', icon: 'users', screen: 'adminStudents' },
  { key: 'managers', labelAr: 'إدارة مديري المدارس', labelHe: 'ניהול מנהלי בתי ספר', icon: 'id-badge', screen: 'adminManagers' },
  { key: 'schools', labelAr: 'إدارة المدارس / المؤسسات', labelHe: 'ניהול בתי ספר', icon: 'building', screen: 'adminSchools' },
  { key: 'subjects', labelAr: 'إدارة المواد والقدرات', labelHe: 'מקצועות ויכולות', icon: 'sliders', screen: 'adminSubjects' },
  { key: 'questions', labelAr: 'بنك الأسئلة', labelHe: 'מאגר שאלות', icon: 'question-circle', screen: 'adminQuestions' },
  { key: 'games', labelAr: 'إدارة الألعاب التعليمية', labelHe: 'ניהול משחקים לימודיים', icon: 'gamepad', screen: 'adminGames' },
  { key: 'sessions', labelAr: 'جلسات الاختبارات', labelHe: 'מפגשי מבחן', icon: 'clock-o', screen: 'adminTestSessions' },
  { key: 'reports', labelAr: 'نتائج وتقارير الطلاب', labelHe: 'תוצאות ודוחות תלמידים', icon: 'bar-chart', screen: 'adminReports' },
  { key: 'analytics', labelAr: 'التقارير العامة والإحصائيات', labelHe: 'דוחות וסטטיסטיקות', icon: 'line-chart', screen: 'adminReports' },
  { key: 'institutions', labelAr: 'إدارة المؤسسات الأكاديمية', labelHe: 'מוסדות אקדמיים', icon: 'university', screen: 'adminInstitutions' },
  { key: 'translations', labelAr: 'إدارة المحتوى والترجمات', labelHe: 'תוכן ותרגומים', icon: 'language', screen: 'adminTranslations' },
  { key: 'roles', labelAr: 'الصلاحيات والأدوار', labelHe: 'הרשאות ותפקידים', icon: 'lock', screen: 'adminRoles' },
  { key: 'audit', labelAr: 'سجل العمليات والأمان', labelHe: 'יומן אבטחה', icon: 'history', screen: 'adminAuditLog' },
  { key: 'settings', labelAr: 'إعدادات النظام', labelHe: 'הגדרות מערכת', icon: 'cog', screen: 'adminSettings' },
];

export function useAdminLocale() {
  const { i18n } = useTranslation();
  const language = String(i18n.language || 'ar').toLowerCase();
  const isHebrew = language.startsWith('he');
  return { i18n, language, isHebrew, isRTL: language.startsWith('ar') || isHebrew };
}

export function adminLabel(item, isHebrew) {
  return isHebrew ? item.labelHe || item.labelAr : item.labelAr || item.labelHe;
}

export function useAdminBreakpoints() {
  const { width } = useWindowDimensions();
  return {
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width <= 1024,
    isDesktop: width > 1024,
  };
}

export function AdminShell({ activeKey, title, subtitle, navigateTo, children, primaryAction }) {
  const { user, signOut, profile, loading, studentDataLoading } = useAuth();
  const { i18n, isHebrew } = useAdminLocale();
  const { width, isMobile, isTablet } = useAdminBreakpoints();
  const tr = useAdminTranslator();
  const [menuOpen, setMenuOpen] = useState(false);

  const adminName = useMemo(
    () => profile?.full_name || profile?.display_name || user?.email || 'Admin',
    [profile?.display_name, profile?.full_name, user?.email]
  );

  const handleLanguage = () => {
    i18n.changeLanguage?.(isHebrew ? 'ar' : 'he');
  };

  const handleSignOut = async () => {
    try {
      await signOut?.();
      navigateTo?.('home');
    } catch (error) {
      Alert.alert(tr('تعذر تسجيل الخروج'), error?.message || tr('حدث خطأ غير متوقع'));
    }
  };

  const role = String(user?.app_metadata?.role || profile?.role || '').toLowerCase();
  if (loading) {
    return (
      <View style={styles.accessState}>
        <LoadingState label="جاري التحقق من صلاحيات الأدمن..." />
      </View>
    );
  }

  if (!role && studentDataLoading) {
    return (
      <View style={styles.accessState}>
        <LoadingState label="جاري التحقق من صلاحيات الأدمن..." />
      </View>
    );
  }

  if (role !== 'admin') {
    return (
      <View style={styles.accessState}>
        <ErrorState message="هذه الصفحة مخصصة للأدمن فقط. لا يمكن لمدير المدرسة أو الطالب رؤية بيانات النظام العامة." />
      </View>
    );
  }

  const renderNavItem = (item, compact = false) => {
    const active = activeKey === item.key;
    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.navItem, compact && styles.navItemCompact, active && styles.navItemActive]}
        onPress={() => {
          setMenuOpen(false);
          navigateTo?.(item.screen);
        }}
        activeOpacity={0.9}
      >
        <FontAwesome name={item.icon} size={compact ? 17 : 15} color={active ? adminColors.primary : '#EAF0FF'} />
        {!compact && (
          <Text style={[styles.navText, active && styles.navTextActive]} numberOfLines={1}>
            {adminLabel(item, isHebrew)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderSidebar = (compact = false) => (
    <LinearGradient colors={[adminColors.primary, adminColors.primary2]} style={[styles.sidebarGradient, compact && styles.sidebarGradientCompact]}>
      <View style={[styles.brand, compact && styles.brandCompact]}>
        <View style={styles.brandIcon}>
          <FontAwesome name="graduation-cap" size={18} color="#fff" />
        </View>
        {!compact && (
          <View style={styles.brandText}>
            <Text style={styles.brandTitle}>{'\u05d0\u05d9\u05e2\u05d3\u05d0\u05d3'}</Text>
            <Text style={styles.brandSubtitle}>Admin Panel</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.navList, compact && styles.navListCompact]}>
        {adminNavItems.map((item) => renderNavItem(item, compact))}
      </ScrollView>
    </LinearGradient>
  );

  return (
    <View style={[styles.shell, isMobile && styles.shellMobile]}>
      {!isMobile && (
        <View style={[styles.sidebar, isTablet && styles.sidebarTablet]}>
          {renderSidebar(isTablet)}
        </View>
      )}

      <View style={styles.main}>
        <View style={[styles.topbar, isMobile && styles.topbarMobile]}>
          <View style={[styles.topbarHead, isMobile && styles.topbarHeadMobile]}>
            {isMobile && (
              <Pressable
                style={styles.menuButton}
                onPress={() => setMenuOpen(true)}
                onPressIn={() => setMenuOpen(true)}
                hitSlop={10}
                accessibilityRole="button"
              >
                <FontAwesome name="bars" size={18} color={adminColors.primary} />
              </Pressable>
            )}
            <View style={[styles.topbarText, isMobile && styles.topbarTextMobile]}>
              <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]} numberOfLines={2} ellipsizeMode="tail">{tr(title)}</Text>
              <Text style={[styles.pageSubtitle, isMobile && styles.pageSubtitleMobile]} numberOfLines={2} ellipsizeMode="tail">{tr(subtitle)}</Text>
            </View>
          </View>
          <View style={[styles.topbarActions, isMobile && styles.topbarActionsMobile]}>
            {primaryAction}
            <TouchableOpacity style={[styles.iconButton, isMobile && styles.iconButtonMobile]} onPress={handleLanguage}>
              <FontAwesome name="language" size={isMobile ? 15 : 16} color={adminColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, isMobile && styles.iconButtonMobile]} onPress={() => Alert.alert(tr('الإشعارات'), tr('لا توجد إشعارات جديدة'))}>
              <FontAwesome name="bell" size={16} color={adminColors.primary} />
            </TouchableOpacity>
            <View style={[styles.adminPill, isMobile && styles.adminPillMobile]}>
              <FontAwesome name="user-circle" size={17} color={adminColors.primary} />
              <Text style={styles.adminName} numberOfLines={1} ellipsizeMode="tail">{adminName}</Text>
            </View>
            <TouchableOpacity style={[styles.logoutButton, isMobile && styles.logoutButtonMobile]} onPress={handleSignOut}>
              <FontAwesome name="sign-out" size={15} color="#fff" />
              <Text style={styles.logoutText}>{tr('خروج')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isMobile && styles.contentMobile]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>

      {isMobile && menuOpen && (
        <View style={styles.drawerLayer}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View style={[styles.mobileDrawer, { width: Math.min(width - 32, 340) }]}>
            {renderSidebar(false)}
          </View>
        </View>
      )}
    </View>
  );
}

export function AdminCard({ title, subtitle, children, action }) {
  const { isMobile } = useAdminBreakpoints();
  const tr = useAdminTranslator();
  return (
    <View style={[styles.card, isMobile && styles.cardMobile]}>
      {(title || action) && (
        <View style={[styles.cardHeader, isMobile && styles.cardHeaderMobile]}>
          <View style={{ flex: 1 }}>
            {!!title && <Text style={styles.cardTitle}>{tr(title)}</Text>}
            {!!subtitle && <Text style={styles.cardSubtitle}>{tr(subtitle)}</Text>}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

export function StatCard({ icon, label, value, hint, tone = adminColors.primary }) {
  const { isMobile, isTablet } = useAdminBreakpoints();
  const tr = useAdminTranslator();
  return (
    <View style={[styles.statCard, isTablet && styles.statCardTablet, isMobile && styles.statCardMobile]}>
      <View style={[styles.statIcon, { backgroundColor: tone }]}>
        <FontAwesome name={icon} size={16} color="#fff" />
      </View>
      <Text style={styles.statLabel}>{tr(label)}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {!!hint && <Text style={styles.statHint}>{tr(hint)}</Text>}
    </View>
  );
}

export function FilterBar({ search, onSearch, filters = [], action }) {
  const { isMobile } = useAdminBreakpoints();
  const tr = useAdminTranslator();
  return (
    <View style={[styles.filterBar, isMobile && styles.filterBarMobile]}>
      <View style={[styles.searchBox, isMobile && styles.searchBoxMobile]}>
        <FontAwesome name="search" size={15} color={adminColors.muted} />
        <TextInput
          value={search}
          onChangeText={onSearch}
          placeholder={tr('بحث...')}
          placeholderTextColor={adminColors.muted}
          style={styles.searchInput}
          textAlign="right"
        />
      </View>
      {filters.map((filter) => (
        <TouchableOpacity key={filter.label} style={[styles.filterChip, isMobile && styles.filterChipMobile]} onPress={filter.onPress}>
          <Text style={styles.filterText}>{tr(filter.label)}</Text>
          <FontAwesome name="chevron-down" size={11} color={adminColors.muted} />
        </TouchableOpacity>
      ))}
      {action}
    </View>
  );
}

export function AdminTable({ columns, rows, keyField = 'id', emptyText = 'لا توجد بيانات', onRowPress }) {
  const { isMobile } = useAdminBreakpoints();
  const tr = useAdminTranslator();
  if (!rows?.length) return <EmptyState title={emptyText} icon="inbox" />;

  if (isMobile) {
    return (
      <View style={styles.mobileRecords}>
        {rows.map((row, index) => {
          const actionColumn = columns.find((column) => column.key === 'actions');
          const visibleColumns = columns.filter((column) => column.key !== 'actions').slice(0, 7);
          return (
            <TouchableOpacity
              key={row[keyField] || String(index)}
              style={styles.mobileRecordCard}
              onPress={() => onRowPress?.(row)}
              activeOpacity={onRowPress ? 0.88 : 1}
            >
              {visibleColumns.map((column) => (
                <View key={column.key} style={styles.mobileRecordRow}>
                  <Text style={styles.mobileRecordLabel} numberOfLines={1}>{tr(column.label)}</Text>
                  <View style={styles.mobileRecordValue}>
                    {column.render ? (
                      column.render(row)
                    ) : (
                      <Text style={styles.mobileRecordText} numberOfLines={2}>
                        {formatCell(row[column.key])}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {!!actionColumn && (
                <View style={styles.mobileRecordActions}>
                  {actionColumn.render ? actionColumn.render(row) : null}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={styles.tableRowHead}>
          {columns.map((column) => (
            <Text key={column.key} style={[styles.th, { width: column.width || 150 }]}>
              {tr(column.label)}
            </Text>
          ))}
        </View>
        {rows.map((row, index) => (
          <TouchableOpacity
            key={row[keyField] || `${index}`}
            style={styles.tableRow}
            onPress={() => onRowPress?.(row)}
            activeOpacity={onRowPress ? 0.88 : 1}
          >
            {columns.map((column) => (
              <View key={column.key} style={[styles.td, { width: column.width || 150 }]}>
                {column.render ? (
                  column.render(row)
                ) : (
                  <Text style={styles.tdText} numberOfLines={2}>
                    {formatCell(row[column.key])}
                  </Text>
                )}
              </View>
            ))}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

export function StatusBadge({ status }) {
  const tr = useAdminTranslator();
  const value = String(status || 'active').toLowerCase();
  const isDanger = ['inactive', 'disabled', 'deleted', 'failed', 'موقوف'].includes(value);
  const isWarning = ['pending', 'in_progress', 'incomplete'].includes(value);
  const backgroundColor = isDanger ? adminColors.softRed : isWarning ? adminColors.softOrange : adminColors.softGreen;
  const color = isDanger ? adminColors.danger : isWarning ? adminColors.warning : adminColors.success;
  return (
    <View style={[styles.statusBadge, { backgroundColor }]}>
      <Text style={[styles.statusText, { color }]}>{tr(status || 'نشط')}</Text>
    </View>
  );
}

export function LoadingState({ label = 'جاري تحميل البيانات...' }) {
  const tr = useAdminTranslator();
  return (
    <View style={styles.stateBox}>
      <ActivityIndicator color={adminColors.primary2} />
      <Text style={styles.stateText}>{tr(label)}</Text>
    </View>
  );
}

export function ErrorState({ message }) {
  const tr = useAdminTranslator();
  return (
    <View style={styles.stateBox}>
      <FontAwesome name="exclamation-circle" size={24} color={adminColors.danger} />
      <Text style={styles.stateText}>{tr(message || 'تعذر تحميل البيانات')}</Text>
    </View>
  );
}

export function EmptyState({ title, icon = 'folder-open' }) {
  const tr = useAdminTranslator();
  return (
    <View style={styles.stateBox}>
      <FontAwesome name={icon} size={24} color={adminColors.muted} />
      <Text style={styles.stateText}>{tr(title)}</Text>
    </View>
  );
}

export function ChartCard({ title, data = [], tone = adminColors.primary2 }) {
  const { isMobile } = useAdminBreakpoints();
  const tr = useAdminTranslator();
  const max = Math.max(1, ...data.map((item) => Number(item.value || 0)));
  return (
    <View style={[styles.chartCardWrap, isMobile && styles.chartCardWrapMobile]}>
      <AdminCard title={title}>
        <ScrollView horizontal={isMobile} showsHorizontalScrollIndicator={false}>
          <View style={[styles.chartRows, isMobile && styles.chartRowsMobile]}>
            {data.map((item) => (
              <View key={item.label} style={styles.chartRow}>
                <Text style={styles.chartLabel} numberOfLines={1}>{tr(item.label)}</Text>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartFill, { width: `${Math.max(6, (Number(item.value || 0) / max) * 100)}%`, backgroundColor: tone }]} />
                </View>
                <Text style={styles.chartValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </AdminCard>
    </View>
  );
}

export function FormInput({ label, value, onChangeText, multiline, placeholder, ...props }) {
  const tr = useAdminTranslator();
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{tr(label)}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.formInput, multiline && styles.formInputMultiline]}
        placeholderTextColor={adminColors.muted}
        placeholder={tr(placeholder)}
        textAlign="right"
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

function formatCell(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row-reverse', backgroundColor: adminColors.bg, position: 'relative' },
  shellMobile: { flexDirection: 'column' },
  accessState: { flex: 1, backgroundColor: adminColors.bg, alignItems: 'center', justifyContent: 'center', padding: 20 },
  sidebar: { width: 286, backgroundColor: adminColors.primary },
  sidebarTablet: { width: 88 },
  sidebarGradient: { flex: 1, paddingHorizontal: 14, paddingTop: 18, paddingBottom: 14 },
  sidebarGradientCompact: { paddingHorizontal: 10 },
  brand: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 16 },
  brandCompact: { justifyContent: 'center' },
  brandIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  brandText: { minWidth: 0 },
  brandTitle: { color: '#fff', fontSize: 17, fontWeight: '900', textAlign: 'right' },
  brandSubtitle: { color: '#D9E5FF', fontSize: 11, fontWeight: '800', textAlign: 'right' },
  navList: { gap: 6, paddingBottom: 20 },
  navListCompact: { alignItems: 'center' },
  navItem: { minHeight: 43, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  navItemCompact: { width: 52, height: 48, minHeight: 48, justifyContent: 'center', paddingHorizontal: 0 },
  navItemActive: { backgroundColor: '#fff' },
  navText: { flex: 1, color: '#EAF0FF', fontSize: 12, fontWeight: '900', textAlign: 'right' },
  navTextActive: { color: adminColors.primary },
  main: { flex: 1, minWidth: 0 },
  topbar: { minHeight: 74, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 18, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: adminColors.border },
  topbarMobile: { minHeight: 0, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'column', alignItems: 'stretch', gap: 10 },
  topbarHead: { flex: 1, minWidth: 0, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  topbarHeadMobile: { flex: 0, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topbarText: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  topbarTextMobile: { flex: 1, alignItems: 'flex-end', paddingLeft: 10 },
  pageTitle: { flexShrink: 1, color: adminColors.text, fontSize: 24, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  pageTitleMobile: { fontSize: 20, lineHeight: 26 },
  pageSubtitle: { flexShrink: 1, marginTop: 4, color: adminColors.muted, fontSize: 13, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  pageSubtitleMobile: { fontSize: 12, lineHeight: 18 },
  topbarActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  topbarActionsMobile: { width: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  menuButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: adminColors.softBlue, alignItems: 'center', justifyContent: 'center', zIndex: 20, elevation: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: adminColors.softBlue, alignItems: 'center', justifyContent: 'center' },
  iconButtonMobile: { width: 40, height: 40, borderRadius: 13 },
  adminPill: { flexShrink: 1, minWidth: 0, maxWidth: 220, height: 42, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff', paddingHorizontal: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  adminPillMobile: { maxWidth: 150, height: 40, borderRadius: 13 },
  adminName: { flexShrink: 1, minWidth: 0, color: adminColors.text, fontWeight: '900', fontSize: 12 },
  logoutButton: { height: 42, borderRadius: 14, paddingHorizontal: 12, backgroundColor: adminColors.primary, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  logoutButtonMobile: { height: 40, borderRadius: 13, paddingHorizontal: 10 },
  logoutText: { color: '#fff', fontWeight: '900' },
  scroll: { flex: 1 },
  content: { padding: 18, paddingBottom: 34, gap: 14 },
  contentMobile: { padding: 16, paddingBottom: 28 },
  drawerLayer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row-reverse', zIndex: 9999, elevation: 50 },
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,42,104,0.35)' },
  mobileDrawer: { height: '100%', backgroundColor: adminColors.primary, borderTopLeftRadius: 24, borderBottomLeftRadius: 24, overflow: 'hidden', zIndex: 10000, elevation: 60, ...adminShadow },
  card: { backgroundColor: adminColors.card, borderRadius: 22, borderWidth: 1, borderColor: adminColors.border, padding: 16, ...adminShadow },
  cardMobile: { borderRadius: 20, padding: 14 },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardHeaderMobile: { alignItems: 'flex-start', flexWrap: 'wrap' },
  cardTitle: { color: adminColors.text, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  cardSubtitle: { marginTop: 3, color: adminColors.muted, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  statCard: { flexGrow: 1, flexBasis: 150, minHeight: 106, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: adminColors.border, padding: 12, alignItems: 'flex-end', ...adminShadow },
  statCardTablet: { flexBasis: '47%' },
  statCardMobile: { width: 150, flexBasis: 150, flexGrow: 0, minHeight: 94 },
  statIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statLabel: { marginTop: 8, color: adminColors.muted, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  statValue: { marginTop: 3, color: adminColors.text, fontSize: 20, fontWeight: '900', textAlign: 'right' },
  statHint: { marginTop: 2, color: adminColors.muted, fontSize: 10, fontWeight: '700', textAlign: 'right' },
  filterBar: { flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14 },
  filterBarMobile: { alignItems: 'stretch' },
  searchBox: { flexGrow: 1, flexBasis: 260, minHeight: 46, borderRadius: 16, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff', paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  searchBoxMobile: { flexBasis: '100%', width: '100%' },
  searchInput: { flex: 1, color: adminColors.text, fontWeight: '700' },
  filterChip: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff', paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  filterChipMobile: { flexGrow: 1, justifyContent: 'center' },
  filterText: { color: adminColors.text, fontWeight: '800', fontSize: 12 },
  table: { minWidth: 860, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: adminColors.border },
  tableRowHead: { flexDirection: 'row-reverse', backgroundColor: adminColors.softBlue, borderBottomWidth: 1, borderBottomColor: adminColors.border },
  tableRow: { flexDirection: 'row-reverse', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: adminColors.border },
  th: { padding: 12, color: adminColors.text, fontWeight: '900', textAlign: 'right', fontSize: 12 },
  td: { minHeight: 50, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  tdText: { color: adminColors.text, fontWeight: '700', textAlign: 'right', fontSize: 12, lineHeight: 18 },
  mobileRecords: { gap: 12 },
  mobileRecordCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: adminColors.border, padding: 13, gap: 10, ...adminShadow },
  mobileRecordRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  mobileRecordLabel: { width: 112, color: adminColors.muted, fontSize: 11, fontWeight: '900', textAlign: 'right' },
  mobileRecordValue: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  mobileRecordText: { color: adminColors.text, fontWeight: '800', fontSize: 12, lineHeight: 18, textAlign: 'right' },
  mobileRecordActions: { paddingTop: 10, borderTopWidth: 1, borderTopColor: adminColors.border, alignItems: 'flex-end' },
  statusBadge: { alignSelf: 'flex-end', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 11, fontWeight: '900' },
  stateBox: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateText: { color: adminColors.muted, fontWeight: '800', textAlign: 'center' },
  chartCardWrap: { flexGrow: 1, flexBasis: 320, minWidth: 0 },
  chartCardWrapMobile: { width: '100%', flexBasis: 'auto', flexGrow: 0 },
  chartRows: { gap: 12 },
  chartRowsMobile: { minWidth: 520 },
  chartRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  chartLabel: { width: 110, color: adminColors.text, fontWeight: '800', fontSize: 12, textAlign: 'right' },
  chartTrack: { flex: 1, height: 12, borderRadius: 999, overflow: 'hidden', backgroundColor: adminColors.softBlue },
  chartFill: { height: '100%', borderRadius: 999 },
  chartValue: { width: 42, color: adminColors.muted, fontWeight: '900', fontSize: 12, textAlign: 'left' },
  formField: { gap: 6 },
  formLabel: { color: adminColors.text, fontWeight: '900', textAlign: 'right' },
  formInput: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff', color: adminColors.text, paddingHorizontal: 12, fontWeight: '700' },
  formInputMultiline: { minHeight: 96, paddingTop: 10, textAlignVertical: 'top' },
});
