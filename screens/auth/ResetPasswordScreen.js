import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useRef } from 'react';
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
import { supabase } from '../../config/supabase';
import { validatePassword } from '../../utils/validation';

export default function ResetPasswordScreen({ navigateTo, email }) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const submitRef = useRef(false);

  const isHebrew = String(i18n?.language || '').toLowerCase().startsWith('he');
  const isWideLayout = width >= 1040;
  const activeStepIndex = 2;
  const resetT = (key, options) => {
    const scoped = t(`resetPassword.${key}`, { ns: 'auth', ...(options || {}) });
    return typeof scoped === 'string' ? scoped : t(`auth.resetPassword.${key}`, options);
  };

  const stepItems = isHebrew
    ? [
        {
          title: 'מזינים אימייל',
          text: 'נשלח אליך קוד אימות לכתובת האימייל של החשבון.',
        },
        {
          title: 'מאמתים קוד',
          text: 'מזינים את הקוד שקיבלתם כדי לאשר שזה החשבון שלכם.',
        },
        {
          title: 'יוצרים סיסמה חדשה',
          text: 'בוחרים סיסמה חדשה וחוזרים להתחבר בצורה בטוחה.',
        },
      ]
    : [
        {
          title: 'أدخل البريد',
          text: 'سنرسل رمز تحقق إلى بريد الحساب.',
        },
        {
          title: 'تحقق من الرمز',
          text: 'أدخل الرمز الذي وصلك للتأكد من الحساب.',
        },
        {
          title: 'أنشئ كلمة مرور جديدة',
          text: 'اختر كلمة مرور جديدة وارجع لتسجيل الدخول بأمان.',
        },
      ];

  const validateForm = () => {
    const nextErrors = {};

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      nextErrors.password = passwordValidation.error;
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = t('validation.required') || 'حقل مطلوب';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword =
        t('validation.passwordsNotMatch') || 'كلمتا المرور غير متطابقتين';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const showSupabaseError = (err) => {
    const status = err?.status ?? err?.statusCode ?? 'N/A';
    const errorCode = err?.code ?? 'N/A';
    const message = err?.message ?? 'Unknown error';

    Alert.alert(isHebrew ? 'אירעה שגיאה' : 'حدث خطأ', `Status: ${status}\nCode: ${errorCode}\n\n${message}`);
  };

  const handleResetPassword = async () => {
    if (loading || submitRef.current) return;
    if (!validateForm()) return;

    submitRef.current = true;
    setLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData?.session) {
        Alert.alert(
          isHebrew ? 'לא ניתן לשנות סיסמה' : 'لا يمكن تغيير كلمة المرور',
          isHebrew
            ? 'אין הפעלה תקפה. חזרו למסך אימות הקוד ונסו שוב.'
            : 'لا توجد جلسة صالحة. ارجع إلى صفحة التحقق من الرمز وحاول مرة أخرى.'
        );
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();

      Alert.alert(resetT('success.title'), resetT('success.message'), [
        {
          text: resetT('success.loginButton'),
          onPress: () => navigateTo('login'),
        },
      ]);
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('same password')) {
        Alert.alert(isHebrew ? 'שגיאה' : 'خطأ', resetT('errors.samePassword'));
        return;
      }

      showSupabaseError(err);
    } finally {
      setLoading(false);
      submitRef.current = false;
    }
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

              <View style={styles.heroBadge}>
                <FontAwesome name="leaf" size={14} color="#27ae60" />
                <Text style={styles.heroBadgeText}>i3dad / إعداد</Text>
              </View>

              <View style={styles.heroContent}>
                <View style={styles.heroIconWrap}>
                  <FontAwesome name="key" size={44} color="#ffffff" />
                </View>
                <Text style={[styles.heroTitle, isHebrew && styles.rtlText]}>{resetT('title')}</Text>
                <Text style={[styles.heroSubtitle, isHebrew && styles.rtlText]}>
                  {isHebrew
                    ? 'זה השלב האחרון. בחרו סיסמה חדשה כדי לסיים את תהליך השחזור.'
                    : 'هذه المرحلة الأخيرة. اختر كلمة مرور جديدة لإكمال عملية الاسترجاع.'}
                </Text>
              </View>

              <View style={styles.processCard}>
                <Text style={[styles.processCardTitle, isHebrew && styles.rtlText]}>
                  {isHebrew ? 'איך זה עובד?' : 'كيف تتم العملية؟'}
                </Text>

                <View style={styles.verticalSteps}>
                  {stepItems.map((step, index) => {
                    const isActive = index === activeStepIndex;
                    const isCompleted = index < activeStepIndex;
                    const isFilled = isActive || isCompleted;

                    return (
                      <View key={step.title} style={styles.verticalStepItem}>
                        <View style={styles.verticalStepRail}>
                          <View
                            style={[
                              styles.verticalStepCircle,
                              isFilled && styles.verticalStepCircleActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.verticalStepNumber,
                                isFilled && styles.verticalStepNumberActive,
                              ]}
                            >
                              {index + 1}
                            </Text>
                          </View>

                          {index < stepItems.length - 1 && (
                            <View
                              style={[
                                styles.verticalStepLine,
                                isCompleted && styles.verticalStepLineActive,
                              ]}
                            />
                          )}
                        </View>

                        <View style={styles.verticalStepContent}>
                          <Text style={[styles.verticalStepTitle, isHebrew && styles.rtlText]}>
                            {step.title}
                          </Text>
                          <Text style={[styles.verticalStepText, isHebrew && styles.rtlText]}>
                            {step.text}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </LinearGradient>

            <View
              style={[
                styles.formContainer,
                isWideLayout ? styles.formContainerWide : styles.formContainerStacked,
              ]}
            >
              <View style={styles.formBadge}>
                <FontAwesome name="leaf" size={14} color="#27ae60" />
                <Text style={styles.formBadgeText}>i3dad / إعداد</Text>
              </View>

              <Text style={[styles.formTitle, isHebrew && styles.rtlText]}>{resetT('title')}</Text>
              <Text style={[styles.formLead, isHebrew && styles.rtlText]}>{resetT('subtitle')}</Text>

              {!!email && (
                <Text style={[styles.formEmail, isHebrew && styles.rtlText]}>{String(email).trim()}</Text>
              )}

              <View style={styles.infoBox}>
                <FontAwesome name="info-circle" size={18} color="#16a34a" />
                <Text style={[styles.infoText, isHebrew && styles.rtlText]}>{resetT('info')}</Text>
              </View>

              <CustomTextInput
                label={resetT('newPassword')}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                }}
                placeholder={resetT('newPassword')}
                icon="lock"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.password}
              />

              <CustomTextInput
                label={resetT('confirmPassword')}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: null }));
                  }
                }}
                placeholder={resetT('confirmPassword')}
                icon="lock"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.confirmPassword}
              />

              <CustomButton
                title={resetT('changePassword')}
                onPress={handleResetPassword}
                icon="check"
                loading={loading}
                disabled={loading}
              />

              <TouchableOpacity style={styles.backButton} onPress={() => navigateTo('login')}>
                <FontAwesome name="arrow-right" size={16} color="#64748b" />
                <Text style={[styles.backButtonText, isHebrew && styles.rtlText]}>
                  {resetT('backToLogin')}
                </Text>
              </TouchableOpacity>
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
    flex: 0.9,
    padding: 32,
    justifyContent: 'space-between',
  },
  heroPanelStacked: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 18,
  },
  heroOrbLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.10)',
    top: -90,
    right: -80,
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
    fontSize: 16,
    fontWeight: '900',
  },
  heroContent: {
    alignItems: 'center',
    justifyContent: 'center',
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
  processCard: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  processCardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 18,
  },
  verticalSteps: {
    gap: 14,
  },
  verticalStepItem: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    gap: 14,
  },
  verticalStepRail: {
    alignItems: 'center',
  },
  verticalStepCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  verticalStepCircleActive: {
    backgroundColor: '#16a34a',
    borderColor: '#dcfce7',
    shadowColor: '#0f5132',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  verticalStepNumber: {
    color: '#16a34a',
    fontSize: 18,
    fontWeight: '900',
  },
  verticalStepNumberActive: {
    color: '#ffffff',
  },
  verticalStepLine: {
    width: 2,
    flex: 1,
    minHeight: 30,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginVertical: 6,
  },
  verticalStepLineActive: {
    backgroundColor: '#dcfce7',
  },
  verticalStepContent: {
    flex: 1,
    paddingTop: 4,
  },
  verticalStepTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  verticalStepText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16.5,
    lineHeight: 21,
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
  },
  formContainerWide: {
    flex: 1.1,
    padding: 40,
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
    fontSize: 16,
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
    marginBottom: 10,
    fontSize: 16.5,
    lineHeight: 22,
    color: '#5f7268',
    textAlign: 'left',
  },
  formEmail: {
    marginBottom: 18,
    fontSize: 17,
    color: '#166534',
    fontWeight: '700',
    textAlign: 'left',
  },
  infoBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  infoText: {
    flex: 1,
    color: '#166534',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'right',
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 16,
  },
  backButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '700',
  },
  rtlText: {
    textAlign: 'right',
  },
});
