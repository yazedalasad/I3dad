import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import CustomButton from '../../components/Form/CustomButton';
import CustomTextInput from '../../components/Form/CustomTextInput';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword } from '../../utils/validation';

export default function LoginScreen({ navigateTo }) {
  const { signIn } = useAuth();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const isHebrew = String(i18n?.language || '').toLowerCase().startsWith('he');
  const isWideLayout = width >= 1040;

  const heroTitle = isHebrew ? 'ברוכים השבים' : 'أهلًا بعودتك';
  const heroSubtitle = isHebrew
    ? 'היכנסו כדי להמשיך למסלול שמותאם ליכולות, לבית הספר ולבחירות שלכם.'
    : 'سجّل دخولك للعودة إلى مسارك الأكاديمي والمهني المصمم لقدراتك واختياراتك.';
  const heroQuote = isHebrew
    ? 'כניסה אחת, ותמונת הדרך שלך חוזרת אליך מיד.'
    : 'دخول واحد، وتعود لك صورة رحلتك كاملة من جديد.';
  const heroCardTitle = isHebrew ? 'כניסה חכמה יותר' : 'دخول أذكى';
  const heroCardText = isHebrew
    ? 'כל מה שחשוב לך נשאר קרוב: תוצאות, המלצות, פעילויות והתקדמות.'
    : 'كل ما يهمك يبقى قريبًا: نتائجك، توصياتك، فعالياتك، وتقدّمك.';

  const validateForm = () => {
    const newErrors = {};

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      let errorMessage = t('auth.login.errors.generic');

      if (error.message.includes('Invalid login credentials')) {
        errorMessage = t('auth.login.errors.invalidCredentials');
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = t('auth.login.errors.emailNotConfirmed');
      }

      Alert.alert(t('common.error'), errorMessage);
      return;
    }

    navigateTo('roleRouter');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={['#edf9f0', '#ffffff', '#f5fcf7']}
          style={styles.pageBackdrop}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.authShell, isWideLayout && styles.authShellWide]}>
            <LinearGradient
              colors={['#157347', '#1f8f50', '#2ecc71']}
              style={[styles.heroPanel, isWideLayout ? styles.heroPanelWide : styles.heroPanelStacked]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.heroOrbLarge} />
              <View style={styles.heroOrbSmall} />
              <View style={styles.heroRibbonOne} />
              <View style={styles.heroRibbonTwo} />

              <View style={styles.heroBadge}>
                <FontAwesome name="leaf" size={14} color="#27ae60" />
                <Text style={styles.heroBadgeText}>I3dad</Text>
              </View>

              <View style={styles.heroContent}>
                <View style={styles.heroIconWrap}>
                  <FontAwesome name="sign-in" size={44} color="#ffffff" />
                </View>
                <Text style={[styles.heroTitle, isHebrew && styles.heroTextRtl]}>{heroTitle}</Text>
                <Text style={[styles.heroSubtitle, isHebrew && styles.heroTextRtl]}>
                  {heroSubtitle}
                </Text>
              </View>

              <View style={[styles.heroGlassCard, isHebrew && styles.heroGlassCardRtl]}>
                <Text style={[styles.heroGlassTitle, isHebrew && styles.heroTextRtl]}>
                  {heroCardTitle}
                </Text>
                <Text style={[styles.heroGlassText, isHebrew && styles.heroTextRtl]}>
                  {heroCardText}
                </Text>

                <View style={[styles.heroQuoteRow, isHebrew && styles.heroQuoteRowRtl]}>
                  <View style={styles.quoteMark}>
                    <FontAwesome name="quote-left" size={12} color="#1f8f50" />
                  </View>
                  <Text style={[styles.heroQuoteText, isHebrew && styles.heroTextRtl]}>
                    {heroQuote}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            <View
              style={[
                styles.formContainer,
                isWideLayout ? styles.formContainerWide : styles.formContainerStacked,
              ]}
            >
              <View style={styles.formHeader}>
                <View style={styles.formBadge}>
                  <FontAwesome name="leaf" size={14} color="#27ae60" />
                  <Text style={styles.formBadgeText}>I3dad</Text>
                </View>
                <Text style={[styles.formTitle, isHebrew && styles.formTextRtl]}>
                  {t('auth.login.title')}
                </Text>
                <Text style={[styles.formLead, isHebrew && styles.formTextRtl]}>
                  {t('auth.login.subtitle')}
                </Text>
              </View>

              <View style={styles.formCard}>
                <CustomTextInput
                  label={t('auth.login.email')}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  }}
                  placeholder="example@gmail.com"
                  icon="envelope"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.email}
                />

                <CustomTextInput
                  label={t('auth.login.password')}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                  }}
                  placeholder={t('auth.login.password')}
                  icon="lock"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.password}
                />

                <TouchableOpacity
                  style={[styles.forgotPassword, isHebrew && styles.forgotPasswordRtl]}
                  onPress={() => navigateTo('forgotPassword')}
                >
                  <Text style={styles.forgotPasswordText}>{t('auth.login.forgotPassword')}</Text>
                </TouchableOpacity>

                <CustomButton
                  title={t('auth.login.loginButton')}
                  onPress={handleLogin}
                  icon="sign-in"
                  loading={loading}
                />

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t('common.or')}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.secondaryLinks}>
                  <View style={styles.signupContainer}>
                    <Text style={styles.signupText}>{t('auth.login.noAccount')} </Text>
                    <TouchableOpacity onPress={() => navigateTo('signup')}>
                      <Text style={styles.signupLink}>{t('auth.login.signupLink')}</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.principalFirstTime}
                    onPress={() => navigateTo('principalRegister')}
                  >
                    <Text style={styles.principalFirstTimeText}>
                      {t('login.principalFirstTime', { ns: 'auth' })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.backButton} onPress={() => navigateTo('home')}>
                    <FontAwesome name="arrow-right" size={16} color="#64748b" />
                    <Text style={styles.backButtonText}>{t('auth.login.backToHome')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  pageBackdrop: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
  },
  authShell: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  authShellWide: {
    flexDirection: 'row-reverse',
    minHeight: 780,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9efe0',
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  heroPanel: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroPanelWide: {
    flex: 1,
    padding: 34,
    justifyContent: 'space-between',
    minHeight: 780,
  },
  heroPanelStacked: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 18,
    minHeight: 420,
  },
  heroOrbLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.10)',
    top: -90,
    right: -70,
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -54,
    left: -38,
  },
  heroRibbonOne: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 40,
    borderWidth: 10,
    borderColor: 'rgba(255,255,255,0.08)',
    top: 120,
    left: -72,
    transform: [{ rotate: '24deg' }],
  },
  heroRibbonTwo: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 36,
    borderWidth: 8,
    borderColor: 'rgba(0,0,0,0.08)',
    bottom: 88,
    right: -32,
    transform: [{ rotate: '-18deg' }],
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: '#27ae60',
    fontSize: 14,
    fontWeight: '900',
  },
  heroContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  heroIconWrap: {
    width: 108,
    height: 108,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: '#0b3d24',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 17,
    lineHeight: 27,
    color: 'rgba(255,255,255,0.94)',
    textAlign: 'center',
    maxWidth: 420,
  },
  heroTextRtl: {
    textAlign: 'right',
  },
  heroGlassCard: {
    alignSelf: 'center',
    width: '76%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#0b3d24',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
    elevation: 6,
  },
  heroGlassCardRtl: {
    alignSelf: 'flex-end',
  },
  heroGlassTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'left',
  },
  heroGlassText: {
    fontSize: 14.5,
    lineHeight: 23,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'left',
  },
  heroQuoteRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroQuoteRowRtl: {
    flexDirection: 'row-reverse',
  },
  quoteMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroQuoteText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 24,
  },
  formContainerWide: {
    flex: 1,
    padding: 42,
    justifyContent: 'center',
  },
  formContainerStacked: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e1f0e6',
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  formHeader: {
    marginBottom: 24,
  },
  formBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#effaf2',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  formBadgeText: {
    color: '#27ae60',
    fontSize: 14,
    fontWeight: '900',
  },
  formTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#183b2b',
    textAlign: 'left',
  },
  formLead: {
    marginTop: 8,
    fontSize: 14.5,
    lineHeight: 22,
    color: '#5f7268',
    textAlign: 'left',
  },
  formTextRtl: {
    textAlign: 'right',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e6f5eb',
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 22,
  },
  forgotPasswordRtl: {
    alignSelf: 'flex-start',
  },
  forgotPasswordText: {
    color: '#27ae60',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#64748b',
    fontSize: 14,
  },
  secondaryLinks: {
    alignItems: 'center',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  signupText: {
    color: '#64748b',
    fontSize: 16,
  },
  signupLink: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: '700',
  },
  principalFirstTime: {
    marginBottom: 10,
    alignItems: 'center',
    paddingVertical: 6,
  },
  principalFirstTimeText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
});
