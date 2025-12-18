import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
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
import { validatePassword } from '../../utils/validation';

export default function ChangePasswordScreen({ navigateTo }) {
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Load current user email
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        Alert.alert('خطأ', error.message || 'فشل تحميل بيانات المستخدم');
        return;
      }
      setEmail(data?.user?.email || '');
      if (!data?.user) {
        Alert.alert('تنبيه', 'يجب تسجيل الدخول أولاً.');
        navigateTo('login');
      }
    })();
  }, [navigateTo]);

  const validateForm = () => {
    const newErrors = {};

    if (!oldPassword) newErrors.oldPassword = 'حقل مطلوب';

    const passVal = validatePassword(newPassword);
    if (!passVal.isValid) newErrors.newPassword = passVal.error || 'كلمة المرور غير صالحة';

    if (!confirmNewPassword) newErrors.confirmNewPassword = 'حقل مطلوب';
    else if (newPassword !== confirmNewPassword) newErrors.confirmNewPassword = 'كلمتا المرور غير متطابقتين';

    // optional: prevent same as old
    if (oldPassword && newPassword && oldPassword === newPassword) {
      newErrors.newPassword = 'اختر كلمة مرور جديدة مختلفة عن القديمة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showSupabaseError = (err, title = 'حدث خطأ') => {
    const status = err?.status ?? err?.statusCode ?? 'N/A';
    const code = err?.code ?? 'N/A';
    const message = err?.message ?? 'Unknown error';
    console.log('CHANGE PASSWORD ERROR:', err);
    Alert.alert(title, `Status: ${status}\nCode: ${code}\n\n${message}`);
  };

  const handleChangePassword = async () => {
    if (loading) return;
    if (!validateForm()) return;

    if (!email) {
      Alert.alert('خطأ', 'لا يوجد بريد للمستخدم الحالي.');
      return;
    }

    setLoading(true);

    try {
      // ✅ 1) Re-authenticate by signing in with email + old password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: oldPassword,
      });

      if (signInError) {
        setLoading(false);

        // Old password is wrong or account issue
        Alert.alert(
          'كلمة المرور القديمة غير صحيحة',
          'إذا نسيت كلمة المرور، يمكنك استعادتها عبر البريد الإلكتروني.',
          [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'استعادة كلمة المرور', onPress: () => navigateTo('forgotPassword', { email }) },
          ]
        );
        return;
      }

      if (!signInData?.session) {
        throw new Error('لم يتم إنشاء جلسة بعد إعادة التحقق.');
      }

      // ✅ 2) Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setLoading(false);

      Alert.alert('تم بنجاح ✅', 'تم تغيير كلمة المرور بنجاح.', [
        { text: 'حسناً', onPress: () => navigateTo('profile') }, // غيّرها للصفحة المناسبة عندك
      ]);
    } catch (err) {
      setLoading(false);
      showSupabaseError(err);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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

          <Text style={styles.title}>تغيير كلمة المرور</Text>
          <Text style={styles.subtitle}>أدخل كلمة المرور القديمة ثم اختر كلمة مرور جديدة</Text>
          {!!email && <Text style={styles.email}>{email}</Text>}
        </LinearGradient>

        <View style={styles.formContainer}>
          <View style={styles.infoBox}>
            <FontAwesome name="info-circle" size={20} color="#27ae60" />
            <Text style={styles.infoText}>
              إذا نسيت كلمة المرور القديمة، استخدم خيار “استعادة كلمة المرور”.
            </Text>
          </View>

          <CustomTextInput
            label="كلمة المرور القديمة"
            value={oldPassword}
            onChangeText={(text) => {
              setOldPassword(text);
              if (errors.oldPassword) setErrors((p) => ({ ...p, oldPassword: null }));
            }}
            placeholder="أدخل كلمة المرور القديمة"
            icon="lock"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.oldPassword}
          />

          <CustomTextInput
            label="كلمة المرور الجديدة"
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (errors.newPassword) setErrors((p) => ({ ...p, newPassword: null }));
            }}
            placeholder="أدخل كلمة المرور الجديدة"
            icon="lock"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.newPassword}
          />

          <CustomTextInput
            label="تأكيد كلمة المرور الجديدة"
            value={confirmNewPassword}
            onChangeText={(text) => {
              setConfirmNewPassword(text);
              if (errors.confirmNewPassword) setErrors((p) => ({ ...p, confirmNewPassword: null }));
            }}
            placeholder="أعد إدخال كلمة المرور الجديدة"
            icon="lock"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.confirmNewPassword}
          />

          <CustomButton
            title="تغيير كلمة المرور"
            onPress={handleChangePassword}
            icon="check"
            loading={loading}
            disabled={loading}
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigateTo('forgotPassword', { email })}
          >
            <Text style={styles.forgotText}>نسيت كلمة المرور؟ استعادة عبر البريد</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => navigateTo('profile')}>
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

  header: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 20, alignItems: 'center' },
  logoContainer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#fff', opacity: 0.92, textAlign: 'center' },
  email: { marginTop: 10, fontSize: 14, color: '#fff', fontWeight: '700', textAlign: 'center', opacity: 0.95 },

  formContainer: {
    flex: 1, padding: 24, backgroundColor: '#fff',
    borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -20,
  },
  infoBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16, borderRadius: 12, marginBottom: 18,
    gap: 12, borderWidth: 1, borderColor: '#86efac',
  },
  infoText: { flex: 1, color: '#166534', fontSize: 14, lineHeight: 20, textAlign: 'right', fontWeight: '700' },

  forgotBtn: { marginTop: 12, alignItems: 'center' },
  forgotText: { color: '#27ae60', fontSize: 14, fontWeight: '900' },

  backButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginTop: 14 },
  backButtonText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
});
