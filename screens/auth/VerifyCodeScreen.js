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
import { supabase } from '../../config/supabase';

export default function VerifyCodeScreen({ navigateTo, email }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef([]);

  const { width: screenWidth } = useWindowDimensions();

  const token = useMemo(() => code.join(''), [code]);
  const isComplete = useMemo(() => code.every((d) => d !== '') && token.length === 6, [code, token]);

  // ✅ Small, consistent boxes
  const BOX_GAP = 8;
  const FORM_HORIZONTAL_PADDING = 24;
  const ROW_SIDE_PADDING = 0; // inside formContainer already padded
  const availableRowWidth =
    screenWidth - FORM_HORIZONTAL_PADDING * 2 - ROW_SIDE_PADDING * 2 - BOX_GAP * 5;

  // clamp size (small on phones, never huge on tablets)
  const boxSize = Math.max(44, Math.min(52, Math.floor(availableRowWidth / 6)));

  // Focus first input + timer
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus?.(), 200);

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto verify when complete
  useEffect(() => {
    if (isComplete) handleVerify();
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

    // Paste 6 digits
    if (cleaned.length >= 6) {
      const arr = cleaned.slice(0, 6).split('');
      setCode(arr);
      inputRefs.current[5]?.focus?.();
      return;
    }

    // Single digit
    const digit = cleaned.slice(-1);
    setDigit(index, digit);

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

  const showSupabaseError = (err) => {
    const status = err?.status ?? err?.statusCode ?? 'N/A';
    const code = err?.code ?? 'N/A';
    const message = err?.message ?? 'Unknown error';
    console.log('VERIFY CODE ERROR:', err);
    Alert.alert('حدث خطأ', `Status: ${status}\nCode: ${code}\n\n${message}`);
  };

  const handleVerify = async () => {
    if (loading) return;

    if (!email) {
      Alert.alert('خطأ', 'البريد الإلكتروني غير موجود. ارجع للصفحة السابقة.');
      return;
    }

    if (token.length !== 6) {
      Alert.alert('خطأ', 'الرجاء إدخال رمز مكوّن من 6 أرقام.');
      return;
    }

    setLoading(true);
    try {
      // ✅ الأهم: recovery وليس email
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });

      if (error) throw error;

      // تأكيد وجود Session بعد التحقق
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        throw new Error('لم يتم إنشاء جلسة بعد التحقق. أعد المحاولة.');
      }

      setLoading(false);

      Alert.alert(
        'تم التحقق ✅',
        'تم التحقق من الرمز بنجاح. الآن قم بتعيين كلمة مرور جديدة.',
        [{ text: 'متابعة', onPress: () => navigateTo('resetPassword', { email }) }]
      );
    } catch (err) {
      setLoading(false);

      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('expired')) {
        Alert.alert('انتهت صلاحية الرمز', 'الرمز انتهت صلاحيته. أعد إرسال الرمز وحاول مرة أخرى.');
        return;
      }

      showSupabaseError(err);
    }
  };

  const handleResend = async () => {
    if (resendLoading) return;

    if (!email) {
      Alert.alert('خطأ', 'البريد الإلكتروني غير موجود.');
      return;
    }

    if (timer > 0) return;

    setResendLoading(true);
    try {
      // ✅ إعادة إرسال كود الاستعادة الصحيح
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      if (error) throw error;

      setResendLoading(false);

      setCode(['', '', '', '', '', '']);
      setTimer(60);
      setTimeout(() => inputRefs.current[0]?.focus?.(), 200);

      Alert.alert('تم الإرسال ✅', 'تم إعادة إرسال رمز مكوّن من 6 أرقام إلى بريدك الإلكتروني.');
    } catch (err) {
      setResendLoading(false);

      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('too many requests') || msg.includes('rate limit') || String(err?.status) === '429') {
        Alert.alert('تم إرسال طلبات كثيرة', 'انتظر قليلاً (2–5 دقائق) ثم حاول مرة واحدة فقط.');
        return;
      }

      showSupabaseError(err);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#27ae60', '#2ecc71']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.logoContainer}>
            <FontAwesome name="shield" size={60} color="#fff" />
          </View>

          <Text style={styles.title}>التحقق من الرمز</Text>
          <Text style={styles.subtitle}>أدخل الرمز المكوّن من 6 أرقام الذي تم إرساله إلى بريدك</Text>
          <Text style={styles.email}>{email}</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
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
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                maxLength={index === 0 ? 6 : 1} // ✅ paste allowed in first box, others single digit
                selectTextOnFocus
                returnKeyType="done"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
              />
            ))}
          </View>

          <CustomButton title="تحقق" onPress={handleVerify} icon="check-circle" loading={loading} />

          <View style={styles.resendContainer}>
            {timer > 0 ? (
              <Text style={styles.timerText}>{`إعادة الإرسال بعد ${timer} ثانية`}</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
                <Text style={styles.resendText}>{resendLoading ? 'جارٍ الإرسال...' : 'إعادة إرسال الرمز'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.backButton} onPress={() => navigateTo('forgotPassword')}>
            <FontAwesome name="arrow-right" size={16} color="#64748b" />
            <Text style={styles.backButtonText}>رجوع</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1 },

  header: {
    paddingTop: 60,
    paddingBottom: 34,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#fff',
    opacity: 0.92,
    textAlign: 'center',
    marginBottom: 6,
  },
  email: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },

  formContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -18,
  },

  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // ✅ keep row tight
    alignItems: 'center',
    marginBottom: 26,
  },
  codeInput: {
    // ❌ removed flex:1 so it won't expand
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  codeInputFilled: {
    borderColor: '#27ae60',
    backgroundColor: '#f0fdf4',
  },

  resendContainer: { alignItems: 'center', marginTop: 18, marginBottom: 12 },
  timerText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
  resendText: { color: '#27ae60', fontSize: 16, fontWeight: '900' },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  backButtonText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
});
