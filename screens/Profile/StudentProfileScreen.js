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

  const completionPercent = useMemo(() => {
    if (!studentData) return 0;
    const fields = [
      studentData.first_name,
      studentData.last_name,
      studentData.phone,
      studentData.school_name,
      studentData.grade,
      studentData.birthday,
    ];
    const filled = fields.filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
      .length;
    return Math.round((filled / fields.length) * 100);
  }, [studentData]);

  const initials = useMemo(() => {
    const a = (studentData?.first_name || '').trim();
    const b = (studentData?.last_name || '').trim();
    const i1 = a ? a[0].toUpperCase() : 'S';
    const i2 = b ? b[0].toUpperCase() : 'T';
    return `${i1}${i2}`;
  }, [studentData]);

  const handleLogout = async () => {
    await signOut();
    navigateTo('home');
  };

  const InfoLine = ({ label, value }) => (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Profile Card (like your reference) */}
        <View style={styles.profileCard}>
          {/* Left: avatar placeholder */}
          <View style={styles.leftCol}>
            <View style={styles.avatarBox}>
              {/* no real image — placeholder */}
              <Text style={styles.initials}>{initials}</Text>
              <View style={styles.avatarIcon}>
                <FontAwesome name="user" size={22} color="#fff" />
              </View>
            </View>

            <View style={styles.miniBadge}>
              <Text style={styles.miniBadgeText}>{completionPercent}%</Text>
              <Text style={styles.miniBadgeSub}>Profile</Text>
            </View>
          </View>

          {/* Right: name + buttons + tabs */}
          <View style={styles.rightCol}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.email}>{user?.email || ''}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigateTo('adaptiveTest')}
                activeOpacity={0.9}
              >
                <FontAwesome name="rocket" size={16} color="#0F172A" />
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
                  color={activeTab === 'about' ? '#0F172A' : '#94A3B8'}
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
                  name="address-book"
                  size={14}
                  color={activeTab === 'contact' ? '#0F172A' : '#94A3B8'}
                />
                <Text style={[styles.tabText, activeTab === 'contact' && styles.tabTextActive]}>
                  Contact
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content Panels */}
        {activeTab === 'about' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Basic Information</Text>

            <InfoLine label="Student ID" value={studentData?.student_id} />
            <InfoLine label="Grade" value={gradeText} />
            <InfoLine label="Birth date" value={birthText} />
            <InfoLine label="School" value={studentData?.school_name} />
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Contact Information</Text>

            <InfoLine label="Email" value={user?.email} />
            <InfoLine label="Phone" value={studentData?.phone} />
            <InfoLine label="School" value={studentData?.school_name} />
          </View>
        )}

        {/* Bottom actions */}
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
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 18, paddingTop: 56 },

  profileCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  leftCol: { width: 120, alignItems: 'center' },

  avatarBox: {
    width: 110,
    height: 110,
    borderRadius: 18,
    backgroundColor: '#0b1223',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  initials: { color: '#fff', fontSize: 28, fontWeight: '900', opacity: 0.95 },
  avatarIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
  },

  miniBadge: {
    marginTop: 10,
    width: '100%',
    backgroundColor: '#0b1223',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(39,174,96,0.25)',
  },
  miniBadgeText: { color: '#27ae60', fontWeight: '900', fontSize: 16 },
  miniBadgeSub: { color: '#94A3B8', marginTop: 2, fontSize: 12, fontWeight: '700' },

  rightCol: { flex: 1 },

  name: { color: '#fff', fontSize: 20, fontWeight: '900' },
  email: { color: '#94A3B8', marginTop: 4, fontSize: 13 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },

  actionBtn: {
    flex: 1,
    backgroundColor: '#27ae60',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: { color: '#0F172A', fontWeight: '900' },

  actionBtnOutline: {
    flex: 1,
    backgroundColor: '#0b1223',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(39,174,96,0.35)',
  },
  actionBtnOutlineText: { color: '#27ae60', fontWeight: '900' },

  tabs: { marginTop: 12, flexDirection: 'row', gap: 10 },
  tab: {
    flex: 1,
    backgroundColor: '#0b1223',
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabActive: {
    backgroundColor: '#27ae60',
    borderColor: 'rgba(39,174,96,0.65)',
  },
  tabText: { color: '#94A3B8', fontWeight: '900', fontSize: 13 },
  tabTextActive: { color: '#0F172A' },

  panel: {
    marginTop: 14,
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  panelTitle: { color: '#fff', fontWeight: '900', fontSize: 14, marginBottom: 10 },

  infoLine: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  infoLabel: { color: '#94A3B8', fontWeight: '800', fontSize: 12, marginBottom: 4 },
  infoValue: { color: '#fff', fontWeight: '900', fontSize: 15 },

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
