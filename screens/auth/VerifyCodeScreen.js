import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/Form/CustomButton';
import { supabase } from '../../config/supabase';

export default function VerifyCodeScreen({ navigateTo, email }) {
  const { t } = useTranslation();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }

    // Start countdown timer
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCodeChange = (text, index) => {
    // Only allow numbers
    if (text && !/^\d+$/.test(text)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const verificationCode = code.join('');

    if (verificationCode.length !== 6) {
      Alert.alert(t('common.error'), t('auth.verifyCode.errors.incompleteCode'));
      return;
    }

    setLoading(true);

    try {
      // Verify the OTP token
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: verificationCode,
        type: 'recovery',
      });

      setLoading(false);

      if (error) {
        throw error;
      }

      // If verification successful, navigate to reset password
      Alert.alert(
        t('auth.verifyCode.success.title'),
        t('auth.verifyCode.success.message'),
        [
          {
            text: t('common.confirm'),
            onPress: () => navigateTo('resetPassword', { email }),
          },
        ]
      );
    } catch (error) {
      setLoading(false);
      let errorMessage = t('auth.verifyCode.errors.invalidCode');
      
      if (error.message.includes('expired')) {
        errorMessage = t('auth.verifyCode.errors.expiredCode');
      }

      Alert.alert(t('common.error'), errorMessage);
    }
  };

  const handleResendCode = async () => {
    if (timer > 0) {
      return;
    }

    setResendLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://your-app-url.com/reset-password',
      });

      setResendLoading(false);

      if (error) {
        throw error;
      }

      // Reset timer
      setTimer(60);
      Alert.alert(t('auth.forgotPassword.success.title'), t('auth.forgotPassword.success.message'));
    } catch (error) {
      setResendLoading(false);
      Alert.alert(t('common.error'), t('auth.verifyCode.errors.resendError'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#27ae60', '#2ecc71']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.logoContainer}>
            <FontAwesome name="shield" size={60} color="#fff" />
          </View>
          <Text style={styles.title}>{t('auth.verifyCode.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.verifyCode.subtitle')}
          </Text>
          <Text style={styles.email}>{email}</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.codeInput,
                  digit && styles.codeInputFilled,
                ]}
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>

          <CustomButton
            title={t('auth.verifyCode.verifyButton')}
            onPress={handleVerifyCode}
            icon="check-circle"
            loading={loading}
          />

          <View style={styles.resendContainer}>
            {timer > 0 ? (
              <Text style={styles.timerText}>
                {t('auth.verifyCode.resendTimer', { seconds: timer })}
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={resendLoading}
              >
                <Text style={styles.resendText}>
                  {resendLoading ? t('auth.verifyCode.resending') : t('auth.verifyCode.resendCode')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigateTo('forgotPassword')}
          >
            <FontAwesome name="arrow-right" size={16} color="#64748b" />
            <Text style={styles.backButtonText}>{t('auth.verifyCode.back')}</Text>
          </TouchableOpacity>
        </View>
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
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 60,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  codeInputFilled: {
    borderColor: '#27ae60',
    backgroundColor: '#f0fdf4',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  timerText: {
    color: '#64748b',
    fontSize: 14,
  },
  resendText: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: '600',
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
  },
});
