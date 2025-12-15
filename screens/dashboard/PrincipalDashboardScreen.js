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

export default function PrincipalDashboardScreen({ navigateTo }) {
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [principal, setPrincipal] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        if (!user?.id) {
          navigateTo('login');
          return;
        }

        setLoading(true);

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
          // Not a principal (or missing row)
          Alert.alert('Access denied', 'Your account is not registered as a principal.');
          navigateTo('home');
          return;
        }

        if (mounted) setPrincipal(data);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Loading principal dashboard...</Text>
      </View>
    );
  }

  const city =
    principal?.city_he || principal?.city_ar || '—';
  const schoolName = principal?.school_name || '—';
  const fullName = principal?.full_name || '—';
  const active = principal?.is_active ?? true;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1e293b']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatarContainer}>
          <FontAwesome name="building" size={48} color="#fff" />
        </View>

        <Text style={styles.title}>Principal Dashboard</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>

        <View style={styles.badgesRow}>
          <View style={[styles.badge, active ? styles.badgeGreen : styles.badgeRed]}>
            <FontAwesome
              name={active ? 'check-circle' : 'times-circle'}
              size={14}
              color="#fff"
            />
            <Text style={styles.badgeText}>{active ? 'Active' : 'Inactive'}</Text>
          </View>

          <View style={styles.badge}>
            <FontAwesome name="map-marker" size={14} color="#fff" />
            <Text style={styles.badgeText}>{city}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info cards */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <FontAwesome name="user" size={20} color="#27ae60" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>Principal Name</Text>
            <Text style={styles.cardValue}>{fullName}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <FontAwesome name="university" size={20} color="#27ae60" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>School</Text>
            <Text style={styles.cardValue}>{schoolName}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <FontAwesome name="phone" size={20} color="#27ae60" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>Phone</Text>
            <Text style={styles.cardValue}>{principal?.phone || '—'}</Text>
          </View>
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Next step', 'Next file: Principal Students screen')}
        >
          <View style={styles.actionLeft}>
            <FontAwesome name="users" size={20} color="#fff" />
            <Text style={styles.actionText}>Manage Students</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigateTo('activities')}
        >
          <View style={styles.actionLeft}>
            <FontAwesome name="calendar" size={20} color="#fff" />
            <Text style={styles.actionText}>Activities</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Next step', 'Next file: Principal Reports screen')}
        >
          <View style={styles.actionLeft}>
            <FontAwesome name="bar-chart" size={20} color="#fff" />
            <Text style={styles.actionText}>Reports</Text>
          </View>
          <FontAwesome name="chevron-right" size={16} color="#fff" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <FontAwesome name="sign-out" size={20} color="#e74c3c" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: { marginTop: 16, fontSize: 16, color: '#94A3B8' },

  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#27ae60',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: { marginTop: 6, fontSize: 14, color: '#94A3B8' },

  badgesRow: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  badgeGreen: { backgroundColor: 'rgba(39, 174, 96, 0.75)' },
  badgeRed: { backgroundColor: 'rgba(231, 76, 60, 0.75)' },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  content: { padding: 20, paddingBottom: 28 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(39, 174, 96, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 13, color: '#94A3B8', marginBottom: 4, textAlign: 'right' },
  cardValue: { fontSize: 16, color: '#fff', fontWeight: '700', textAlign: 'right' },

  sectionTitle: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'left',
  },

  actionButton: {
    backgroundColor: '#27ae60',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  logoutButton: {
    marginTop: 10,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  logoutText: { color: '#e74c3c', fontSize: 16, fontWeight: '800' },
});
