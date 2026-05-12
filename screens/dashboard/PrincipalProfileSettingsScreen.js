import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PrincipalTabs } from './PrincipalDashboardScreen';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentPrincipal, localizedPrincipalSchoolName, updatePrincipalBasicProfile } from '../../services/principalExperienceService';

const colors = { bg: '#F6F8FF', primary: '#1E4FBF', dark: '#102A68', secondary: '#546A99', border: '#E5ECFF', success: '#2ECC71', danger: '#DC2626' };

export default function PrincipalProfileSettingsScreen({ navigateTo }) {
  const { t, i18n } = useTranslation('principal');
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [principal, setPrincipal] = useState(null);
  const [form, setForm] = useState({ full_name: '', phone: '', preferred_language: 'ar' });

  useEffect(() => {
    let mounted = true;
    async function load() {
      const row = await getCurrentPrincipal();
      if (!mounted) return;
      setPrincipal(row);
      setForm({ full_name: row.full_name || '', phone: row.phone || '', preferred_language: row.preferred_language || 'ar' });
      setLoading(false);
    }
    load().catch(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updatePrincipalBasicProfile(form);
      setPrincipal(updated);
      Alert.alert(t('account.updatedTitle'), t('account.updatedBody'));
    } catch (err) {
      Alert.alert(t('account.saveError'), err?.message || t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      const ok = typeof window === 'undefined' || window.confirm(signOutConfirmText(i18n.language));
      if (ok) handleSignOut();
      return;
    }
    Alert.alert(
      signOutTitleText(i18n.language),
      signOutConfirmText(i18n.language),
      [
        { text: cancelSignOutText(i18n.language), style: 'cancel' },
        { text: signOutText(i18n.language), style: 'destructive', onPress: handleSignOut },
      ]
    );
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const { error } = await signOut();
    setSigningOut(false);
    if (error) {
      Alert.alert(signOutErrorText(i18n.language), error.message || t('common.tryAgain'));
      return;
    }
    navigateTo?.('login', {}, { resetHistory: true });
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.centerText}>{t('common.loadingData')}</Text></View>;
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('principalDashboard')}>
          <FontAwesome name="chevron-right" size={13} color={colors.primary} />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('account.title')}</Text>
        <Text style={styles.subtitle}>{t('details.allowedEditHint')}</Text>

        <View style={styles.card}>
          <Field label={t('account.fullName')} value={form.full_name} onChangeText={(v) => setForm((c) => ({ ...c, full_name: v }))} />
          <Field label={t('account.phone')} value={form.phone} onChangeText={(v) => setForm((c) => ({ ...c, phone: v }))} keyboardType="phone-pad" />
          <Text style={styles.label}>{t('account.preferredLanguage')}</Text>
          <View style={styles.langRow}>
            {[{ value: 'ar', label: 'عربي' }, { value: 'he', label: 'עברית' }].map((item) => (
              <TouchableOpacity key={item.value} style={[styles.langChip, form.preferred_language === item.value && styles.langChipActive]} onPress={() => setForm((c) => ({ ...c, preferred_language: item.value }))}>
                <Text style={[styles.langText, form.preferred_language === item.value && styles.langTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Readonly label={t('account.email')} value={principal?.email || principal?.gmail || '-'} />
          <Readonly label={t('account.school')} value={localizedPrincipalSchoolName(principal, i18n.language, '-')} />
          <Readonly label={t('account.role')} value={principal?.role === 'school_admin' ? t('account.schoolAdmin') : t('account.principal')} />
          <Readonly label="school_id" value={t('account.lockedSchoolId')} />
        </View>

        <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>{saving ? t('reports.exporting') : t('account.save')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.signOutButton, signingOut && styles.disabled]} onPress={confirmSignOut} disabled={signingOut}>
          <FontAwesome name="sign-out" size={17} color={colors.danger} />
          <Text style={styles.signOutText}>{signingOut ? signingOutText(i18n.language) : signOutButtonText(i18n.language)}</Text>
        </TouchableOpacity>
      </ScrollView>
      <PrincipalTabs active="account" navigateTo={navigateTo} />
    </View>
  );
}

function isHebrew(language = 'ar') {
  return String(language || '').startsWith('he');
}

function signOutTitleText(language = 'ar') {
  return isHebrew(language) ? 'יציאה מהחשבון' : 'تسجيل الخروج';
}

function signOutConfirmText(language = 'ar') {
  return isHebrew(language) ? 'האם לצאת מחשבון המנהל?' : 'هل تريد الخروج من حساب المدير؟';
}

function cancelSignOutText(language = 'ar') {
  return isHebrew(language) ? 'ביטול' : 'إلغاء';
}

function signOutText(language = 'ar') {
  return isHebrew(language) ? 'יציאה' : 'تسجيل الخروج';
}

function signOutButtonText(language = 'ar') {
  return isHebrew(language) ? 'יציאה מהחשבון' : 'تسجيل الخروج';
}

function signingOutText(language = 'ar') {
  return isHebrew(language) ? 'יוצא...' : 'جار تسجيل الخروج...';
}

function signOutErrorText(language = 'ar') {
  return isHebrew(language) ? 'לא ניתן לצאת' : 'تعذر تسجيل الخروج';
}

function Field({ label, ...props }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} textAlign="right" placeholderTextColor="#8EA0C8" /></View>;
}

function Readonly({ label, value }) {
  return <View style={styles.readonly}><Text style={styles.readonlyValue}>{value}</Text><Text style={styles.readonlyLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 92 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  centerText: { marginTop: 10, color: colors.secondary, fontWeight: '800' },
  backButton: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 7, backgroundColor: '#EAF0FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  backText: { color: colors.primary, fontWeight: '900' },
  title: { marginTop: 16, color: colors.dark, fontSize: 25, fontWeight: '900', textAlign: 'right' },
  subtitle: { marginTop: 5, color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  card: { marginTop: 14, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 15 },
  field: { marginTop: 10 },
  label: { color: colors.dark, fontWeight: '900', textAlign: 'right', marginBottom: 7 },
  input: { minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, color: colors.dark, fontWeight: '800', paddingHorizontal: 12 },
  langRow: { flexDirection: 'row-reverse', gap: 8 },
  langChip: { flex: 1, borderRadius: 15, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, alignItems: 'center' },
  langChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langText: { color: colors.secondary, fontWeight: '900' },
  langTextActive: { color: '#fff' },
  readonly: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F0F4FF' },
  readonlyLabel: { color: colors.secondary, fontWeight: '800', textAlign: 'right' },
  readonlyValue: { flex: 1, color: colors.dark, fontWeight: '900', textAlign: 'left' },
  saveButton: { marginTop: 14, minHeight: 52, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontWeight: '900' },
  signOutButton: { marginTop: 12, minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: '#F5B7B1', backgroundColor: '#FFF5F5', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9 },
  signOutText: { color: colors.danger, fontWeight: '900' },
  disabled: { opacity: 0.6 },
});
