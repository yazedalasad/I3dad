import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

const ADMIN_ROLES = new Set(['admin']);
const PRINCIPAL_ROLES = new Set(['principal', 'school_admin']);

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function roleFromUser(user) {
  return normalizeRole(user?.app_metadata?.role);
}

function safeT(t, key, fallback) {
  const value = t?.(key);
  return value && value !== key ? value : fallback;
}

async function getFreshAuthUser() {
  try {
    const { data: sessionData } = await supabase.auth.getSession?.();
    if (sessionData?.session?.user) return sessionData.session.user;
  } catch (_error) {
    // Continue to getUser fallback.
  }

  try {
    const { data: authData } = await supabase.auth.getUser?.();
    return authData?.user || null;
  } catch (_error) {
    return null;
  }
}

async function getProfileRole(userId) {
  if (!userId) return '';

  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    return normalizeRole(data?.role);
  } catch (_error) {
    return '';
  }
}

export default function RoleRouterScreen({ navigateTo }) {
  const { user, initializingAuth, profile, studentDataLoading } = useAuth();
  const { t } = useTranslation();
  const navRef = useRef(navigateTo);
  const routedRef = useRef(false);
  const [statusText, setStatusText] = useState('Checking role...');

  useEffect(() => {
    navRef.current = navigateTo;
  }, [navigateTo]);

  useEffect(() => {
    let cancelled = false;

    const route = async () => {
      if (initializingAuth || studentDataLoading || routedRef.current) return;

      setStatusText('Checking session...');
      const authUser = user || (await getFreshAuthUser());

      if (cancelled || routedRef.current) return;

      if (!authUser) {
        routedRef.current = true;
        navRef.current('login', {}, { replace: true });
        return;
      }

      setStatusText('Checking role...');
      const metadataRole = roleFromUser(authUser);
      const contextRole = normalizeRole(profile?.role);
      const dbRole = metadataRole || contextRole ? '' : await getProfileRole(authUser.id);
      const role = metadataRole || contextRole || dbRole || 'student';

      if (cancelled || routedRef.current) return;

      routedRef.current = true;

      if (ADMIN_ROLES.has(role)) {
        setStatusText('Loading admin dashboard...');
        navRef.current('adminDashboard', {}, { replace: true });
        return;
      }

      if (PRINCIPAL_ROLES.has(role)) {
        setStatusText('Loading principal dashboard...');
        navRef.current('principalDashboard', {}, { replace: true });
        return;
      }

      setStatusText('Loading student home...');
      navRef.current('home', {}, { replace: true });
    };

    route();

    return () => {
      cancelled = true;
    };
  }, [user, initializingAuth, studentDataLoading, profile?.role]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#27ae60', '#2ecc71']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.logoContainer}>
          <FontAwesome name="shield" size={56} color="#fff" />
        </View>
        <Text style={styles.title}>{safeT(t, 'common.loading', 'جاري التحميل...')}</Text>
        <Text style={styles.subtitle}>{statusText}</Text>
      </LinearGradient>

      <View style={styles.content}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.hint}>{safeT(t, 'common.pleaseWait', 'الرجاء الانتظار...')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  hint: { marginTop: 14, fontSize: 16, color: '#555', textAlign: 'center' },
});
