import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function RoleRouterScreen({ navigateTo }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  const [statusText, setStatusText] = useState('Checking your account...');
  const ranRef = useRef(false);

  useEffect(() => {
    // If auth is still loading, wait
    if (loading) return;

    // If not logged in -> go home
    if (!user) {
      navigateTo('home');
      return;
    }

    // Prevent running twice on re-render
    if (ranRef.current) return;
    ranRef.current = true;

    const run = async () => {
      try {
        setStatusText('Loading your dashboard...');

        // 1) Principal check (if exists in principals -> principal dashboard)
        const { data: principalRow, error: principalErr } = await supabase
          .from('principals')
          .select('user_id, is_active')
          .eq('user_id', user.id)
          .maybeSingle();

        // ignore "no rows" type behavior (maybeSingle returns null data without throwing in most cases)
        if (principalErr && principalErr.code !== 'PGRST116') {
          console.log('principal check error:', principalErr.message);
        }

        if (principalRow?.user_id && (principalRow.is_active ?? true)) {
          navigateTo('principalDashboard');
          return;
        }

        // 2) Admin check (user_profiles.role === 'admin')
        const { data: profileRow, error: profileErr } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileErr && profileErr.code !== 'PGRST116') {
          console.log('profile check error:', profileErr.message);
        }

        if (profileRow?.role === 'admin') {
          navigateTo('adminDashboard');
          return;
        }

        // 3) Default: student / normal user
        navigateTo('home');
      } catch (e) {
        console.log('RoleRouter error:', e?.message || String(e));
        navigateTo('home');
      }
    };

    run();
  }, [user, loading, navigateTo]);

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
        <Text style={styles.title}>{t?.('common.loading') || 'Please wait'}</Text>
        <Text style={styles.subtitle}>{statusText}</Text>
      </LinearGradient>

      <View style={styles.content}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.hint}>
          {t?.('common.pleaseWait') || 'Redirecting you to the right dashboard...'}
        </Text>
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
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  hint: { marginTop: 14, fontSize: 14, color: '#555', textAlign: 'center' },
});
