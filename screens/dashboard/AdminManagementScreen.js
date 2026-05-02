import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import {
  AdminCard,
  AdminShell,
  EmptyState,
  LoadingState,
  StatCard,
} from '../../components/Admin/AdminLayout';
import { adminColors } from '../../components/Admin/adminTheme';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  getPrincipalInvitations,
  invitePrincipalByEmail,
  principalInvitationLink,
  recordAdminAuditEvent,
  revokePrincipalInvitation,
} from '../../services/adminComplianceService';

const initialPrincipal = {
  fullName: '',
  email: '',
  phone: '',
  schoolName: '',
  schoolId: '',
  preferredLanguage: 'ar',
  notes: '',
  role: 'principal',
};

export default function AdminManagementScreen({ navigateTo }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schoolsError, setSchoolsError] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [invitations, setInvitations] = useState([]);
  const [principalForm, setPrincipalForm] = useState(initialPrincipal);

  useEffect(() => {
    let mounted = true;

    const loadSchools = async () => {
      setLoadingSchools(true);
      setSchoolsError(null);
      const { data, error } = await supabase
        .from('schools')
        .select('id, name_ar, name_he, city_ar, city_he, region')
        .order('name_ar', { ascending: true })
        .limit(500);

      if (!mounted) return;
      setSchoolsError(error?.message || null);
      setSchools(data || []);
      setLoadingSchools(false);
    };

    loadSchools();
    return () => {
      mounted = false;
    };
  }, []);

  const loadInvitations = async () => {
    setLoadingInvitations(true);
    const result = await getPrincipalInvitations();
    setInvitations(result.rows || []);
    setLoadingInvitations(false);
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const updateField = (key, value) => {
    setPrincipalForm((current) => ({ ...current, [key]: value }));
  };

  const submitPrincipalInvite = async () => {
    const email = principalForm.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      Alert.alert('بيانات ناقصة', 'أدخل بريد المدير الإلكتروني بشكل صحيح.');
      return;
    }

    setSaving(true);
    const payload = {
      ...principalForm,
      email,
      fullName: principalForm.fullName.trim() || email,
      schoolName: principalForm.schoolName.trim() || 'Pending setup',
    };

    const result = await invitePrincipalByEmail(payload);

    await recordAdminAuditEvent({
      actorId: user?.id,
      action: result.success ? 'principal_invite_sent' : 'principal_invite_failed',
      entityType: 'principal_invite',
      entityId: result.data?.invitationId,
      metadata: { email: payload.email, schoolName: payload.schoolName, schoolId: payload.schoolId, role: payload.role },
    });

    setSaving(false);

    if (!result.success) {
      Alert.alert('تعذر إرسال الدعوة', result.error?.message || 'تأكد من نشر دالة create-principal-invitation وإعداد أسرار Supabase.');
      return;
    }

    setPrincipalForm(initialPrincipal);
    await loadInvitations();
    Alert.alert('تم إرسال الدعوة', 'وصلت دعوة الدخول إلى بريد المدير. بعد قبول الدعوة سيكمل بياناته الخاصة.');
  };

  const revokeInvitation = async (invitation) => {
    const result = await revokePrincipalInvitation(invitation.id);
    if (!result.success) {
      Alert.alert('تعذر إلغاء الدعوة', result.error?.message || 'حاول مرة أخرى.');
      return;
    }
    await loadInvitations();
  };

  const copyInvitationLink = async (invitation) => {
    const link = principalInvitationLink(invitation.invitation_token);
    try {
      await navigator?.clipboard?.writeText?.(link);
      Alert.alert('تم نسخ الرابط', link);
    } catch (_error) {
      Alert.alert('رابط الدعوة', link);
    }
  };

  const resendInvitation = async (invitation) => {
    const result = await invitePrincipalByEmail({
      email: invitation.email,
      fullName: invitation.full_name,
      phone: invitation.phone,
      schoolId: invitation.school_id,
      preferredLanguage: invitation.preferred_language,
      role: invitation.role,
      notes: invitation.notes,
    });
    if (!result.success) {
      Alert.alert('تعذر إعادة الإرسال', result.error?.message || 'حاول مرة أخرى.');
      return;
    }
    await loadInvitations();
    Alert.alert('تم إنشاء دعوة جديدة', result.data?.emailSent ? 'تم إرسال رسالة جديدة.' : 'تم إنشاء الرابط. انسخه للاختبار إذا لم يكن مزود البريد مفعلا.');
  };

  const primaryAction = (
    <TouchableOpacity style={styles.backAction} onPress={() => navigateTo?.('adminManagers')} activeOpacity={0.85}>
      <FontAwesome name="arrow-right" size={14} color={adminColors.primary} />
      <Text style={styles.backActionText}>رجوع للمدراء</Text>
    </TouchableOpacity>
  );

  return (
    <AdminShell
      activeKey="managers"
      title="دعوة مدير مدرسة"
      subtitle="إنشاء دعوة دخول خاصة وربط المدير بمدرسة أو مؤسسة تعليمية"
      navigateTo={navigateTo}
      primaryAction={primaryAction}
    >
      <View style={styles.statsRow}>
        <StatCard icon="id-badge" label="نوع الحساب" value="School Manager" tone={adminColors.primary2} />
        <StatCard icon="envelope" label="طريقة الدخول" value="دعوة بريدية" tone={adminColors.success} />
        <StatCard icon="lock" label="الخصوصية" value="حساب مستقل" tone={adminColors.warning} />
      </View>

      <AdminCard
        title="بيانات المدير"
        subtitle="أدخل البريد والمدرسة. المدير يستلم رابط الدعوة ويكمل حسابه بدون مشاركة كلمة مرور."
      >
        <View style={styles.formGrid}>
          <Field
            label="البريد الإلكتروني"
            value={principalForm.email}
            onChangeText={(value) => updateField('email', value.replace(/\s/g, ''))}
            keyboardType="email-address"
            placeholder="manager@gmail.com"
          />
          <Field
            label="الاسم الكامل"
            value={principalForm.fullName}
            onChangeText={(value) => updateField('fullName', value)}
            placeholder="اسم المدير"
          />
          <Field
            label="رقم الهاتف"
            value={principalForm.phone}
            onChangeText={(value) => updateField('phone', value)}
            keyboardType="phone-pad"
            placeholder="+972..."
          />
          <SchoolPicker
            value={principalForm.schoolName}
            schools={schools}
            loading={loadingSchools}
            error={schoolsError}
            onChangeText={(value) => setPrincipalForm((current) => ({ ...current, schoolName: value, schoolId: '' }))}
            onSelect={(school) => setPrincipalForm((current) => ({
              ...current,
              schoolName: school.schoolName,
              schoolId: school.schoolId,
            }))}
          />
          <LanguageToggle
            value={principalForm.preferredLanguage}
            onChange={(value) => updateField('preferredLanguage', value)}
          />
          <RoleToggle
            value={principalForm.role}
            onChange={(value) => updateField('role', value)}
          />
          <Field
            label="ملاحظات"
            value={principalForm.notes}
            onChangeText={(value) => updateField('notes', value)}
            placeholder="ملاحظة داخلية اختيارية"
            multiline
          />
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigateTo?.('adminManagers')} disabled={saving}>
            <Text style={styles.secondaryText}>إلغاء</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.submitButton, saving && styles.disabled]} onPress={submitPrincipalInvite} disabled={saving}>
            <FontAwesome name="paper-plane" size={14} color="#fff" />
            <Text style={styles.submitText}>{saving ? 'جار إرسال الدعوة...' : 'إرسال الدعوة'}</Text>
          </TouchableOpacity>
        </View>
      </AdminCard>

      <AdminCard title="ماذا يحدث بعد الإرسال؟">
        <View style={styles.steps}>
          <Step icon="envelope" title="دعوة عبر البريد" text="يستلم المدير رابطًا خاصًا للدخول لأول مرة." />
          <Step icon="user-circle" title="خصوصية الحساب" text="المدير يكمل بياناته دون أن يرى الأدمن كلمة المرور." />
          <Step icon="university" title="ربط المدرسة" text="بعد الربط يستطيع رؤية طلاب مدرسته فقط حسب الصلاحيات." />
        </View>
      </AdminCard>

      <AdminCard title="دعوات المدراء" subtitle="تابع الدعوات، انسخ رابط الاختبار، أو ألغ الدعوات المعلقة.">
        <InvitationsList
          loading={loadingInvitations}
          invitations={invitations}
          onCopy={copyInvitationLink}
          onRevoke={revokeInvitation}
          onResend={resendInvitation}
        />
      </AdminCard>
    </AdminShell>
  );
}

