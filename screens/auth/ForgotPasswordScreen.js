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
} from 'react-native';
import CustomButton from '../../components/Form/CustomButton';
import CustomTextInput from '../../components/Form/CustomTextInput';
import { supabase } from '../../config/supabase';
import { validateEmail } from '../../utils/validation';

export default function ForgotPasswordScreen({ navigateTo }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    const emailValidation = validateEmail(email);

    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showSupabaseError = (err) => {
    const status = err?.status ?? err?.statusCode ?? 'N/A';
    const code = err?.code ?? 'N/A';
    const message = err?.message ?? 'Unknown error';

    // Console (for dev)
    console.log('FORGOT PASSWORD ERROR:', err);

    // Popup (fast)
    Alert.alert('حدث خطأ', `Status: ${status}\nCode: ${code}\n\n${message}`);
  };

  const handleSendRecoveryCode = async () => {
    if (loading) return; // يمنع الضغط المتكرر (سبب 429 غالباً)
    if (!validateForm()) return;

    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      // ✅ هذا الصحيح لاسترجاع كلمة المرور (Reset password template في Supabase)
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;

      setLoading(false);

      Alert.alert(
        'تم الإرسال ✅',
        'تم إرسال رمز مكوّن من 6 أرقام إلى بريدك الإلكتروني لإعادة تعيين كلمة المرور.\nافتح الرسالة وأدخل الرمز في الصفحة التالية.',
        [
          {
            text: 'متابعة',
            onPress: () => navigateTo('verifyCode', { email: cleanEmail }),
          },
        ]
      );
    } catch (err) {
      setLoading(false);

      const msg = String(err?.message || '').toLowerCase();
      if (
        msg.includes('too many requests') ||
        msg.includes('rate limit') ||
        String(err?.status) === '429'
      ) {
        Alert.alert(
          'تم إرسال طلبات كثيرة',
          'حصل تقييد مؤقت (429).\nانتظر 2–5 دقائق ثم حاول مرة واحدة فقط.'
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
          colors={['#27ae60', '#2ecc71']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.logoContainer}>
            <FontAwesome name="lock" size={60} color="#fff" />
          </View>

          <Text style={styles.title}>نسيت كلمة المرور؟</Text>
          <Text style={styles.subtitle}>أدخل بريدك الإلكتروني لإرسال رمز إعادة التعيين</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <View style={styles.infoBox}>
            <FontAwesome name="info-circle" size={20} color="#27ae60" />
            <Text style={styles.infoText}>
              أدخل بريدك الإلكتروني وسنرسل لك رمزاً مكوّناً من 6 أرقام لإعادة تعيين كلمة المرور.
            </Text>
          </View>

          <CustomTextInput
            label="البريد الإلكتروني"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: null });
            }}
            placeholder="example@gmail.com"
            icon="envelope"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
          />

          <CustomButton
            title="إرسال الرمز"
            onPress={handleSendRecoveryCode}
            icon="paper-plane"
            loading={loading}
            disabled={loading}
          />

          <TouchableOpacity style={styles.backButton} onPress={() => navigateTo('login')}>
            <FontAwesome name="arrow-right" size={16} color="#64748b" />
            <Text style={styles.backButtonText}>رجوع لتسجيل الدخول</Text>
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
    paddingBottom: 40,
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
    marginBottom: 20,
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
    paddingHorizontal: 20,
  },

  formContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  infoText: {
    flex: 1,
    color: '#166534',
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '700',
  },
});
