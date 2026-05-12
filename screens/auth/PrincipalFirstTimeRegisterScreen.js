import { FontAwesome } from '@expo/vector-icons';
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
  useWindowDimensions,
} from 'react-native';

import { supabase } from '../../config/supabase';
import {
  activatePrincipalAccount,
  resolvePrincipalInvitationCodeByEmail,
  sendPrincipalInvitationCodeByEmail,
  validatePrincipalInvitationEmailAndCode,
  validatePrincipalInvitationToken,
} from '../../services/principalInvitationService';

const copy = {
  ar: {
    title: 'تفعيل حساب مدير المدرسة',
    subtitle: 'أكمل بياناتك لتفعيل حساب المدير المرتبط بمدرستك.',
    welcome: 'مرحبًا بك',
    school: 'المدرسة',
    invitedEmail: 'البريد المدعو',
    language: 'اللغة المفضلة',
    email: 'البريد الإلكتروني',
    fullName: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    code: 'كود الدعوة / كود المدرسة',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    activate: 'تفعيل الحساب',
    activating: 'جاري تفعيل الحساب...',
    loading: 'جاري التحقق من الدعوة...',
    invalidTitle: 'الدعوة غير متاحة',
    missingToken: 'افتح رابط الدعوة الذي وصلك بالبريد أو اطلب من الأدمن نسخ رابط الدعوة من لوحة الإدارة.',
    backLogin: 'العودة لتسجيل الدخول',
    invalidEmail: 'هذا البريد غير موجود ضمن دعوات المديرين. الرجاء التواصل مع الأدمن.',
    invalidCode: 'الكود غير صحيح أو لا يتبع لهذه المدرسة.',
    expired: 'انتهت صلاحية الدعوة. الرجاء طلب دعوة جديدة من الأدمن.',
    success: 'تم تفعيل حساب المدير بنجاح.',
    dashboard: 'الانتقال إلى لوحة المدير',
    missing: 'أكمل جميع الحقول المطلوبة.',
    passwordMismatch: 'كلمة المرور وتأكيدها غير متطابقين.',
    weakPassword: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
    steps: ['التحقق من الدعوة', 'إكمال البيانات', 'تفعيل الحساب'],
  },
  he: {
    title: 'הפעלת חשבון מנהל בית ספר',
    subtitle: 'השלם את הפרטים כדי להפעיל את חשבון המנהל המקושר לבית הספר שלך.',
    welcome: 'ברוך הבא',
    school: 'בית הספר',
    invitedEmail: 'הדואר שהוזמן',
    language: 'שפה מועדפת',
    email: 'דואר אלקטרוני',
    fullName: 'שם מלא',
    phone: 'טלפון',
    code: 'קוד הזמנה / קוד בית ספר',
    password: 'סיסמה',
    confirmPassword: 'אימות סיסמה',
    activate: 'הפעל חשבון',
    activating: 'מפעיל חשבון...',
    loading: 'בודק את ההזמנה...',
    invalidTitle: 'ההזמנה אינה זמינה',
    missingToken: 'פתח את קישור ההזמנה שנשלח אליך במייל או בקש מהאדמין להעתיק את קישור ההזמנה.',
    backLogin: 'חזרה להתחברות',
    invalidEmail: 'הדואר האלקטרוני הזה לא נמצא ברשימת הזמנות המנהלים. יש לפנות לאדמין.',
    invalidCode: 'הקוד שגוי או אינו שייך לבית הספר הזה.',
    expired: 'תוקף ההזמנה פג. יש לבקש הזמנה חדשה מהאדמין.',
    success: 'חשבון המנהל הופעל בהצלחה.',
    dashboard: 'עבור ללוח המנהל',
    missing: 'יש להשלים את כל השדות הנדרשים.',
    passwordMismatch: 'הסיסמאות אינן תואמות.',
    weakPassword: 'הסיסמה חייבת להכיל לפחות 8 תווים.',
    steps: ['אימות הזמנה', 'השלמת פרטים', 'הפעלת חשבון'],
  },
  en: {
    title: 'Activate Principal Account',
    subtitle: 'Complete your details to activate the principal account linked to your school.',
    welcome: 'Welcome',
    school: 'School',
    invitedEmail: 'Invited email',
    language: 'Preferred language',
    email: 'Email address',
    fullName: 'Full name',
    phone: 'Phone',
    code: 'Invitation / School code',
    password: 'Password',
    confirmPassword: 'Confirm password',
    activate: 'Activate account',
    activating: 'Activating account...',
    loading: 'Verifying invitation...',
    invalidTitle: 'Invitation unavailable',
    missingToken: 'Open the invitation link sent to your email, or ask the admin to copy the invitation link from the admin dashboard.',
    backLogin: 'Back to login',
    invalidEmail: 'This email is not invited as a principal. Please contact the system admin.',
    invalidCode: 'The code is incorrect or does not belong to this school.',
    expired: 'The invitation has expired. Please request a new invitation from the admin.',
    success: 'Principal account activated successfully.',
    dashboard: 'Go to Principal Dashboard',
    missing: 'Please complete all required fields.',
    passwordMismatch: 'Password and confirmation do not match.',
    weakPassword: 'Password must be at least 8 characters.',
    steps: ['Verify invitation', 'Complete details', 'Activate account'],
  },
};