function Field({ label, multiline, ...props }) {
  return (
    <View style={[styles.field, multiline && styles.fieldWide]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholderTextColor={adminColors.muted}
        textAlign="right"
        writingDirection="rtl"
        multiline={multiline}
      />
    </View>
  );
}

function normalizeSearch(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

function SchoolPicker({ value, schools, loading, error, onChangeText, onSelect }) {
  const [focused, setFocused] = useState(false);
  const query = normalizeSearch(value);

  const options = useMemo(() => {
    const fromDb = schools.map((school) => {
      const schoolName = String(school?.name_ar || school?.name_he || '').trim();
      const city = String(school?.city_ar || school?.city_he || school?.region || '').trim();
      return {
        schoolId: school?.id ? String(school.id) : '',
        schoolName,
        nameHe: String(school?.name_he || '').trim(),
        city,
      };
    }).filter((school) => school.schoolName);

    const seen = new Set();
    const all = fromDb.filter((school) => {
      const key = school.schoolId || `${school.schoolName}::${school.city}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!query) return all.slice(0, 12);
    return all
      .filter((school) => normalizeSearch(`${school.schoolName} ${school.nameHe} ${school.city}`).includes(query))
      .slice(0, 20);
  }, [query, schools]);

  const showResults = focused && !loading && options.length > 0;
  const showEmpty = focused && !loading && !options.length && !error;
  const showError = focused && !loading && !!error;

  return (
    <View style={[styles.field, (showResults || showEmpty || showError) && styles.schoolFieldOpen]}>
      <Text style={styles.label}>المدرسة</Text>
      <View style={styles.autocompleteWrap}>
        <TextInput
          value={value}
          onChangeText={(text) => {
            setFocused(true);
            onChangeText(text);
          }}
          onFocus={() => setFocused(true)}
          style={styles.input}
          placeholder={loading ? 'جار تحميل المدارس...' : 'اكتب اسم المدرسة'}
          placeholderTextColor={adminColors.muted}
          textAlign="right"
          writingDirection="rtl"
        />
        {showResults && (
          <ScrollView style={styles.schoolResults} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {options.map((school, index) => (
              <TouchableOpacity
                key={`${school.schoolId || school.schoolName}-${index}`}
                style={styles.schoolOption}
                onPress={() => {
                  onSelect(school);
                  setFocused(false);
                }}
              >
                <Text style={styles.schoolName} numberOfLines={1}>{school.schoolName}</Text>
                {!!school.city && <Text style={styles.schoolCity} numberOfLines={1}>{school.city}</Text>}
                {!!school.nameHe && <Text style={styles.schoolCity} numberOfLines={1}>{school.nameHe}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {showEmpty && (
          <View style={styles.schoolResults}>
            <View style={styles.schoolOption}>
              <Text style={styles.schoolName}>{query ? 'لا توجد مدرسة مطابقة في الداتابيس' : 'لا توجد مدارس في الداتابيس'}</Text>
            </View>
          </View>
        )}
        {showError && (
          <View style={styles.schoolResults}>
            <View style={styles.schoolOption}>
              <Text style={styles.schoolName}>تعذر تحميل المدارس من الداتابيس</Text>
              <Text style={styles.schoolCity} numberOfLines={2}>{error}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function LanguageToggle({ value, onChange }) {
  const options = [
    { value: 'ar', label: 'العربية' },
    { value: 'he', label: 'עברית' },
  ];

  return (
    <View style={styles.field}>
      <Text style={styles.label}>اللغة المفضلة</Text>
      <View style={styles.segment}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <TouchableOpacity key={option.value} style={[styles.segmentItem, active && styles.segmentItemActive]} onPress={() => onChange(option.value)}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function RoleToggle({ value, onChange }) {
  const options = [
    { value: 'principal', label: 'Principal' },
    { value: 'school_admin', label: 'School Admin' },
  ];

  return (
    <View style={styles.field}>
      <Text style={styles.label}>الدور</Text>
      <View style={styles.segment}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <TouchableOpacity key={option.value} style={[styles.segmentItem, active && styles.segmentItemActive]} onPress={() => onChange(option.value)}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function statusTone(status) {
  if (status === 'accepted') return { bg: '#DCFCE7', fg: '#166534', text: 'مقبولة' };
  if (status === 'expired') return { bg: '#FEF3C7', fg: '#92400E', text: 'منتهية' };
  if (status === 'revoked') return { bg: '#FEE2E2', fg: '#B91C1C', text: 'ملغاة' };
  return { bg: '#DBEAFE', fg: '#1E4FBF', text: 'معلقة' };
}

function InvitationsList({ loading, invitations, onCopy, onRevoke, onResend }) {
  if (loading) return <LoadingState label="جاري تحميل الدعوات..." />;
  if (!invitations.length) {
    return (
      <View style={styles.emptyInvite}>
        <FontAwesome name="envelope-open" size={22} color={adminColors.muted} />
        <Text style={styles.emptyInviteText}>لا توجد دعوات بعد</Text>
      </View>
    );
  }

  return (
    <View style={styles.inviteList}>
      {invitations.map((invitation) => {
        const status = invitation.computed_status || invitation.status;
        const tone = statusTone(status);
        const canAct = status === 'pending';
        return (
          <View key={invitation.id} style={styles.inviteCard}>
            <View style={styles.inviteHeader}>
              <View style={[styles.statusChip, { backgroundColor: tone.bg }]}>
                <Text style={[styles.statusChipText, { color: tone.fg }]}>{tone.text}</Text>
              </View>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteEmail}>{invitation.email}</Text>
                <Text style={styles.inviteMeta}>{invitation.school_name || '-'} | {invitation.role}</Text>
              </View>
            </View>
            <View style={styles.inviteActions}>
              <TouchableOpacity style={styles.smallAction} onPress={() => onCopy(invitation)}>
                <FontAwesome name="copy" size={12} color={adminColors.primary} />
                <Text style={styles.smallActionText}>نسخ الرابط</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallAction} onPress={() => onResend(invitation)}>
                <FontAwesome name="refresh" size={12} color={adminColors.primary} />
                <Text style={styles.smallActionText}>إعادة إرسال</Text>
              </TouchableOpacity>
              {canAct && (
                <TouchableOpacity style={[styles.smallAction, styles.smallDanger]} onPress={() => onRevoke(invitation)}>
                  <FontAwesome name="ban" size={12} color={adminColors.danger} />
                  <Text style={styles.smallDangerText}>إلغاء</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Step({ icon, title, text }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepIcon}>
        <FontAwesome name={icon} size={15} color={adminColors.primary2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  backAction: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: adminColors.border,
    backgroundColor: adminColors.softBlue,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  backActionText: { color: adminColors.primary, fontWeight: '900' },
  formGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  field: { flexGrow: 1, flexBasis: 260, gap: 6 },
  fieldWide: { flexBasis: '100%' },
  label: { color: adminColors.text, fontWeight: '900', fontSize: 12, textAlign: 'right' },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: adminColors.border,
    backgroundColor: '#fff',
    color: adminColors.text,
    paddingHorizontal: 12,
    fontWeight: '800',
  },
  inputMultiline: { minHeight: 92, paddingTop: 10, textAlignVertical: 'top' },
  autocompleteWrap: { position: 'relative', zIndex: 50 },
  schoolFieldOpen: { marginBottom: 166 },
  schoolResults: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    maxHeight: 150,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: adminColors.border,
    backgroundColor: '#fff',
    zIndex: 100,
    elevation: 12,
    shadowColor: '#102A68',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  schoolOption: { minHeight: 42, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: adminColors.border, alignItems: 'flex-end', justifyContent: 'center' },
  schoolName: { color: adminColors.text, fontWeight: '900', textAlign: 'right' },
  schoolCity: { marginTop: 2, color: adminColors.muted, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  segment: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: adminColors.bg, padding: 4, flexDirection: 'row-reverse', gap: 4 },
  segmentItem: { flex: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentItemActive: { backgroundColor: adminColors.primary2 },
  segmentText: { color: adminColors.muted, fontWeight: '900' },
  segmentTextActive: { color: '#fff' },
  footerActions: { marginTop: 16, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  submitButton: { minHeight: 46, borderRadius: 14, backgroundColor: adminColors.primary2, paddingHorizontal: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { color: '#fff', fontWeight: '900' },
  secondaryButton: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: adminColors.text, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  steps: { gap: 10 },
  step: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: adminColors.bg, borderWidth: 1, borderColor: adminColors.border },
  stepIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.softBlue },
  stepTitle: { color: adminColors.text, fontWeight: '900', textAlign: 'right' },
  stepText: { marginTop: 3, color: adminColors.muted, fontWeight: '700', fontSize: 12, textAlign: 'right' },
  emptyInvite: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyInviteText: { color: adminColors.muted, fontWeight: '900' },
  inviteList: { gap: 10 },
  inviteCard: { borderRadius: 16, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff', padding: 12, gap: 10 },
  inviteHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  inviteInfo: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  inviteEmail: { color: adminColors.text, fontWeight: '900', textAlign: 'right' },
  inviteMeta: { marginTop: 3, color: adminColors.muted, fontWeight: '700', fontSize: 12, textAlign: 'right' },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusChipText: { fontSize: 11, fontWeight: '900' },
  inviteActions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  smallAction: { minHeight: 34, borderRadius: 999, borderWidth: 1, borderColor: adminColors.border, backgroundColor: adminColors.softBlue, paddingHorizontal: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  smallActionText: { color: adminColors.primary, fontWeight: '900', fontSize: 12 },
  smallDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  smallDangerText: { color: adminColors.danger, fontWeight: '900', fontSize: 12 },
});
