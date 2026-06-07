import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import CustomButton from '../../components/Form/CustomButton';
import { supabase } from '../../config/supabase';
import { sendPasswordResetCode } from '../../services/passwordResetService';

export default function VerifyCodeScreen({ navigateTo, email }) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef([]);
  const verifyAttemptRef = useRef(false);

  const isHebrew = String(i18n?.language || '').toLowerCase().startsWith('he');
  const isWideLayout = width >= 1040;
  const activeStepIndex = 1;
  const fallbackText = {
    title: 'التحقق من الرمز',
    subtitle: 'أدخل الرمز المكوّن من 6 أرقام الذي وصل إلى بريدك.',
    verify: 'تحقق',
    formTitle: 'أدخل رمز التحقق',
    back: 'رجوع',
    resend: 'إعادة إرسال الرمز',
    sending: 'جاري الإرسال...',
    resendAfter: ({ seconds }) => `إعادة الإرسال بعد ${seconds} ثانية`,
    'errors.missingEmail': 'البريد الإلكتروني غير موجود.',
    'errors.need6Digits': 'الرجاء إدخال رمز مكوّن من 6 أرقام.',
    'alerts.verifiedTitle': 'تم التحقق',
    'alerts.verifiedMessage': 'يمكنك الآن تعيين كلمة مرور جديدة.',
    'alerts.expiredTitle': 'انتهت صلاحية الرمز',
    'alerts.expiredMessage': 'أعد إرسال الرمز وحاول مرة أخرى.',
  };
  const verifyT = (key, options) => {
    const scoped = t(`verifyCode.${key}`, { ns: 'auth', ...(options || {}) });
    if (typeof scoped !== 'string' || scoped === `verifyCode.${key}`) {
      const fallback = fallbackText[key];
      return typeof fallback === 'function' ? fallback(options || {}) : fallback || key;
    }
    return scoped;
  };

  const cleanEmail = String(email || '').trim().toLowerCase();
  const token = useMemo(() => code.join(''), [code]);
  const isComplete = useMemo(
    () => code.every((digit) => digit !== '') && token.length === 6,
    [code, token]
  );

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

  useEffect(() => {
    const focusTimer = setTimeout(() => inputRefs.current[0]?.focus?.(), 200);

    const interval = setInterval(() => {
      setTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      clearTimeout(focusTimer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isComplete || loading || verifyAttemptRef.current) return;
    handleVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  const setDigit = (index, value) => {
    setCode((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleChange = (text, index) => {
    const cleaned = String(text || '').replace(/\s/g, '');
    if (!cleaned) {
      setDigit(index, '');
      return;
    }

    if (!/^\d+$/.test(cleaned)) return;

    if (cleaned.length >= 6) {
      const nextCode = cleaned.slice(0, 6).split('');
      setCode(nextCode);
      inputRefs.current[5]?.focus?.();
      return;
    }

    setDigit(index, cleaned.slice(-1));
    if (index < 5) inputRefs.current[index + 1]?.focus?.();
  };

  const handleKeyPress = (event, index) => {
    if (event?.nativeEvent?.key !== 'Backspace') return;

    if (code[index]) {
      setDigit(index, '');
      return;
    }

    if (index > 0) {
      inputRefs.current[index - 1]?.focus?.();
      setDigit(index - 1, '');
    }
  };

  const showSupabaseError = (err) => {
    const status = err?.status ?? err?.statusCode ?? 'N/A';
    const errorCode = err?.code ?? 'N/A';
    const message = err?.message ?? 'Unknown error';

    Alert.alert(isHebrew ? 'אירעה שגיאה' : 'حدث خطأ', `Status: ${status}\nCode: ${errorCode}\n\n${message}`);
  };

  const handleVerify = async () => {
    if (loading || verifyAttemptRef.current) return;

    if (!cleanEmail) {
      Alert.alert(isHebrew ? 'שגיאה' : 'خطأ', verifyT('errors.missingEmail'));
      return;
    }

    if (token.length !== 6) {
      Alert.alert(isHebrew ? 'שגיאה' : 'خطأ', verifyT('errors.need6Digits'));
      return;
    }

    verifyAttemptRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: 'recovery',
      });

      if (error) throw error;

      const activeSession = data?.session || (await supabase.auth.getSession()).data?.session;
      if (!activeSession) {
        throw new Error(
          isHebrew
            ? 'לא נוצרה הפעלה לאחר האימות. נסו שוב.'
            : 'لم يتم إنشاء جلسة بعد التحقق. حاول مرة أخرى.'
        );
      }

      setLoading(false);
      verifyAttemptRef.current = false;
      navigateTo('resetPassword', { email: cleanEmail });
      Alert.alert(verifyT('alerts.verifiedTitle'), verifyT('alerts.verifiedMessage'));
    } catch (err) {
      setLoading(false);
      verifyAttemptRef.current = false;

      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('expired') || msg.includes('invalid') || msg.includes('otp')) {
        Alert.alert(verifyT('alerts.expiredTitle'), verifyT('alerts.expiredMessage'));
        return;
      }

      showSupabaseError(err);
    }
  };

  const handleResend = async () => {
    if (resendLoading || timer > 0) return;

    if (!cleanEmail) {
      Alert.alert(isHebrew ? 'שגיאה' : 'خطأ', verifyT('errors.missingEmail'));
      return;
    }

    setResendLoading(true);
    try {
      const result = await sendPasswordResetCode(cleanEmail, i18n?.language || 'ar');
      if (!result.success) throw result.error;

      setResendLoading(false);
      verifyAttemptRef.current = false;
      setCode(['', '', '', '', '', '']);
      setTimer(60);
      setTimeout(() => inputRefs.current[0]?.focus?.(), 200);
      Alert.alert(
        isHebrew ? 'נשלח ✅' : 'تم الإرسال ✅',
        isHebrew
          ? 'נשלח אליך קוד אימות חדש לאימייל.'
          : 'تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني.'
      );
    } catch (err) {
      setResendLoading(false);

      const msg = String(err?.message || '').toLowerCase();
      if (
        msg.includes('too many requests') ||
        msg.includes('rate limit') ||
        String(err?.status) === '429'
      ) {
        Alert.alert(
          isHebrew ? 'יותר מדי בקשות' : 'طلبات كثيرة',
          isHebrew
            ? 'המתן/י 2–5 דקות ונסה/י שוב פעם אחת בלבד.'
            : 'انتظر 2–5 دقائق ثم حاول مرة واحدة فقط.'
        );
        return;
      }

      showSupabaseError(err);
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
                  <FontAwesome name="shield" size={44} color="#ffffff" />
                </View>
                <Text style={[styles.heroTitle, isHebrew && styles.rtlText]}>{verifyT('title')}</Text>
                <Text style={[styles.heroSubtitle, isHebrew && styles.rtlText]}>
                  {isHebrew
                    ? 'זה שלב האימות. הזינו את הקוד שקיבלתם כדי לעבור להגדרת סיסמה חדשה.'
                    : 'هذه مرحلة التحقق. أدخل الرمز الذي وصلك للانتقال إلى تعيين كلمة مرور جديدة.'}
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

              <Text style={[styles.formTitle, isHebrew && styles.rtlText]}>{verifyT('formTitle')}</Text>
              <Text style={[styles.formLead, isHebrew && styles.rtlText]}>{verifyT('subtitle')}</Text>
              <Text style={[styles.formEmail, isHebrew && styles.rtlText]}>{cleanEmail || email}</Text>

              <View style={styles.codeContainer}>
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[styles.codeInput, digit && styles.codeInputFilled]}
                    value={digit}
                    onChangeText={(text) => handleChange(text, index)}
                    onKeyPress={(event) => handleKeyPress(event, index)}
                    keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                    maxLength={index === 0 ? 6 : 1}
                    selectTextOnFocus
                    returnKeyType="done"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    textAlign="center"
                  />
                ))}
              </View>

              <CustomButton
                title={verifyT('verify')}
                onPress={handleVerify}
                icon="check-circle"
                loading={loading}
                disabled={loading}
              />

              <View style={styles.resendContainer}>
                {timer > 0 ? (
                  <Text style={[styles.timerText, isHebrew && styles.rtlText]}>
                    {verifyT('resendAfter', { seconds: timer })}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
                    <Text style={[styles.resendText, isHebrew && styles.rtlText]}>
                      {resendLoading ? verifyT('sending') : verifyT('resend')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigateTo('forgotPassword', { email: cleanEmail })}
              >
                <FontAwesome name="arrow-right" size={16} color="#64748b" />
                <Text style={[styles.backButtonText, isHebrew && styles.rtlText]}>
                  {verifyT('back')}
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
    marginBottom: 24,
    fontSize: 17,
    color: '#166534',
    fontWeight: '700',
    textAlign: 'left',
  },
  codeContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 26,
    flexWrap: 'nowrap',
  },
  codeInput: {
    width: 56,
    height: 60,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d7e6dc',
    backgroundColor: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    color: '#183b2b',
    outlineStyle: 'none',
  },
  codeInputFilled: {
    borderColor: '#27ae60',
    backgroundColor: '#f0fdf4',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  timerText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  resendText: {
    color: '#16a34a',
    fontSize: 17,
    fontWeight: '800',
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