function tokenFromRoute(route) {
  const direct = route?.params?.token || route?.token;
  if (direct) return String(direct);
  if (typeof window !== 'undefined') return new URLSearchParams(window.location.search).get('token') || '';
  return '';
}

function codeFromRoute(route) {
  const direct = route?.params?.code || route?.code;
  if (direct) return String(direct);
  if (typeof window !== 'undefined') return new URLSearchParams(window.location.search).get('code') || '';
  return '';
}

function mapError(message, code, labels) {
  const value = String(code || message || '').toLowerCase();
  if (value.includes('expired')) return labels.expired;
  if (value.includes('invalid_email')) return labels.invalidEmail;
  if (value.includes('invalid_code')) return labels.invalidCode;
  if (value.includes('used')) return labels.invalidTitle;
  return message || labels.invalidTitle;
}

export default function PrincipalFirstTimeRegisterScreen({ navigateTo, route }) {
  const initialToken = tokenFromRoute(route);
  const routeCode = codeFromRoute(route);
  const [resolvedToken, setResolvedToken] = useState('');
  const [language, setLanguage] = useState('ar');
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [lookupMode, setLookupMode] = useState(!initialToken);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    phone: '',
    invitationCode: '',
    password: '',
    confirmPassword: '',
  });
  const { width } = useWindowDimensions();

  const labels = copy[language] || copy.ar;
  const isRtl = language === 'ar' || language === 'he';
  const textAlign = isRtl ? 'right' : 'left';
  const rowDirection = isRtl ? 'row-reverse' : 'row';
  const cardWidth = Math.min(width - 28, 620);
  const token = resolvedToken || initialToken;

  useEffect(() => {
    let mounted = true;

    async function validate() {
      if (!initialToken) {
        setLookupMode(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await validatePrincipalInvitationToken(initialToken);
      if (!mounted) return;

      if (!result.success) {
        setError(mapError(result.error?.message, result.data?.code, copy.ar));
        setLoading(false);
        return;
      }

      const invite = result.data?.invitation || {};
      const preferred = ['ar', 'he', 'en'].includes(invite.preferred_language) ? invite.preferred_language : 'ar';
      setLanguage(preferred);
      setInvitation(invite);
      setForm((current) => ({
        ...current,
        email: invite.invited_email || '',
        fullName: invite.invited_name || '',
        phone: invite.invited_phone || '',
        invitationCode: routeCode || current.invitationCode,
      }));
      setLoading(false);
    }

    validate();
    return () => {
      mounted = false;
    };
  }, [initialToken]);

  const passwordStrongEnough = form.password.length >= 8;
  const canSubmit = useMemo(
    () =>
      form.email.trim() &&
      form.fullName.trim() &&
      form.password &&
      form.confirmPassword &&
      form.invitationCode.trim() &&
      !submitting,
    [form, submitting]
  );

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const lookupLabels = {
    ar: {
      title: 'تسجيل دخول لأول مرة',
      subtitle: 'أدخل البريد الإلكتروني المدعو كمدير، وسنرسل لك كود الدعوة على البريد.',
      sendCode: 'إرسال الكود',
      verifyCode: 'تحقق من الكود',
      codeSent: 'تم إرسال كود الدعوة إلى بريدك.',
    },
    he: {
      title: 'כניסה ראשונה',
      subtitle: 'הזן את האימייל שהוזמן כמנהל, ונשלח אליו את קוד ההזמנה.',
      sendCode: 'שלח קוד',
      verifyCode: 'אמת קוד',
      codeSent: 'קוד ההזמנה נשלח למייל שלך.',
    },
    en: {
      title: 'First-time principal access',
      subtitle: 'Enter the email invited as a principal, and we will send the invitation code to that email.',
      sendCode: 'Send code',
      verifyCode: 'Verify code',
      codeSent: 'The invitation code was sent to your email.',
    },
  }[language] || {};

  const sendLookupCode = async () => {
    const email = form.email.trim().toLowerCase();
    if (!email) {
      Alert.alert(labels.invalidTitle, labels.missing);
      return;
    }

    setLookupLoading(true);
    setLookupMessage('');
    const result = await sendPrincipalInvitationCodeByEmail(email, language);
    setLookupLoading(false);

    if (!result.success) {
      Alert.alert(labels.invalidTitle, mapError(result.error?.message, result.data?.code, labels));
      return;
    }

    setLookupMessage(lookupLabels.codeSent);
  };

  const resolveLookupCode = async () => {
    const email = form.email.trim().toLowerCase();
    const invitationCode = form.invitationCode.trim().toUpperCase();
    if (!email || !invitationCode) {
      Alert.alert(labels.invalidTitle, labels.missing);
      return;
    }

    setLookupLoading(true);
    const result = await resolvePrincipalInvitationCodeByEmail({ email, invitationCode });
    setLookupLoading(false);

    if (!result.success) {
      Alert.alert(labels.invalidTitle, mapError(result.error?.message, result.data?.code, labels));
      return;
    }

    const invite = result.data?.invitation || {};
    const preferred = ['ar', 'he', 'en'].includes(invite.preferred_language) ? invite.preferred_language : language;
    setResolvedToken(result.data?.token || invite.invite_token || '');
    setLanguage(preferred);
    setInvitation(invite);
    setLookupMode(false);
    setError('');
    setForm((current) => ({
      ...current,
      email: invite.invited_email || email,
      fullName: invite.invited_name || current.fullName,
      phone: invite.invited_phone || current.phone,
      invitationCode,
    }));
  };

  const activate = async () => {
    if (!canSubmit) {
      Alert.alert(labels.invalidTitle, labels.missing);
      return;
    }
    if (!passwordStrongEnough) {
      Alert.alert(labels.invalidTitle, labels.weakPassword);
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert(labels.invalidTitle, labels.passwordMismatch);
      return;
    }

    setSubmitting(true);
    const precheck = await validatePrincipalInvitationEmailAndCode({
      token,
      email: form.email,
      invitationCode: form.invitationCode,
    });

    if (!precheck.success) {
      setSubmitting(false);
      Alert.alert(labels.invalidTitle, mapError(precheck.error?.message, precheck.data?.code, labels));
      return;
    }

    const result = await activatePrincipalAccount({
      token,
      email: form.email,
      fullName: form.fullName,
      phone: form.phone,
      preferredLanguage: language,
      password: form.password,
      invitationCode: form.invitationCode,
    });

    if (!result.success) {
      setSubmitting(false);
      Alert.alert(labels.invalidTitle, mapError(result.error?.message, result.data?.code, labels));
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });

    setSubmitting(false);
    setSuccess(true);

    if (signInError) {
      Alert.alert(labels.success, labels.backLogin, [{ text: labels.backLogin, onPress: () => navigateTo?.('login') }]);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#15803D" />
        <Text style={styles.centerText}>{labels.loading}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <FontAwesome name="exclamation" size={22} color="#fff" />
        </View>
        <Text style={styles.errorTitle}>{labels.invalidTitle}</Text>
        <Text style={styles.centerText}>{mapError(error, error, labels)}</Text>
        <TouchableOpacity style={styles.solidButton} onPress={() => navigateTo?.('login')}>
          <Text style={styles.solidButtonText}>{labels.backLogin}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (lookupMode) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { width: cardWidth }]}>
          <View style={[styles.heroIcon, { alignSelf: isRtl ? 'flex-end' : 'flex-start' }]}>
            <FontAwesome name="envelope" size={24} color="#047857" />
          </View>
          <Text style={[styles.title, { textAlign }]}>{lookupLabels.title}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{lookupLabels.subtitle}</Text>

          <Field
            label={labels.email}
            value={form.email}
            onChangeText={(value) => updateField('email', value.replace(/\s/g, ''))}
            icon="envelope"
            keyboardType="email-address"
            isRtl={isRtl}
          />
          <TouchableOpacity style={[styles.activateButton, lookupLoading && styles.disabled]} onPress={sendLookupCode} disabled={lookupLoading}>
            <FontAwesome name="paper-plane" size={15} color="#fff" />
            <Text style={styles.activateText}>{lookupLabels.sendCode}</Text>
          </TouchableOpacity>

          {!!lookupMessage && <Text style={[styles.lookupMessage, { textAlign }]}>{lookupMessage}</Text>}

          <Field
            label={labels.code}
            value={form.invitationCode}
            onChangeText={(value) => updateField('invitationCode', value.toUpperCase())}
            icon="key"
            autoCapitalize="characters"
            isRtl={isRtl}
          />
          <TouchableOpacity style={[styles.solidButton, lookupLoading && styles.disabled]} onPress={resolveLookupCode} disabled={lookupLoading}>
            <Text style={styles.solidButtonText}>{lookupLabels.verifyCode}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backInline} onPress={() => navigateTo?.('login')}>
            <Text style={styles.backInlineText}>{labels.backLogin}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (success) {
    return (
      <View style={styles.center}>
        <View style={styles.successIcon}>
          <FontAwesome name="check" size={26} color="#fff" />
        </View>
        <Text style={styles.errorTitle}>{labels.success}</Text>
        <TouchableOpacity style={styles.solidButton} onPress={() => navigateTo?.('principalDashboard', {}, { replace: true, resetHistory: true })}>
          <Text style={styles.solidButtonText}>{labels.dashboard}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, { width: cardWidth }]}>
        <View style={[styles.heroIcon, { alignSelf: isRtl ? 'flex-end' : 'flex-start' }]}>
          <FontAwesome name="university" size={24} color="#15803D" />
        </View>
        <Text style={[styles.title, { textAlign, writingDirection: isRtl ? 'rtl' : 'ltr' }]}>{labels.title}</Text>
        <Text style={[styles.subtitle, { textAlign, writingDirection: isRtl ? 'rtl' : 'ltr' }]}>{labels.subtitle}</Text>

        <View style={[styles.steps, { flexDirection: rowDirection }]}>
          {labels.steps.map((step, index) => (
            <View key={step} style={styles.stepItem}>
              <View style={[styles.stepDot, index === 1 && styles.stepDotActive]}>
                <Text style={[styles.stepNumber, index === 1 && styles.stepNumberActive]}>{index + 1}</Text>
              </View>
              <Text style={[styles.stepText, { textAlign }]}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.welcomeCard}>
          <Text style={[styles.welcome, { textAlign }]}>{labels.welcome}</Text>
          <Text style={[styles.schoolName, { textAlign }]}>{invitation?.school_name || '-'}</Text>
          <InfoLine icon="envelope" label={`${labels.invitedEmail}: ${invitation?.invited_email || '-'}`} isRtl={isRtl} />
        </View>

        <Text style={[styles.label, { textAlign }]}>{labels.language}</Text>
        <View style={[styles.languageRow, { flexDirection: rowDirection }]}>
          {[
            { value: 'ar', label: 'العربية' },
            { value: 'he', label: 'עברית' },
            { value: 'en', label: 'English' },
          ].map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.languageChip, language === item.value && styles.languageChipActive]}
              onPress={() => setLanguage(item.value)}
            >
              <Text style={[styles.languageText, language === item.value && styles.languageTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label={labels.email} value={form.email} onChangeText={(value) => updateField('email', value.replace(/\s/g, ''))} icon="envelope" keyboardType="email-address" isRtl={isRtl} />
        <Field label={labels.fullName} value={form.fullName} onChangeText={(value) => updateField('fullName', value)} icon="user" isRtl={isRtl} />
        <Field label={labels.phone} value={form.phone} onChangeText={(value) => updateField('phone', value)} icon="phone" keyboardType="phone-pad" isRtl={isRtl} />
        <Field label={labels.code} value={form.invitationCode} onChangeText={(value) => updateField('invitationCode', value.toUpperCase())} icon="key" autoCapitalize="characters" isRtl={isRtl} />
        <Field label={labels.password} value={form.password} onChangeText={(value) => updateField('password', value)} icon="lock" secureTextEntry isRtl={isRtl} />
        <Field label={labels.confirmPassword} value={form.confirmPassword} onChangeText={(value) => updateField('confirmPassword', value)} icon="check-circle" secureTextEntry isRtl={isRtl} />

        <TouchableOpacity style={[styles.activateButton, (!canSubmit || submitting) && styles.disabled]} onPress={activate} disabled={submitting}>
          <FontAwesome name="shield" size={15} color="#fff" />
          <Text style={styles.activateText}>{submitting ? labels.activating : labels.activate}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoLine({ icon, label, isRtl }) {
  return (
    <View style={[styles.infoLine, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
      <FontAwesome name={icon} size={13} color="#047857" />
      <Text style={[styles.infoText, { textAlign: isRtl ? 'right' : 'left' }]}>{label}</Text>
    </View>
  );
}

function Field({ label, isRtl, icon, autoCapitalize, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { textAlign: isRtl ? 'right' : 'left' }]}>{label}</Text>
      <View style={[styles.inputWrap, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
        <FontAwesome name={icon} size={14} color="#047857" />
        <TextInput
          {...props}
          style={[styles.input, { textAlign: isRtl ? 'right' : 'left', writingDirection: isRtl ? 'rtl' : 'ltr' }]}
          placeholderTextColor="#94A3B8"
          autoCapitalize={autoCapitalize || 'none'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0FDF4' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 14, paddingVertical: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: '#F0FDF4' },
  centerText: { marginTop: 10, color: '#475569', fontWeight: '800', textAlign: 'center', lineHeight: 22 },
  card: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#BBF7D0', padding: 18, shadowColor: '#064E3B', shadowOpacity: 0.11, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 14, color: '#064E3B', fontSize: 25, fontWeight: '900' },
  subtitle: { marginTop: 7, color: '#475569', fontSize: 14, lineHeight: 22, fontWeight: '700' },
  steps: { marginTop: 18, gap: 8 },
  stepItem: { flex: 1, alignItems: 'center', minWidth: 0 },
  stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  stepNumber: { color: '#047857', fontWeight: '900', fontSize: 12 },
  stepNumberActive: { color: '#fff' },
  stepText: { marginTop: 6, color: '#64748B', fontWeight: '800', fontSize: 11 },
  welcomeCard: { marginTop: 18, borderRadius: 18, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#D1FAE5', padding: 14 },
  welcome: { color: '#047857', fontWeight: '900', fontSize: 13 },
  schoolName: { marginTop: 3, color: '#064E3B', fontWeight: '900', fontSize: 19 },
  infoLine: { marginTop: 9, alignItems: 'center', gap: 8 },
  infoText: { flex: 1, color: '#475569', fontWeight: '800' },
  label: { marginTop: 13, color: '#064E3B', fontWeight: '900', fontSize: 12 },
  languageRow: { marginTop: 8, gap: 8 },
  languageChip: { flex: 1, minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: '#BBF7D0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  languageChipActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  languageText: { color: '#047857', fontWeight: '900', fontSize: 12 },
  languageTextActive: { color: '#fff' },
  field: { marginTop: 2 },
  inputWrap: { marginTop: 7, minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: '#BBF7D0', backgroundColor: '#fff', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  input: { flex: 1, color: '#0F172A', fontWeight: '800', minHeight: 48 },
  activateButton: { marginTop: 18, minHeight: 52, borderRadius: 16, backgroundColor: '#15803D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  activateText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  solidButton: { marginTop: 18, minHeight: 48, borderRadius: 16, backgroundColor: '#15803D', paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  solidButtonText: { color: '#fff', fontWeight: '900' },
  lookupMessage: { marginTop: 12, color: '#047857', fontWeight: '900' },
  backInline: { marginTop: 16, alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  backInlineText: { color: '#64748B', fontWeight: '900' },
  errorIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  successIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center' },
  errorTitle: { marginTop: 14, color: '#064E3B', fontSize: 21, fontWeight: '900', textAlign: 'center' },
  disabled: { opacity: 0.55 },
});
