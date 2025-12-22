import { FontAwesome } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentProfileScreen({ navigateTo }) {
  const { user, studentData, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('about'); // about | contact

  const fullName =
    `${studentData?.first_name || ''} ${studentData?.last_name || ''}`.trim() || 'Student';

  const gradeText = studentData?.grade ? `Grade ${studentData.grade}` : '—';

  const birthText = studentData?.birthday
    ? new Date(studentData.birthday).toLocaleDateString('en-US')
    : '—';

  const addressText = useMemo(() => {
    const parts = [studentData?.city, studentData?.street, studentData?.house_number]
      .filter(Boolean)
      .join(', ');
    return parts || '—';
  }, [studentData?.city, studentData?.street, studentData?.house_number]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigateTo('login');
    } catch (e) {
      // silent
    }
  };

  const InfoLine = ({ label, value }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <FontAwesome name="user" size={30} color="#27ae60" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.subtitle}>{gradeText}</Text>
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigateTo('settings')}
          activeOpacity={0.85}
        >
          <FontAwesome name="cog" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{studentData?.points ?? 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{studentData?.completed_tasks ?? 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{studentData?.level ?? 1}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
        </View>

        {/* Primary actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigateTo('studentDashboard')}
            activeOpacity={0.9}
          >
            <FontAwesome name="home" size={16} color="#0b1223" />
            <Text style={styles.actionBtnText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() => navigateTo('editProfile')}
            activeOpacity={0.9}
          >
            <FontAwesome name="pencil" size={16} color="#27ae60" />
            <Text style={styles.actionBtnOutlineText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setActiveTab('about')}
            style={[styles.tab, activeTab === 'about' && styles.tabActive]}
            activeOpacity={0.9}
          >
            <FontAwesome
              name="info-circle"
              size={14}
              color={activeTab === 'about' ? '#0b1223' : '#94a3b8'}
            />
            <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>
              About
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('contact')}
            style={[styles.tab, activeTab === 'contact' && styles.tabActive]}
            activeOpacity={0.9}
          >
            <FontAwesome
              name="phone"
              size={14}
              color={activeTab === 'contact' ? '#0b1223' : '#94a3b8'}
            />
            <Text style={[styles.tabText, activeTab === 'contact' && styles.tabTextActive]}>
              Contact
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab content */}
        {activeTab === 'about' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal</Text>
            <InfoLine label="Birthday" value={birthText} />
            <InfoLine label="Address" value={addressText} />
            <InfoLine label="Gender" value={studentData?.gender} />

            <View style={styles.cardDivider} />

            <Text style={styles.cardTitle}>School</Text>
            <InfoLine label="School" value={studentData?.school_name} />
            <InfoLine label="Grade" value={studentData?.grade} />
            <InfoLine label="Track" value={studentData?.track} />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact</Text>
            <InfoLine label="Email" value={user?.email} />
            <InfoLine label="Phone" value={studentData?.phone} />
            <InfoLine label="School" value={studentData?.school_name} />
          </View>
        )}

        {/* Bottom actions */}
        <TouchableOpacity
          style={styles.changePasswordBtn}
          onPress={() => navigateTo('examHistory')}
          activeOpacity={0.9}
        >
          <FontAwesome name="history" size={18} color="#27ae60" />
          <Text style={styles.changePasswordText}>سجل الاختبارات</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changePasswordBtn}
          onPress={() => navigateTo('changePassword')}
          activeOpacity={0.9}
        >
          <FontAwesome name="lock" size={18} color="#27ae60" />
          <Text style={styles.changePasswordText}>تغيير كلمة المرور</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.9}>
          <FontAwesome name="sign-out" size={18} color="#e74c3c" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1223' },

  header: {
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: 'rgba(39,174,96,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { color: '#e2e8f0', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginTop: 2, fontWeight: '700' },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
  },

  content: { padding: 18, paddingTop: 10 },

  statsCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNumber: { color: '#e2e8f0', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  statDivider: { width: 1, backgroundColor: 'rgba(148,163,184,0.15)' },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnText: { color: '#0b1223', fontWeight: '900', fontSize: 14 },
  actionBtnOutline: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(39,174,96,0.45)',
  },
  actionBtnOutlineText: { color: '#27ae60', fontWeight: '900', fontSize: 14 },

  tabs: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tab: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  tabActive: { backgroundColor: '#27ae60', borderColor: '#27ae60' },
  tabText: { color: '#94a3b8', fontWeight: '900', fontSize: 13 },
  tabTextActive: { color: '#0b1223' },

  card: {
    marginTop: 14,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  cardTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: '900', marginBottom: 10 },
  cardDivider: { height: 1, backgroundColor: 'rgba(148,163,184,0.15)', marginVertical: 14 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 7 },
  infoLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
  infoValue: { color: '#e2e8f0', fontSize: 12, fontWeight: '800' },

  changePasswordBtn: {
    marginTop: 14,
    backgroundColor: '#0b1223',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  changePasswordText: { color: '#27ae60', fontWeight: '900', fontSize: 15 },

  logoutBtn: {
    marginTop: 14,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  logoutText: { color: '#e74c3c', fontWeight: '900', fontSize: 15 },
});
