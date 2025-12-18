import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import CustomTextInput from '../../components/Form/CustomTextInput';
import { supabase } from '../../config/supabase';
import { validateEmail, validatePassword } from '../../utils/validation';

export default function PrincipalSetPasswordScreen({ navigateTo }) {
  // steps: email -> code -> password
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const token = useMemo(() => code.join(''), [code]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [timer, setTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  const { width: screenWidth } = useWindowDimensions();

  // ✅ Small, consistent boxes
  const BOX_GAP = 8;
  const FORM_HORIZONTAL_PADDING = 24; // must match styles.formContainer padding
  const availableRowWidth = screenWidth - FORM_HORIZONTAL_PADDING * 2 - BOX_GAP * 5;
  const boxSize = Math.max(44, Math.min(52, Math.floor(availableRowWidth / 6)));

  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => inputRefs.current[0]?.focus?.(), 200);
    }
  }, [step]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const showSupabaseError = (err, title = 'حدث خطأ') => {
    const status = err?.status ?? err?.statusCode ?? 'N/A';
    const code = err?.code ?? 'N/A';
    const message = err?.message ?? 'Unknown error';
    console.log('PRINCIPAL SET PASSWORD ERROR:', err);
    Alert.alert(title, `Status: ${status}\nCode: ${code}\n\n${message}`);
  };

  const validateEmailStep = () => {
    const newErrors = {};
    const v = validateEmail(email);
    if (!v.isValid) newErrors.email = v.error || 'بريد إلكتروني غير صحيح';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordStep = () => {
    const newErrors = {};
    const v = validatePassword(password);
    if (!v.isValid) newErrors.password = v.error || 'كلمة المرور غير صالحة';

    if (!confirmPassword) newErrors.confirmPassword = 'حقل مطلوب';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'كلمتا المرور غير متطابقتين';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // STEP 1: send code
  const handleSendCode = async () => {
    if (loading) return;
    if (!validateEmailStep()) return;

    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;

      setLoading(false);
      setEmail(cleanEmail);
      setStep('code');
      setTimer(60);

      Alert.alert('تم الإرسال ✅', 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.');
    } catch (err) {
      setLoading(false);

      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('too many requests') || String(err?.status) === '429') {
        Alert.alert('طلبات كثيرة', 'انتظر قليلاً (2–5 دقائق) ثم حاول مرة واحدة فقط.');
        return;
      }

      showSupabaseError(err);
    }
  };

  // STEP 2: verify code
  const handleVerifyCode = async () => {
    if (loading) return;

    if (!email) {
      Alert.alert('خطأ', 'البريد الإلكتروني غير موجود.');
      setStep('email');
      return;
    }

    if (token.length !== 6 || code.some((d) => d === '')) {
      Alert.alert('خطأ', 'الرجاء إدخال رمز مكوّن من 6 أرقام.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });
      if (error) throw error;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        throw new Error('لم يتم إنشاء جلسة بعد التحقق. حاول مرة أخرى.');
      }

      setLoading(false);
      setStep('password');
      Alert.alert('تم التحقق ✅', 'الآن قم بإنشاء كلمة مرور جديدة.');
    } catch (err) {
      setLoading(false);

      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('expired')) {
        Alert.alert('انتهت صلاحية الرمز', 'أعد إرسال الرمز وحاول مرة أخرى.');
        return;
      }

      showSupabaseError(err);
    }
  };

  // Resend code
  const handleResend = async () => {
    if (resendLoading) return;
    if (timer > 0) return;

    if (!email) {
      Alert.alert('خطأ', 'البريد الإلكتروني غير موجود.');
      setStep('email');
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      setResendLoading(false);
      setCode(['', '', '', '', '', '']);
      setTimer(60);
      setTimeout(() => inputRefs.current[0]?.focus?.(), 200);

      Alert.alert('تم الإرسال ✅', 'تم إعادة إرسال الرمز.');
    } catch (err) {
      setResendLoading(false);
      showSupabaseError(err);
    }
  };

  // STEP 3: set password
  const handleSavePassword = async () => {
    if (loading) return;
    if (!validatePasswordStep()) return;

    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData?.session) {
        setLoading(false);
        Alert.alert('خطأ', 'لا توجد جلسة. ارجع وتحقق من الرمز مرة أخرى.');
        setStep('code');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();

      setLoading(false);
      Alert.alert('تم بنجاح ✅', 'تم تعيين كلمة المرور. يمكنك تسجيل الدخول الآن.', [
        { text: 'تسجيل الدخول', onPress: () => navigateTo('login') },
      ]);
    } catch (err) {
      setLoading(false);
      showSupabaseError(err);
    }
  };

  // Code input helpers
  const setDigit = (index, value) => {
    setCode((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleCodeChange = (text, index) => {
    const cleaned = String(text || '').replace(/\s/g, '');
    if (!cleaned) {
      setDigit(index, '');
      return;
    }
    if (!/^\d+$/.test(cleaned)) return;

    // Paste (allow more than 1, take first 6)
    if (cleaned.length >= 6) {
      setCode(cleaned.slice(0, 6).split(''));
      inputRefs.current[5]?.focus?.();
      return;
    }

    setDigit(index, cleaned.slice(-1));
    if (index < 5) inputRefs.current[index + 1]?.focus?.();
  };

  const handleKeyPress = (e, index) => {
    if (e?.nativeEvent?.key === 'Backspace') {
      if (code[index]) {
        setDigit(index, '');
        return;
      }
      if (index > 0) {
        inputRefs.current[index - 1]?.focus?.();
        setDigit(index - 1, '');
      }
    }
  };

  // UI
  const headerTitle =
    step === 'email' ? 'تعيين كلمة المرور للمدير' : step === 'code' ? 'تحقق من الرمز' : 'إنشاء كلمة مرور';

  const headerSub =
    step === 'email'
      ? 'أدخل البريد الذي أضافه لك الأدمن'
      : step === 'code'
      ? 'أدخل الرمز المكوّن من 6 أرقام'
      : 'اختر كلمة مرور جديدة ثم أكدها';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#27ae60', '#2ecc71']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.logoContainer}>
            <FontAwesome name={step === 'password' ? 'key' : 'shield'} size={60} color="#fff" />
          </View>
          <Text style={styles.title}>{headerTitle}</Text>
          <Text style={styles.subtitle}>{headerSub}</Text>
          {!!email && step !== 'email' && <Text style={styles.email}>{email}</Text>}
        </LinearGradient>

        <View style={styles.formContainer}>
          {step === 'email' && (
            <>
              <CustomTextInput
                label="البريد الإلكتروني"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((p) => ({ ...p, email: null }));
                }}
                placeholder="example@gmail.com"
                icon="envelope"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
              />

              <CustomButton title="إرسال الرمز" onPress={handleSendCode} icon="paper-plane" loading={loading} />

              <TouchableOpacity style={styles.smallLink} onPress={() => navigateTo('login')}>
                <Text style={styles.smallLinkText}>رجوع لتسجيل الدخول</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'code' && (
            <>
              <View style={[styles.codeContainer, { gap: BOX_GAP }]}>
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[
                      styles.codeInput,
                      { width: boxSize, height: boxSize },
                      digit && styles.codeInputFilled,
                    ]}
                    value={digit}
                    onChangeText={(text) => handleCodeChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                    maxLength={index === 0 ? 6 : 1} // ✅ allow paste only in first box
                    selectTextOnFocus
                    returnKeyType="done"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                  />
                ))}
              </View>

              <CustomButton title="تحقق" onPress={handleVerifyCode} icon="check-circle" loading={loading} />

              <View style={styles.resendContainer}>
                {timer > 0 ? (
                  <Text style={styles.timerText}>{`إعادة الإرسال بعد ${timer} ثانية`}</Text>
                ) : (
                  <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
                    <Text style={styles.resendText}>{resendLoading ? 'جارٍ الإرسال...' : 'إعادة إرسال الرمز'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.rowLinks}>
                <TouchableOpacity onPress={() => setStep('email')}>
                  <Text style={styles.smallLinkText}>تغيير البريد</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigateTo('forgotPassword', { email })}>
                  <Text style={styles.smallLinkText}>لم يصلك الرمز؟ استخدم الاستعادة</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'password' && (
            <>
              <CustomTextInput
                label="كلمة المرور الجديدة"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((p) => ({ ...p, password: null }));
                }}
                placeholder="أدخل كلمة المرور الجديدة"
                icon="lock"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.password}
              />

              <CustomTextInput
                label="تأكيد كلمة المرور"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: null }));
                }}
                placeholder="أعد إدخال كلمة المرور"
                icon="lock"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.confirmPassword}
              />

              <CustomButton title="حفظ كلمة المرور" onPress={handleSavePassword} icon="check" loading={loading} />

              <TouchableOpacity style={styles.smallLink} onPress={() => setStep('code')}>
                <Text style={styles.smallLinkText}>رجوع للرمز</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1 },

  header: { paddingTop: 60, paddingBottom: 34, paddingHorizontal: 20, alignItems: 'center' },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#fff', opacity: 0.92, textAlign: 'center' },
  email: { marginTop: 10, fontSize: 14, color: '#fff', fontWeight: '800', textAlign: 'center' },

  formContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -18,
  },

  // ✅ center + fixed-size boxes
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  codeInputFilled: { borderColor: '#27ae60', backgroundColor: '#f0fdf4' },

  resendContainer: { alignItems: 'center', marginTop: 14, marginBottom: 8 },
  timerText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
  resendText: { color: '#27ae60', fontSize: 16, fontWeight: '900' },

  smallLink: { alignItems: 'center', marginTop: 14 },
  smallLinkText: { color: '#64748b', fontSize: 13, fontWeight: '800' },

  rowLinks: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
});
