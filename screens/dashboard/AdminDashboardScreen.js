import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminDashboardScreen({ navigateTo }) {
  const { user, signOut } = useAuth();

  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [phone, setPhone] = useState('');
  const [cityHe, setCityHe] = useState('');
  const [cityAr, setCityAr] = useState('');

  const isValidEmail = useMemo(() => {
    const v = email.trim().toLowerCase();
    return v.includes('@') && v.includes('.');
  }, [email]);

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setSchoolName('');
    setPhone('');
    setCityHe('');
    setCityAr('');
  };

  const handleLogout = async () => {
    await signOut();
    navigateTo('home');
  };

  const createPrincipal = async () => {
    if (!user) {
      navigateTo('login');
      return;
    }

    const payload = {
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      schoolName: schoolName.trim(),
      phone: phone.trim() || null,
      cityHe: cityHe.trim() || null,
      cityAr: cityAr.trim() || null,
    };

    if (!isValidEmail) {
      Alert.alert('Invalid Email', 'Please enter a valid principal email.');
      return;
    }
    if (!payload.fullName) {
      Alert.alert('Missing Name', 'Please enter principal full name.');
      return;
    }
    if (!payload.schoolName) {
      Alert.alert('Missing School', 'Please enter school name.');
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-principal', {
        body: payload,
      });

      if (error) {
        console.log('invoke error:', error.message);
        Alert.alert('Error', error.message);
        return;
      }

      if (!data?.success) {
        Alert.alert('Failed', data?.error || 'Failed to create principal');
        return;
      }

      Alert.alert(
        'Success ✅',
        `Invite email sent to:\n${payload.email}\n\nPrincipal user id:\n${data.principalUserId}`
      );

      resetForm();
    } catch (e) {
      console.log('createPrincipal error:', e?.message || String(e));
      Alert.alert('Error', e?.message || 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1e293b']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatarContainer}>
          <FontAwesome name="shield" size={48} color="#fff" />
        </View>

        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>

        <View style={styles.badge}>
          <FontAwesome name="lock" size={14} color="#fff" />
          <Text style={styles.badgeText}>Admin Access</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Create Principal (Invite)</Text>
          <Text style={styles.sectionHint}>
            The principal will receive an invite email to set their password on first login.
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>Principal Email *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="principal@email.com"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

            <Text style={styles.label}>School Name *</Text>
            <TextInput
              value={schoolName}
              onChangeText={setSchoolName}
              placeholder="School name"
              placeholderTextColor="#94A3B8"
              style={styles.input}
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone"
              placeholderTextColor="#94A3B8"
              style={styles.input}
              keyboardType="phone-pad"
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>City (Hebrew)</Text>
                <TextInput
                  value={cityHe}
                  onChangeText={setCityHe}
                  placeholder="עיר"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>City (Arabic)</Text>
                <TextInput
                  value={cityAr}
                  onChangeText={setCityAr}
                  placeholder="مدينة"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, busy && { opacity: 0.7 }]}
              onPress={createPrincipal}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <FontAwesome name="paper-plane" size={18} color="#fff" />
                  <Text style={styles.primaryText}>Send Invite</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={resetForm} disabled={busy}>
              <FontAwesome name="eraser" size={18} color="#27ae60" />
              <Text style={styles.secondaryText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <FontAwesome name="sign-out" size={20} color="#e74c3c" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },

  header: {
    paddingTop: 56,
    paddingBottom: 22,
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

  badge: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(39, 174, 96, 0.75)',
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  content: { padding: 20, paddingBottom: 28 },

  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 6 },
  sectionHint: { color: '#94A3B8', fontSize: 13, marginBottom: 14 },

  formCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  label: { color: '#94A3B8', fontSize: 13, marginBottom: 8, textAlign: 'left' },

  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  row: { flexDirection: 'row', gap: 12 },

  primaryButton: {
    backgroundColor: '#27ae60',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  secondaryButton: {
    marginTop: 10,
    backgroundColor: 'rgba(39, 174, 96, 0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.35)',
  },
  secondaryText: { color: '#27ae60', fontSize: 15, fontWeight: '900' },

  logoutButton: {
    marginTop: 6,
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
  logoutText: { color: '#e74c3c', fontSize: 16, fontWeight: '900' },
});
