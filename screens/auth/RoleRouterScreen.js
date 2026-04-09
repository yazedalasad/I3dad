import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function RoleRouterScreen({ navigateTo }) {
  const { user, loading, profile } = useAuth();
  const { t } = useTranslation();

  const navRef = useRef(navigateTo);
  useEffect(() => {
    navRef.current = navigateTo;
  }, [navigateTo]);

  const [statusText, setStatusText] = useState('Loading...');

  const routedRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navRef.current('home');
      return;
    }

    // Prevent multiple navigations
    if (routedRef.current) return;

    // If profile is still loading/null, wait a little then default to student
    // (because user_profiles insert is service-only in your DB)
    let timer = null;

    const decide = () => {
      if (routedRef.current) return;
      routedRef.current = true;

      const role = profile?.role ?? 'student';

      if (role === 'admin') {
        setStatusText('Loading admin dashboard...');
        navRef.current('adminDashboard');
        return;
      }

      if (role === 'principal') {
        setStatusText('Loading principal dashboard...');
        navRef.current('principalDashboard');
        return;
      }

      setStatusText('Loading home...');
      navRef.current('home');
    };

    // If profile exists -> route immediately
    if (profile?.role) {
      setStatusText('Checking role...');
      decide();
      return () => {};
    }

    // Otherwise, wait briefly for AuthContext refreshUserData to fill it
    setStatusText('Checking role...');
    timer = setTimeout(() => {
      // still no profile -> treat as student
      decide();
    }, 900); // small delay to let AuthContext finish

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user, loading, profile]);

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
        <Text style={styles.hint}>{t?.('common.pleaseWait') || 'Redirecting...'}</Text>
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
