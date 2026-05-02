import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

const initialForm = {
  fullName: '',
  phone: '',
  schoolName: '',
  schoolId: '',
};

export default function PrincipalOnboardingScreen({ navigateTo }) {
  const { user, refreshUserData } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadPrincipal = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('principals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        Alert.alert('تعذر تحميل البيانات', error.message);
      } else if (data) {
        setForm({
          fullName: data.full_name && data.full_name !== user.email ? data.full_name : '',
          phone: data.phone || '',
          schoolName: data.school_name === 'Pending setup' ? '' : data.school_name || '',
          schoolId: data.school_id || '',
        });
      }

      setLoading(false);
    };

    loadPrincipal();
    return () => {
      mounted = false;
    };
  }, [user?.id, user?.email]);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const saveProfile = async () => {
    const fullName = form.fullName.trim();
    const schoolName = form.schoolName.trim();

    if (!fullName || !schoolName) {
      Alert.alert('بيانات ناقصة', 'اسم المدير واسم المدرسة حقول مطلوبة.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('كلمة مرور قصيرة', 'اكتب كلمة مرور من 6 أحرف على الأقل.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('كلمة المرور غير متطابقة', 'تأكد من كتابة نفس كلمة المرور مرتين.');
      return;
    }

    setSaving(true);
    const { error: passwordError } = await supabase.auth.updateUser({ password });

    if (passwordError) {
      setSaving(false);
      Alert.alert('تعذر حفظ كلمة المرور', passwordError.message);
      return;
    }

    const { error } = await supabase
      .from('principals')
      .update({
        full_name: fullName,
        phone: form.phone.trim() || null,
        school_name: schoolName,
        school_id: form.schoolId.trim() || null,
        is_active: true,
      })
      .eq('user_id', user.id);

    if (error) {
      setSaving(false);
      Alert.alert('تعذر الحفظ', error.message);
      return;
    }

    await refreshUserData?.(user);
    setSaving(false);
    Alert.alert('تم الحفظ', 'تم تجهيز حساب المدير بنجاح.', [
      { text: 'دخول لوحة المدير', onPress: () => navigateTo('principalDashboard') },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0f766e" />
        <Text style={styles.loadingText}>جاري تجهيز الدعوة...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={['#0f766e', '#14b8a6']} style={styles.hero}>
        <View style={styles.heroIcon}>
          <FontAwesome name="id-badge" size={30} color="#fff" />
        </View>
        <Text style={styles.title}>إكمال حساب المدير</Text>
        <Text style={styles.subtitle}>أدخل بياناتك الخاصة حتى يتم ربط لوحة الإدارة بمدرستك.</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </LinearGradient>

      <View style={styles.form}>
        <Field
          label="اسم المدير"
          value={form.fullName}
          onChangeText={(value) => updateField('fullName', value)}
          placeholder="اكتب الاسم الكامل"
        />
        <Field
          label="رقم الهاتف"
          value={form.phone}
          onChangeText={(value) => updateField('phone', value)}
          placeholder="اختياري"
          keyboardType="phone-pad"
        />
        <Field
          label="اسم المدرسة"
          value={form.schoolName}
          onChangeText={(value) => updateField('schoolName', value)}
          placeholder="اكتب اسم المدرسة"
        />
        <Field
          label="معرف المدرسة"
          value={form.schoolId}
          onChangeText={(value) => updateField('schoolId', value)}
          placeholder="اختياري إذا كان غير معروف"
        />
        <Field
          label="كلمة المرور"
          value={password}
          onChangeText={setPassword}
          placeholder="اكتب كلمة مرور جديدة"
          secureTextEntry
        />
        <Field
          label="تأكيد كلمة المرور"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="أعد كتابة كلمة المرور"
          secureTextEntry
        />

        <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={saveProfile} disabled={saving}>
          <FontAwesome name="check" size={15} color="#fff" />
          <Text style={styles.saveText}>{saving ? 'جاري الحفظ...' : 'حفظ ودخول لوحة المدير'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} style={styles.input} placeholderTextColor="#94a3b8" textAlign="right" autoCapitalize="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 28 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 10, color: '#475569', fontWeight: '800' },
  hero: { borderRadius: 24, padding: 20, alignItems: 'flex-end' },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 14, color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'right' },
  subtitle: { marginTop: 6, color: '#ecfeff', fontSize: 14, lineHeight: 21, fontWeight: '700', textAlign: 'right' },
  email: { marginTop: 10, color: '#fff', fontSize: 13, fontWeight: '900', textAlign: 'right' },
  form: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 12,
  },
  field: { gap: 6 },
  label: { color: '#334155', fontWeight: '900', textAlign: 'right' },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    color: '#0f172a',
    backgroundColor: '#fff',
    fontWeight: '700',
  },
  saveButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#0f766e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 4,
  },
  saveText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.55 },
});
