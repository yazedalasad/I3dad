import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
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

const colors = {
  bg: '#F6F8FF',
  primary: '#1E4FBF',
  dark: '#102A68',
  secondary: '#546A99',
  border: '#E5ECFF',
  success: '#2ECC71',
  warning: '#F59E0B',
  danger: '#E74C3C',
  card: '#FFFFFF',
};

function tokenFromRoute(route) {
  const direct = route?.params?.token || route?.token;
  if (direct) return String(direct);
  if (typeof window !== 'undefined') return new URLSearchParams(window.location.search).get('token') || '';
  return '';
}

function roleLabel(role) {
  return role === 'school_admin' ? 'مسؤول مدرسة' : 'مدير مدرسة';
}

function passwordScore(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function strengthMeta(score) {
  if (score >= 4) return { label: 'strong', text: 'قوية', color: colors.success, width: '100%' };
  if (score >= 3) return { label: 'medium', text: 'متوسطة', color: colors.warning, width: '66%' };
  return { label: 'weak', text: 'ضعيفة', color: colors.danger, width: '33%' };
}

export default function PrincipalAcceptInviteScreen({ navigateTo, route }) {
  const token = tokenFromRoute(route);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('ar');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function validate() {
      setLoading(true);
      setError('');

      const { data, error: fnError } = await supabase.functions.invoke('validate-principal-invitation', {
        body: { token },
      });

      if (!mounted) return;

      if (fnError || data?.success === false) {
        setError(fnError?.message || data?.error || 'تعذر التحقق من الدعوة. قد تكون منتهية أو مستخدمة سابقا.');
        setLoading(false);
        return;
      }

      const invite = data.invitation || {};
      setInvitation(invite);
      setFullName(invite.full_name || '');
      setPhone(invite.phone || '');
      setPreferredLanguage(invite.preferred_language || 'ar');
      setLoading(false);
    }

    validate();

    return () => {
      mounted = false;
    };
  }, [token]);

  const score = useMemo(() => passwordScore(password), [password]);
  const strength = strengthMeta(score);
  const validationError = useMemo(() => {
    if (!fullName.trim()) return 'الاسم الكامل مطلوب.';
    if (password.length < 8) return 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل.';
    if (score < 3) return 'اختر كلمة مرور أقوى تحتوي على أحرف وأرقام.';
    if (password !== confirmPassword) return 'تأكيد كلمة المرور غير مطابق.';
    if (!acceptedTerms) return 'يجب الموافقة على شروط الاستخدام وسياسة الخصوصية.';
    return '';
  }, [acceptedTerms, confirmPassword, fullName, password, score]);

  const activate = async () => {
    if (validationError) {
      Alert.alert('تحقق من البيانات', validationError);
      return;
    }

    setSubmitting(true);
    setSuccess('');

    const { data, error: fnError } = await supabase.functions.invoke('accept-principal-invitation', {
      body: {
        token,
        full_name: fullName.trim(),
        phone: phone.trim(),
        preferred_language: preferredLanguage,
        password,
      },
    });

    if (fnError || data?.success === false) {
      setSubmitting(false);
      Alert.alert('تعذر تفعيل الحساب', fnError?.message || data?.error || 'حاول مرة أخرى.');
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email || invitation.email,
      password,
    });

    setSubmitting(false);
    setSuccess('تم تفعيل حسابك بنجاح');

    if (signInError) {
      Alert.alert('تم تفعيل الحساب', 'تم إنشاء الحساب. سجل الدخول بالبريد وكلمة المرور التي اخترتها.', [
        { text: 'تسجيل الدخول', onPress: () => navigateTo?.('login') },
      ]);
      return;
    }

    navigateTo?.('principalDashboard', {}, { replace: true, resetHistory: true });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.centerText}>جارٍ التحقق من الدعوة...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <FontAwesome name="exclamation" size={24} color="#fff" />
        </View>
        <Text style={styles.errorTitle}>الدعوة غير متاحة</Text>
        <Text style={styles.centerText}>{error}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigateTo?.('login')}>
          <Text style={styles.secondaryButtonText}>العودة لتسجيل الدخول</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={['#1B3A8A', '#1E4FBF']} style={styles.header}>
        <View style={styles.headerIcon}>
          <FontAwesome name="graduation-cap" size={26} color="#fff" />
        </View>
        <Text style={styles.headerTitle}>مرحبًا بك في إعداد</Text>
        <Text style={styles.headerSubtitle}>إكمال حساب مدير المدرسة</Text>
        <Text style={styles.headerSmall}>تمت دعوتك لإدارة بيانات مدرستك ومتابعة تقدم الطلاب</Text>
      </LinearGradient>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <FontAwesome name="university" size={18} color={colors.primary} />
          </View>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>تمت دعوتك كمدير مدرسة</Text>
            <Text style={styles.cardSubtitle}>راجع بيانات الدعوة قبل التفعيل</Text>
          </View>
        </View>
        <Text style={styles.schoolName}>{invitation?.school_name || '-'}</Text>
        <InfoLine icon="envelope" label={invitation?.email || '-'} />
        <InfoLine icon="id-badge" label={`الدور: ${roleLabel(invitation?.role)}`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>إكمال البيانات</Text>
        <Field value={fullName} onChangeText={setFullName} placeholder="الاسم الكامل" icon="user" />
        <Field value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" icon="phone" keyboardType="phone-pad" />

        <View style={styles.languageRow}>
          {[
            { value: 'ar', label: 'عربي' },
            { value: 'he', label: 'עברית' },
          ].map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.languageChip, preferredLanguage === item.value && styles.languageChipActive]}
              onPress={() => setPreferredLanguage(item.value)}
            >
              <Text style={[styles.languageText, preferredLanguage === item.value && styles.languageTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field
          value={password}
          onChangeText={setPassword}
          placeholder="كلمة المرور"
          icon="lock"
          secureTextEntry={!showPassword}
          rightIcon={showPassword ? 'eye-slash' : 'eye'}
          onRightIconPress={() => setShowPassword((value) => !value)}
        />
        <View style={styles.strengthBlock}>
          <View style={styles.strengthTrack}>
            <View style={[styles.strengthFill, { width: strength.width, backgroundColor: strength.color }]} />
          </View>
          <Text style={[styles.strengthText, { color: strength.color }]}>قوة كلمة المرور: {strength.text}</Text>
          <Text style={styles.helperText}>يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل</Text>
        </View>
        <Field
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="تأكيد كلمة المرور"
          icon="check-circle"
          secureTextEntry={!showConfirmPassword}
          rightIcon={showConfirmPassword ? 'eye-slash' : 'eye'}
          onRightIconPress={() => setShowConfirmPassword((value) => !value)}
        />
        {!!validationError && <Text style={styles.validationText}>{validationError}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ماذا يمكنك أن تفعل بعد التفعيل؟</Text>
        {[
          'عرض طلاب مدرستك فقط',
          'متابعة نتائج الاختبارات',
          'مشاهدة تحليلات الصفوف',
          'مراجعة نقاط القوة والضعف',
          'تحميل تقارير المدرسة',
          'تعديل بياناتك الأساسية فقط',
        ].map((item) => (
          <View key={item} style={styles.permissionRow}>
            <FontAwesome name="check" size={13} color={colors.success} />
            <Text style={styles.permissionText}>{item}</Text>
          </View>
        ))}
        <View style={styles.alertBox}>
          <FontAwesome name="info-circle" size={15} color={colors.warning} />
          <Text style={styles.alertText}>لن تتمكن من تغيير المدرسة المرتبطة بحسابك. إذا كانت المدرسة غير صحيحة، تواصل مع الأدمن.</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.termsRow} onPress={() => setAcceptedTerms((value) => !value)} activeOpacity={0.9}>
        <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
          {acceptedTerms && <FontAwesome name="check" size={12} color="#fff" />}
        </View>
        <Text style={styles.termsText}>أوافق على شروط الاستخدام وسياسة الخصوصية</Text>
      </TouchableOpacity>

      {!!success && <Text style={styles.successText}>{success}</Text>}

      <TouchableOpacity
        style={[styles.activateButton, (submitting || !!validationError) && styles.disabled]}
        onPress={activate}
        disabled={submitting}
      >
        <FontAwesome name="rocket" size={15} color="#fff" />
        <Text style={styles.activateText}>{submitting ? 'جارٍ تفعيل الحساب...' : 'تفعيل الحساب'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoLine({ icon, label }) {
  return (
    <View style={styles.infoLine}>
      <FontAwesome name={icon} size={14} color={colors.secondary} />
      <Text style={styles.infoText}>{label}</Text>
    </View>
  );
}

function Field({ icon, rightIcon, onRightIconPress, style, ...props }) {
  return (
    <View style={[styles.inputWrap, style]}>
      <FontAwesome name={icon} size={15} color={colors.secondary} />
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor="#8EA0C8"
        textAlign="right"
        autoCapitalize="none"
      />
      {!!rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} style={styles.eyeButton}>
          <FontAwesome name={rightIcon} size={15} color={colors.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 34 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  centerText: { marginTop: 10, color: colors.secondary, fontWeight: '800', textAlign: 'center', lineHeight: 22 },
  errorIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  errorTitle: { marginTop: 14, color: colors.dark, fontSize: 21, fontWeight: '900', textAlign: 'center' },
  header: { borderRadius: 28, padding: 24, alignItems: 'flex-end', overflow: 'hidden' },
  headerIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { marginTop: 16, color: '#EAF0FF', fontSize: 16, fontWeight: '800', textAlign: 'right' },
  headerSubtitle: { marginTop: 4, color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'right' },
  headerSmall: { marginTop: 8, color: '#DDE7FF', fontSize: 16, fontWeight: '700', lineHeight: 21, textAlign: 'right' },
  card: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: '#102A68',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#EEF4FF', alignItems: 'center', justifyContent: 'center' },
  cardTitleWrap: { flex: 1 },
  cardTitle: { color: colors.dark, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  cardSubtitle: { marginTop: 3, color: colors.secondary, fontSize: 17, fontWeight: '700', textAlign: 'right' },
  schoolName: { marginTop: 16, color: colors.dark, fontSize: 21, fontWeight: '900', textAlign: 'right' },
  infoLine: { marginTop: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  infoText: { color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  sectionTitle: { color: colors.dark, fontSize: 17, fontWeight: '900', textAlign: 'right', marginBottom: 12 },
  inputWrap: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    marginTop: 10,
  },
  input: { flex: 1, color: colors.dark, fontWeight: '800' },
  eyeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  languageRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 10 },
  languageChip: { flex: 1, borderRadius: 15, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  languageChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  languageText: { color: colors.secondary, fontWeight: '900' },
  languageTextActive: { color: '#fff' },
  strengthBlock: { marginTop: 10, gap: 6 },
  strengthTrack: { height: 8, borderRadius: 999, backgroundColor: '#E9EEFF', overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 999 },
  strengthText: { fontSize: 17, fontWeight: '900', textAlign: 'right' },
  helperText: { color: colors.secondary, fontSize: 17, fontWeight: '700', textAlign: 'right' },
  validationText: { marginTop: 10, color: colors.danger, fontWeight: '800', lineHeight: 20, textAlign: 'right' },
  permissionRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 9, paddingVertical: 6 },
  permissionText: { color: colors.dark, fontWeight: '800', textAlign: 'right' },
  alertBox: { marginTop: 12, borderRadius: 16, backgroundColor: '#FFF7E8', borderWidth: 1, borderColor: '#FDE7BC', padding: 12, flexDirection: 'row-reverse', gap: 8 },
  alertText: { flex: 1, color: '#9A5B00', fontWeight: '800', lineHeight: 20, textAlign: 'right' },
  termsRow: { marginTop: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { flex: 1, color: colors.dark, fontWeight: '800', textAlign: 'right' },
  successText: { marginTop: 12, color: '#15803D', fontWeight: '900', textAlign: 'center' },
  activateButton: { marginTop: 14, minHeight: 54, borderRadius: 18, backgroundColor: colors.primary, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9 },
  activateText: { color: '#fff', fontWeight: '900', fontSize: 17 },
  secondaryButton: { marginTop: 18, minHeight: 46, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondaryButtonText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.55 },
});
