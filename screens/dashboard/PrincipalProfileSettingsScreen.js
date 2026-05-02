import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { PrincipalTabs } from './PrincipalDashboardScreen';
import { getCurrentPrincipal, updatePrincipalBasicProfile } from '../../services/principalExperienceService';

const colors = { bg: '#F6F8FF', primary: '#1E4FBF', dark: '#102A68', secondary: '#546A99', border: '#E5ECFF', success: '#2ECC71' };

export default function PrincipalProfileSettingsScreen({ navigateTo }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      Alert.alert('تم التحديث', 'تم تحديث بياناتك بنجاح');
    } catch (err) {
      Alert.alert('تعذر الحفظ', err?.message || 'حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.centerText}>جارٍ تحميل إعدادات الحساب...</Text></View>;
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('principalDashboard')}>
          <FontAwesome name="chevron-right" size={13} color={colors.primary} />
          <Text style={styles.backText}>رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>إعدادات الحساب</Text>
        <Text style={styles.subtitle}>يمكنك تعديل بياناتك الأساسية فقط</Text>

        <View style={styles.card}>
          <Field label="الاسم الكامل" value={form.full_name} onChangeText={(v) => setForm((c) => ({ ...c, full_name: v }))} />
          <Field label="رقم الهاتف" value={form.phone} onChangeText={(v) => setForm((c) => ({ ...c, phone: v }))} keyboardType="phone-pad" />
          <Text style={styles.label}>اللغة المفضلة</Text>
          <View style={styles.langRow}>
            {[{ value: 'ar', label: 'عربي' }, { value: 'he', label: 'עברית' }].map((item) => (
              <TouchableOpacity key={item.value} style={[styles.langChip, form.preferred_language === item.value && styles.langChipActive]} onPress={() => setForm((c) => ({ ...c, preferred_language: item.value }))}>
                <Text style={[styles.langText, form.preferred_language === item.value && styles.langTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Readonly label="البريد" value={principal?.email || principal?.gmail || '-'} />
          <Readonly label="المدرسة" value={principal?.school_name || '-'} />
          <Readonly label="الدور" value={principal?.role === 'school_admin' ? 'مسؤول مدرسة' : 'مدير مدرسة'} />
          <Readonly label="school_id" value="غير قابل للتعديل" />
        </View>

        <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</Text>
        </TouchableOpacity>
      </ScrollView>
      <PrincipalTabs active="account" navigateTo={navigateTo} />
    </View>
  );
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
  disabled: { opacity: 0.6 },
});
