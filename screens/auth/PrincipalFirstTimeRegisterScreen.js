import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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


import { useAuth } from '../../contexts/AuthContext';
import principalRegisterAr from '../../i18n/principalRegister/ar.json';
import principalRegisterHe from '../../i18n/principalRegister/he.json';
import { isValidIsraeliId, normalizeIsraeliId } from '../../src/utils/israeliId';
import {
  activatePrincipalAccount,
  resolvePrincipalInvitationCodeByEmail,
  sendPrincipalInvitationCodeByEmail,
  validatePrincipalInvitationEmailAndCode,
  validatePrincipalInvitationToken,
} from '../../services/principalInvitationService';
import { mapPrincipalInvitationError } from '../../utils/principalInvitationErrors';

const COPY = {
  ar: principalRegisterAr,
  he: principalRegisterHe,
};

function resolveLanguage(value) {
  const lang = String(value || '').toLowerCase();
  if (lang.startsWith('he')) return 'he';
  return 'ar';
}

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

const hasIsraeliIdDigits = (value) => String(value || '').replace(/\D/g, '').length > 0;

export default function PrincipalFirstTimeRegisterScreen({ navigateTo, route }) {
  const { signIn } = useAuth();
  const { i18n } = useTranslation();
  const initialToken = tokenFromRoute(route);
  const routeCode = codeFromRoute(route);
  const [resolvedToken, setResolvedToken] = useState('');
  const [language, setLanguage] = useState(resolveLanguage(i18n?.language));
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submitRef = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [lookupMode, setLookupMode] = useState(!initialToken);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    identityNumber: '',
    phone: '',
    invitationCode: '',
    password: '',
    confirmPassword: '',
  });
  const { width } = useWindowDimensions();

  const labels = COPY[language] || COPY.ar;
  const isRtl = true;
  const textAlign = isRtl ? 'right' : 'left';
  const rowDirection = isRtl ? 'row-reverse' : 'row';
  const cardWidth = Math.min(width - 28, 620);
  const token = resolvedToken || initialToken;

  const mapError = (message, code, activeLabels = labels) =>
    mapPrincipalInvitationError(message, code, activeLabels);

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
        const fallbackLabels = COPY[resolveLanguage(i18n?.language)] || COPY.ar;
        setError(mapError(result.error?.message, result.data?.code, fallbackLabels));
        setLoading(false);
        return;
      }

      const invite = result.data?.invitation || {};
      const preferred = ['ar', 'he'].includes(invite.preferred_language)
        ? invite.preferred_language
        : resolveLanguage(i18n?.language);
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
  }, [initialToken, i18n?.language, routeCode]);

  const passwordStrongEnough = form.password.length >= 8;
  const canSubmit = useMemo(
    () =>
      form.email.trim() &&
      form.fullName.trim() &&
      hasIsraeliIdDigits(form.identityNumber) &&
      isValidIsraeliId(form.identityNumber) &&
      form.password &&
      form.confirmPassword &&
      form.invitationCode.trim() &&
      !submitting,
    [form, submitting]
  );

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

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

    setLookupMessage(labels.codeSent);
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
    const preferred = ['ar', 'he'].includes(invite.preferred_language)
      ? invite.preferred_language
      : language;
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
    if (submitting || submitRef.current) return;
    if (!hasIsraeliIdDigits(form.identityNumber) || !isValidIsraeliId(form.identityNumber)) {
      Alert.alert(labels.invalidTitle, labels.invalidIdentity);
      return;
    }
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

    submitRef.current = true;
    setSubmitting(true);
    const precheck = await validatePrincipalInvitationEmailAndCode({
      token,
      email: form.email,
      invitationCode: form.invitationCode,
    });

    if (!precheck.success) {
      setSubmitting(false);
      submitRef.current = false;
      Alert.alert(labels.invalidTitle, mapError(precheck.error?.message, precheck.data?.code, labels));
      return;
    }

    const result = await activatePrincipalAccount({
      token,
      email: form.email,
      identityNumber: normalizeIsraeliId(form.identityNumber),
      fullName: form.fullName,
      phone: form.phone,
      preferredLanguage: language,
      password: form.password,
      invitationCode: form.invitationCode,
    });

    if (!result.success) {
      setSubmitting(false);
      submitRef.current = false;
      Alert.alert(labels.invalidTitle, mapError(result.error?.message, result.data?.code, labels));
      return;
    }

    const signInResult = await signIn(form.email.trim().toLowerCase(), form.password);
    const signInError = signInResult?.error;

    setSubmitting(false);
    submitRef.current = false;
    setSuccess(true);

    if (signInError) {
      Alert.alert(labels.signInFailedTitle, labels.signInFailedMessage, [
        { text: labels.backLogin, onPress: () => navigateTo?.('login') },
      ]);
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
        <Text style={styles.centerText}>{error}</Text>
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
          <Text style={[styles.title, { textAlign }]}>{labels.lookupTitle}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>{labels.lookupSubtitle}</Text>

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
            <Text style={styles.activateText}>{labels.sendCode}</Text>
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
            <Text style={styles.solidButtonText}>{labels.verifyCode}</Text>
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
            { value: 'ar', label: labels.langArabic },
            { value: 'he', label: labels.langHebrew },
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
        <Field
          label={labels.identityNumber}
          value={form.identityNumber}
          onChangeText={(value) => updateField('identityNumber', value.replace(/[^\d\s-]/g, ''))}
          icon="id-card"
          keyboardType="number-pad"
          isRtl={isRtl}
          error={hasIsraeliIdDigits(form.identityNumber) && !isValidIsraeliId(form.identityNumber) ? labels.invalidIdentity : ''}
        />
        <Field label={labels.phone} value={form.phone} onChangeText={(value) => updateField('phone', value)} icon="phone" keyboardType="phone-pad" isRtl={isRtl} />
        <Field label={labels.code} value={form.invitationCode} onChangeText={(value) => updateField('invitationCode', value.toUpperCase())} icon="key" autoCapitalize="characters" isRtl={isRtl} />
        <Field label={labels.password} value={form.password} onChangeText={(value) => updateField('password', value)} icon="lock" secureTextEntry isRtl={isRtl} />
        <Field label={labels.confirmPassword} value={form.confirmPassword} onChangeText={(value) => updateField('confirmPassword', value)} icon="check-circle" secureTextEntry isRtl={isRtl} />

        <TouchableOpacity style={[styles.activateButton, (!canSubmit || submitting) && styles.disabled]} onPress={activate} disabled={submitting || !canSubmit}>
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

function Field({ label, isRtl, icon, autoCapitalize, error, ...props }) {
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
      {!!error && <Text style={[styles.validationText, { textAlign: isRtl ? 'right' : 'left' }]}>{error}</Text>}
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
  subtitle: { marginTop: 7, color: '#475569', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  steps: { marginTop: 18, gap: 8 },
  stepItem: { flex: 1, alignItems: 'center', minWidth: 0 },
  stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  stepNumber: { color: '#047857', fontWeight: '900', fontSize: 17 },
  stepNumberActive: { color: '#fff' },
  stepText: { marginTop: 6, color: '#64748B', fontWeight: '800', fontSize: 16 },
  welcomeCard: { marginTop: 18, borderRadius: 18, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#D1FAE5', padding: 14 },
  welcome: { color: '#047857', fontWeight: '900', fontSize: 16 },
  schoolName: { marginTop: 3, color: '#064E3B', fontWeight: '900', fontSize: 19 },
  infoLine: { marginTop: 9, alignItems: 'center', gap: 8 },
  infoText: { flex: 1, color: '#475569', fontWeight: '800' },
  label: { marginTop: 13, color: '#064E3B', fontWeight: '900', fontSize: 17 },
  languageRow: { marginTop: 8, gap: 8 },
  languageChip: { flex: 1, minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: '#BBF7D0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  languageChipActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  languageText: { color: '#047857', fontWeight: '900', fontSize: 17 },
  languageTextActive: { color: '#fff' },
  field: { marginTop: 2 },
  inputWrap: { marginTop: 7, minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: '#BBF7D0', backgroundColor: '#fff', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  input: { flex: 1, color: '#0F172A', fontWeight: '800', minHeight: 48 },
  validationText: { marginTop: 6, color: '#DC2626', fontWeight: '800', fontSize: 17 },
  activateButton: { marginTop: 18, minHeight: 52, borderRadius: 16, backgroundColor: '#15803D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  activateText: { color: '#fff', fontWeight: '900', fontSize: 17 },
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
