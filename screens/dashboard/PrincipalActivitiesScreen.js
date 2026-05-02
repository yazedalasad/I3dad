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
} from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

const EMPTY_FORM = {
  title_ar: '',
  title_en: '',
  title_he: '',
  description_ar: '',
  description_en: '',
  description_he: '',
  activity_date: '',
  capacity: '',
  price: '',
  image_url: '',
};

export default function PrincipalActivitiesScreen({ navigateTo }) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [principal, setPrincipal] = useState(null);
  const [activities, setActivities] = useState([]);
  const [scopeWarning, setScopeWarning] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        if (!user?.id) {
          navigateTo?.('login');
          return;
        }

        setLoading(true);
        setScopeWarning('');

        const { data: principalRow, error: principalError } = await supabase
          .from('principals')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (principalError) {
          Alert.alert('Error', 'Failed to load principal data.');
          return;
        }

        if (!principalRow) {
          Alert.alert('Access denied', 'Your account is not registered as a principal.');
          navigateTo?.('home');
          return;
        }

        if (!mounted) return;
        setPrincipal(principalRow);

        const { data: rows, error: activitiesError } = await supabase
          .from('activities')
          .select('*')
          .eq('is_active', true)
          .order('activity_date', { ascending: true });

        if (activitiesError) {
          Alert.alert('Error', 'Failed to load activities.');
          return;
        }

        const allActivities = rows || [];
        const supportsSchoolScope = allActivities.some((row) =>
          Object.prototype.hasOwnProperty.call(row || {}, 'school_id')
        );

        const filteredActivities =
          supportsSchoolScope && principalRow.school_id
            ? allActivities.filter((row) => row.school_id === principalRow.school_id)
            : allActivities;

        if (!mounted) return;

        if (!supportsSchoolScope) {
          setScopeWarning(
            'The activities table does not expose a school field yet, so the list currently shows all active activities.'
          );
        }

        setActivities(filteredActivities);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [navigateTo, user?.id]);

  const schoolName = principal?.school_name || 'Your school';

  const canSubmit = useMemo(
    () => !!form.title_ar.trim() && !!form.activity_date.trim() && !!principal?.school_id,
    [form.activity_date, form.title_ar, principal?.school_id]
  );

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const reloadActivities = async () => {
    if (!principal?.school_id) return;

    const { data: rows, error } = await supabase
      .from('activities')
      .select('*')
      .eq('is_active', true)
      .order('activity_date', { ascending: true });

    if (error) return;

    const allActivities = rows || [];
    const supportsSchoolScope = allActivities.some((row) =>
      Object.prototype.hasOwnProperty.call(row || {}, 'school_id')
    );

    setActivities(
      supportsSchoolScope
        ? allActivities.filter((row) => row.school_id === principal.school_id)
        : allActivities
    );
  };

  const handleCreateActivity = async () => {
    if (!canSubmit) {
      Alert.alert('Missing data', 'Please add at least an Arabic title and activity date.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title_ar: form.title_ar.trim(),
        title_en: form.title_en.trim() || null,
        title_he: form.title_he.trim() || null,
        description_ar: form.description_ar.trim() || null,
        description_en: form.description_en.trim() || null,
        description_he: form.description_he.trim() || null,
        activity_date: form.activity_date.trim(),
        capacity: Number(form.capacity || 0) || 0,
        registered: 0,
        price: Number(form.price || 0) || 0,
        image_url:
          form.image_url.trim() ||
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
        is_active: true,
        school_id: principal.school_id,
      };

      const { error } = await supabase.from('activities').insert([payload]);

      if (error) {
        Alert.alert('Create failed', error.message || 'Could not create the activity.');
        return;
      }

      Alert.alert('Success', 'The activity was added for this school.');
      setForm(EMPTY_FORM);
      await reloadActivities();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading activities…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo?.('principalDashboard')}>
            <FontAwesome name="chevron-left" size={14} color="#1D4ED8" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>School Activities</Text>
          <Text style={styles.subtitle}>
            Manage what students from {schoolName} can see and attend.
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <FontAwesome name="calendar" size={12} color="#0F172A" />
              <Text style={styles.metaText}>{activities.length} Active Activities</Text>
            </View>
            <View style={styles.metaPill}>
              <FontAwesome name="university" size={12} color="#0F172A" />
              <Text style={styles.metaText}>{schoolName}</Text>
            </View>
          </View>
        </View>

        {!!scopeWarning && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>School filter warning</Text>
            <Text style={styles.warningText}>{scopeWarning}</Text>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Add New Activity</Text>
          <Text style={styles.sectionHint}>
            New activities are saved with this principal&apos;s `school_id`.
          </Text>

          <Field label="Arabic title *">
            <TextInput
              value={form.title_ar}
              onChangeText={(value) => updateForm('title_ar', value)}
              placeholder="مثال: ورشة برمجة"
              style={styles.input}
            />
          </Field>

          <Field label="English title">
            <TextInput
              value={form.title_en}
              onChangeText={(value) => updateForm('title_en', value)}
              placeholder="Coding Workshop"
              style={styles.input}
            />
          </Field>

          <Field label="Hebrew title">
            <TextInput
              value={form.title_he}
              onChangeText={(value) => updateForm('title_he', value)}
              placeholder="סדנת תכנות"
              style={styles.input}
            />
          </Field>

          <Field label="Activity date *">
            <TextInput
              value={form.activity_date}
              onChangeText={(value) => updateForm('activity_date', value)}
              placeholder="2026-05-01T10:00:00+03:00"
              style={styles.input}
            />
          </Field>

          <View style={styles.inlineRow}>
            <View style={styles.inlineCol}>
              <Field label="Capacity">
                <TextInput
                  value={form.capacity}
                  onChangeText={(value) => updateForm('capacity', value)}
                  placeholder="30"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </Field>
            </View>

            <View style={styles.inlineCol}>
              <Field label="Price">
                <TextInput
                  value={form.price}
                  onChangeText={(value) => updateForm('price', value)}
                  placeholder="0"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </Field>
            </View>
          </View>

          <Field label="Image URL">
            <TextInput
              value={form.image_url}
              onChangeText={(value) => updateForm('image_url', value)}
              placeholder="https://..."
              style={styles.input}
              autoCapitalize="none"
            />
          </Field>

          <Field label="Arabic description">
            <TextInput
              value={form.description_ar}
              onChangeText={(value) => updateForm('description_ar', value)}
              placeholder="وصف مختصر للفعالية"
              style={[styles.input, styles.textArea]}
              multiline
            />
          </Field>

          <Field label="English description">
            <TextInput
              value={form.description_en}
              onChangeText={(value) => updateForm('description_en', value)}
              placeholder="Short activity description"
              style={[styles.input, styles.textArea]}
              multiline
            />
          </Field>

          <Field label="Hebrew description">
            <TextInput
              value={form.description_he}
              onChangeText={(value) => updateForm('description_he', value)}
              placeholder="תיאור קצר של הפעילות"
              style={[styles.input, styles.textArea]}
              multiline
            />
          </Field>

          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
            onPress={handleCreateActivity}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome name="plus" size={14} color="#fff" />
                <Text style={styles.submitText}>Add Activity</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Visible Activities</Text>
          <Text style={styles.sectionHint}>These are the activities currently shown for this school.</Text>

          {!activities.length ? (
            <Text style={styles.emptyText}>No activities are available for this school yet.</Text>
          ) : (
            activities.map((activity) => {
              const title =
                activity.title_ar || activity.title_en || activity.title_he || 'Untitled activity';

              return (
                <View key={activity.id} style={styles.activityCard}>
                  <Text style={styles.activityTitle}>{title}</Text>
                  <Text style={styles.activityMeta}>
                    Date: {activity.activity_date || '—'} • Capacity: {activity.capacity ?? 0} • Registered:{' '}
                    {activity.registered ?? 0}
                  </Text>
                  <Text style={styles.activityDesc}>
                    {activity.description_ar ||
                      activity.description_en ||
                      activity.description_he ||
                      'No description provided.'}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F6FB' },
  content: { padding: 16, paddingBottom: 28 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6FB',
  },
  loadingText: { marginTop: 10, color: '#334155', fontWeight: '700' },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    marginBottom: 14,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 10,
  },
  backText: { color: '#1D4ED8', fontWeight: '900' },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  subtitle: { marginTop: 6, color: '#475569', fontWeight: '700', fontSize: 13 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
  },
  metaText: { color: '#0F172A', fontWeight: '800', fontSize: 12 },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningTitle: { color: '#92400E', fontWeight: '900', marginBottom: 4 },
  warningText: { color: '#92400E', lineHeight: 19, fontSize: 13 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    marginBottom: 14,
  },
  sectionTitle: { color: '#0F172A', fontWeight: '900', fontSize: 18 },
  sectionHint: { marginTop: 4, marginBottom: 14, color: '#64748B', fontSize: 13, fontWeight: '700' },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { color: '#334155', fontSize: 12, fontWeight: '800', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  inlineRow: { flexDirection: 'row', gap: 12 },
  inlineCol: { flex: 1 },
  submitBtn: {
    marginTop: 8,
    backgroundColor: '#1D4ED8',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: { backgroundColor: '#94A3B8' },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  emptyText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  activityCard: {
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  activityTitle: { color: '#0F172A', fontWeight: '900', fontSize: 15 },
  activityMeta: { marginTop: 4, color: '#475569', fontSize: 12, fontWeight: '700' },
  activityDesc: { marginTop: 8, color: '#334155', lineHeight: 20, fontSize: 13 },
});
