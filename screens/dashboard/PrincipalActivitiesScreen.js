import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentPrincipal, localizedPrincipalSchoolName, recordPrincipalAudit } from '../../services/principalExperienceService';

const EMPTY_FORM = {
  title_ar: '',
  title_he: '',
  category_id: '',
  city_ar: '',
  city_he: '',
  activity_date: '',
  start_time: '',
  end_time: '',
  location_ar: '',
  location_he: '',
  organizer_ar: '',
  organizer_he: '',
  description_ar: '',
  description_he: '',
  capacity: '',
  target_audience: 'students',
  difficulty_level: 'beginner',
  subject_relevance: [],
  image_url: '',
  status: 'upcoming',
  is_active: true,
};

const AUDIENCE_OPTIONS = [
  { id: 'students' },
  { id: 'teachers' },
  { id: 'administrators' },
  { id: 'all' },
];

const DIFFICULTY_OPTIONS = [
  { id: 'beginner' },
  { id: 'intermediate' },
  { id: 'advanced' },
  { id: 'all' },
];

const STATUS_OPTIONS = [
  { id: 'upcoming' },
  { id: 'ongoing' },
  { id: 'completed' },
  { id: 'cancelled' },
];

const REGISTRATION_STATUSES = ['pending', 'confirmed', 'waiting_list', 'cancelled', 'attended'];

export default function PrincipalActivitiesScreen({ navigateTo }) {
  const { t, i18n } = useTranslation('principal');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [principal, setPrincipal] = useState(null);
  const [activities, setActivities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [registrationLoading, setRegistrationLoading] = useState(false);

  const schoolName = localizedPrincipalSchoolName(principal, i18n.language, t('dashboard.fallbackSchool'));

  useEffect(() => {
    loadAll();
  }, [user?.id]);

  const canSubmit = useMemo(() => {
    return Boolean(
      principal?.school_id &&
        form.title_ar.trim() &&
        form.title_he.trim() &&
        form.category_id &&
        form.city_ar.trim() &&
        form.city_he.trim() &&
        form.activity_date.trim() &&
        form.start_time.trim() &&
        form.location_ar.trim() &&
        form.location_he.trim() &&
        form.organizer_ar.trim() &&
        form.organizer_he.trim() &&
        form.description_ar.trim() &&
        form.description_he.trim()
    );
  }, [form, principal?.school_id]);

  async function loadAll() {
    if (!user?.id) {
      navigateTo?.('login');
      return;
    }

    try {
      setLoading(true);
      const principalRow = await getCurrentPrincipal();
      setPrincipal(principalRow);

      const [activitiesRes, categoriesRes, subjectsRes, studentsRes] = await Promise.all([
        supabase
          .from('activities')
          .select('*')
          .order('activity_date', { ascending: true }),
        supabase
          .from('activity_categories')
          .select('id, code, name_ar, name_he, name_en')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase.from('subjects').select('id, name_ar, name_he, name_en').eq('is_active', true),
        supabase
          .from('students')
          .select('id, user_id, first_name, last_name, full_name, email, grade, class_section, school_id, is_active')
          .eq('school_id', principalRow.school_id)
          .eq('is_active', true)
          .order('grade', { ascending: true }),
      ]);

      if (activitiesRes.error) throw activitiesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (studentsRes.error) throw studentsRes.error;

      setActivities(activitiesRes.data || []);
      setCategories(categoriesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (error) {
      Alert.alert(t('activities.loadError'), error.message || t('common.unexpectedError'));
    } finally {
      setLoading(false);
    }
  }

  function resetForm(next = EMPTY_FORM) {
    setForm({ ...EMPTY_FORM, ...next });
  }

  function openCreateForm() {
    setEditingActivity(null);
    resetForm({ category_id: categories[0]?.id || '' });
    setFormVisible(true);
  }

  function openEditForm(activity) {
    setEditingActivity(activity);
    resetForm({
      title_ar: activity.title_ar || '',
      title_he: activity.title_he || '',
      category_id: activity.category_id || categories[0]?.id || '',
      city_ar: activity.city_ar || '',
      city_he: activity.city_he || '',
      activity_date: activity.activity_date || '',
      start_time: activity.start_time || '',
      end_time: activity.end_time || '',
      location_ar: activity.location_ar || '',
      location_he: activity.location_he || '',
      organizer_ar: activity.organizer_ar || '',
      organizer_he: activity.organizer_he || '',
      description_ar: activity.description_ar || '',
      description_he: activity.description_he || '',
      capacity: String(activity.capacity ?? ''),
      target_audience: activity.target_audience || 'students',
      difficulty_level: activity.difficulty_level || 'beginner',
      subject_relevance: Array.isArray(activity.subject_relevance) ? activity.subject_relevance : [],
      image_url: activity.image_url || '',
      status: activity.status || 'upcoming',
      is_active: activity.is_active !== false,
    });
    setFormVisible(true);
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleSubject(subjectId) {
    setForm((current) => {
      const list = Array.isArray(current.subject_relevance) ? current.subject_relevance : [];
      return {
        ...current,
        subject_relevance: list.includes(subjectId)
          ? list.filter((id) => id !== subjectId)
          : [...list, subjectId],
      };
    });
  }

  function principalCanEdit(activity) {
    return (
      activity?.created_by === user?.id &&
      activity?.created_by_role === 'principal' &&
      activity?.visibility === 'school_only' &&
      activity?.school_id === principal?.school_id
    );
  }

  function buildPayload() {
    return {
      title_ar: form.title_ar.trim(),
      title_he: form.title_he.trim(),
      category_id: form.category_id,
      city_ar: form.city_ar.trim(),
      city_he: form.city_he.trim(),
      activity_date: form.activity_date.trim(),
      start_time: form.start_time.trim(),
      end_time: form.end_time.trim() || null,
      location_ar: form.location_ar.trim(),
      location_he: form.location_he.trim(),
      organizer_ar: form.organizer_ar.trim(),
      organizer_he: form.organizer_he.trim(),
      description_ar: form.description_ar.trim(),
      description_he: form.description_he.trim(),
      capacity: Number(form.capacity || 0) || 0,
      target_audience: form.target_audience,
      difficulty_level: form.difficulty_level,
      subject_relevance: form.subject_relevance || [],
      image_url: form.image_url.trim() || null,
      status: form.status || 'upcoming',
      is_active: form.is_active !== false,
      featured: false,
      school_id: principal.school_id,
      created_by: user.id,
      created_by_role: 'principal',
      visibility: 'school_only',
      is_global: false,
      price: 0,
    };
  }

  async function handleSaveActivity() {
    if (!canSubmit) {
      Alert.alert(t('activities.missingDataTitle'), t('activities.missingDataBody'));
      return;
    }

    try {
      setSubmitting(true);
      const payload = buildPayload();
      const isEdit = Boolean(editingActivity?.id);

      const query = isEdit
        ? supabase
            .from('activities')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', editingActivity.id)
            .eq('created_by', user.id)
            .eq('school_id', principal.school_id)
            .eq('created_by_role', 'principal')
            .eq('visibility', 'school_only')
        : supabase.from('activities').insert([{ ...payload, registered: 0 }]);

      const { data, error } = await query.select('*').maybeSingle();
      if (error) throw error;

      await recordPrincipalAudit({
        action: isEdit
          ? payload.status === 'cancelled'
            ? 'principal_cancel_school_activity'
            : 'principal_update_school_activity'
          : 'principal_create_school_activity',
        entityType: 'activity',
        entityId: data?.id || editingActivity?.id,
        page: 'principalActivities',
        metadata: { school_id: principal.school_id, visibility: 'school_only' },
      });

      setFormVisible(false);
      setEditingActivity(null);
      resetForm();
      await loadAll();
      Alert.alert(t('common.saved'), isEdit ? t('activities.updated') : t('activities.created'));
    } catch (error) {
      Alert.alert(t('activities.saveError'), error.message || t('common.reviewAndTryAgain'));
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelActivity(activity) {
    if (!principalCanEdit(activity)) return;

    try {
      const { error } = await supabase
        .from('activities')
        .update({ status: 'cancelled', is_active: false, updated_at: new Date().toISOString() })
        .eq('id', activity.id)
        .eq('created_by', user.id)
        .eq('school_id', principal.school_id)
        .eq('created_by_role', 'principal')
        .eq('visibility', 'school_only');
      if (error) throw error;

      await recordPrincipalAudit({
        action: 'principal_cancel_school_activity',
        entityType: 'activity',
        entityId: activity.id,
        page: 'principalActivities',
        metadata: { school_id: principal.school_id },
      });
      await loadAll();
    } catch (error) {
      Alert.alert(t('activities.cancelError'), error.message || t('common.tryAgain'));
    }
  }

  async function openRegistrations(activity) {
    setSelectedActivity(activity);
    setSelectedStudentId(students[0]?.id || '');
    await loadRegistrations(activity);
  }

  async function loadRegistrations(activity = selectedActivity) {
    if (!activity?.id || !principal?.school_id) return;

    try {
      setRegistrationLoading(true);
      const { data, error } = await supabase
        .from('activity_registrations')
        .select('*')
        .eq('activity_id', activity.id)
        .eq('school_id', principal.school_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      Alert.alert(t('activities.registrationsLoadError'), error.message || t('common.unexpectedError'));
    } finally {
      setRegistrationLoading(false);
    }
  }

  async function registerStudent() {
    if (!selectedActivity?.id || !selectedStudentId) return;
    const student = students.find((item) => item.id === selectedStudentId);
    if (!student || student.school_id !== principal.school_id) {
      Alert.alert(t('activities.notAllowed'), t('activities.sameSchoolOnly'));
      return;
    }

    try {
      setRegistrationLoading(true);
      const payload = {
        activity_id: selectedActivity.id,
        student_id: selectedStudentId,
        school_id: principal.school_id,
        user_id: user.id,
        registered_by: user.id,
        status: 'pending',
        registration_type: 'individual',
        num_participants: 1,
        student_ids: [selectedStudentId],
      };
      const { error } = await supabase.from('activity_registrations').insert([payload]);
      if (error) throw error;

      await recordPrincipalAudit({
        action: 'principal_register_student_to_activity',
        entityType: 'activity_registration',
        entityId: selectedActivity.id,
        page: 'principalActivities',
        metadata: { student_id: selectedStudentId, school_id: principal.school_id },
      });
      await loadRegistrations();
    } catch (error) {
      Alert.alert(t('activities.registerStudentError'), error.message || t('activities.studentMayExist'));
    } finally {
      setRegistrationLoading(false);
    }
  }

  async function updateRegistrationStatus(registration, status) {
    try {
      setRegistrationLoading(true);
      const { error } = await supabase
        .from('activity_registrations')
        .update({ status, attended: status === 'attended', updated_at: new Date().toISOString() })
        .eq('id', registration.id)
        .eq('school_id', principal.school_id);
      if (error) throw error;

      await recordPrincipalAudit({
        action: 'principal_update_activity_registration',
        entityType: 'activity_registration',
        entityId: registration.id,
        page: 'principalActivities',
        metadata: { status, school_id: principal.school_id },
      });
      await loadRegistrations();
    } catch (error) {
      Alert.alert(t('activities.updateRegistrationError'), error.message || t('common.tryAgain'));
    } finally {
      setRegistrationLoading(false);
    }
  }

  function studentName(studentId) {
    const student = students.find((item) => item.id === studentId);
    if (!student) return t('common.student');
    return student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.email;
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.loadingText}>{t('activities.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo?.('principalDashboard')}>
            <FontAwesome name="chevron-left" size={13} color="#047857" />
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{t('activities.title')}</Text>
          <Text style={styles.subtitle}>{t('activities.subtitle', { school: schoolName })}</Text>

          <View style={styles.headerActions}>
            <View style={styles.metaPill}>
              <FontAwesome name="calendar" size={12} color="#064E3B" />
              <Text style={styles.metaText}>{t('activities.visibleCount', { count: activities.length })}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={openCreateForm}>
              <FontAwesome name="plus" size={13} color="#fff" />
              <Text style={styles.addBtnText}>{t('activities.addSchoolActivity')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!activities.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('activities.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('activities.emptyBody')}</Text>
          </View>
        ) : (
          activities.map((activity) => {
            const editable = principalCanEdit(activity);
            const isGlobal = activity.visibility === 'global';
            return (
              <View key={activity.id} style={styles.activityCard}>
                <View style={styles.activityTop}>
                  <View style={styles.activityTitleWrap}>
                    <Text style={styles.activityTitle}>{activity.title_ar || activity.title_he}</Text>
                    <Text style={styles.activityMeta}>
                      {activity.activity_date || '-'} | {activity.start_time || '-'} | {activity.status || 'upcoming'}
                    </Text>
                  </View>
                  <View style={[styles.scopeBadge, isGlobal ? styles.globalBadge : styles.schoolBadge]}>
                    <Text style={[styles.scopeText, isGlobal ? styles.globalText : styles.schoolText]}>
                      {isGlobal ? t('activities.global') : t('activities.schoolOnly')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.activityDesc}>{activity.description_ar || activity.description_he}</Text>
                <Text style={styles.activityMeta}>
                  {t('activities.capacity')}: {activity.capacity ?? 0} | {t('activities.registered')}: {activity.registered ?? 0} | {t('activities.audienceLabel')}:{' '}
                  {t(`activities.audience.${activity.target_audience || 'students'}`)}
                </Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => openRegistrations(activity)}>
                    <FontAwesome name="users" size={13} color="#047857" />
                    <Text style={styles.secondaryBtnText}>{t('activities.registrants')}</Text>
                  </TouchableOpacity>
                  {editable && (
                    <>
                      <TouchableOpacity style={styles.secondaryBtn} onPress={() => openEditForm(activity)}>
                        <FontAwesome name="pencil" size={13} color="#047857" />
                        <Text style={styles.secondaryBtnText}>{t('activities.edit')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.dangerBtn} onPress={() => cancelActivity(activity)}>
                        <FontAwesome name="ban" size={13} color="#B91C1C" />
                        <Text style={styles.dangerBtnText}>{t('activities.cancel')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <ActivityFormModal
        visible={formVisible}
        editing={Boolean(editingActivity)}
        form={form}
        categories={categories}
        subjects={subjects}
        submitting={submitting}
        canSubmit={canSubmit}
        onChange={setField}
        onToggleSubject={toggleSubject}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveActivity}
      />

      <RegistrationsModal
        visible={Boolean(selectedActivity)}
        activity={selectedActivity}
        students={students}
        registrations={registrations}
        selectedStudentId={selectedStudentId}
        loading={registrationLoading}
        studentName={studentName}
        onSelectStudent={setSelectedStudentId}
        onRegister={registerStudent}
        onUpdateStatus={updateRegistrationStatus}
        onClose={() => {
          setSelectedActivity(null);
          setRegistrations([]);
        }}
      />
    </View>
  );
}

function ActivityFormModal({
  visible,
  editing,
  form,
  categories,
  subjects,
  submitting,
  canSubmit,
  onChange,
  onToggleSubject,
  onClose,
  onSave,
}) {
  const { t } = useTranslation('principal');
  const audienceOptions = AUDIENCE_OPTIONS.map((item) => ({ ...item, label: t(`activities.audience.${item.id}`) }));
  const difficultyOptions = DIFFICULTY_OPTIONS.map((item) => ({ ...item, label: t(`activities.difficulty.${item.id}`) }));
  const statusOptions = STATUS_OPTIONS.map((item) => ({ ...item, label: t(`activities.status.${item.id}`) }));

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalLayer}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <FontAwesome name="times" size={14} color="#064E3B" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editing ? t('activities.editSchoolActivity') : t('activities.addSchoolActivity')}</Text>
            </View>

            <Field label={t('activities.fields.titleAr')} value={form.title_ar} onChangeText={(v) => onChange('title_ar', v)} />
            <Field label={t('activities.fields.titleHe')} value={form.title_he} onChangeText={(v) => onChange('title_he', v)} />

            <Text style={styles.fieldLabel}>{t('activities.fields.category')}</Text>
            <ChipGroup
              options={categories.map((item) => ({ id: item.id, label: item.name_ar || item.name_he || item.name_en }))}
              value={form.category_id}
              onChange={(id) => onChange('category_id', id)}
            />

            <View style={styles.twoCols}>
              <Field label={t('activities.fields.cityAr')} value={form.city_ar} onChangeText={(v) => onChange('city_ar', v)} />
              <Field label={t('activities.fields.cityHe')} value={form.city_he} onChangeText={(v) => onChange('city_he', v)} />
            </View>

            <View style={styles.twoCols}>
              <Field label={t('activities.fields.date')} value={form.activity_date} onChangeText={(v) => onChange('activity_date', v)} />
              <Field label={t('activities.fields.startTime')} value={form.start_time} onChangeText={(v) => onChange('start_time', v)} />
            </View>

            <Field label={t('activities.fields.endTime')} value={form.end_time} onChangeText={(v) => onChange('end_time', v)} />
            <Field label={t('activities.fields.locationAr')} value={form.location_ar} onChangeText={(v) => onChange('location_ar', v)} />
            <Field label={t('activities.fields.locationHe')} value={form.location_he} onChangeText={(v) => onChange('location_he', v)} />
            <Field label={t('activities.fields.organizerAr')} value={form.organizer_ar} onChangeText={(v) => onChange('organizer_ar', v)} />
            <Field label={t('activities.fields.organizerHe')} value={form.organizer_he} onChangeText={(v) => onChange('organizer_he', v)} />
            <Field label={t('activities.fields.descriptionAr')} value={form.description_ar} onChangeText={(v) => onChange('description_ar', v)} multiline />
            <Field label={t('activities.fields.descriptionHe')} value={form.description_he} onChangeText={(v) => onChange('description_he', v)} multiline />
            <Field label={t('activities.fields.capacity')} value={form.capacity} onChangeText={(v) => onChange('capacity', v)} keyboardType="numeric" />

            <Text style={styles.fieldLabel}>{t('activities.fields.targetAudience')}</Text>
            <ChipGroup options={audienceOptions} value={form.target_audience} onChange={(id) => onChange('target_audience', id)} />

            <Text style={styles.fieldLabel}>{t('activities.fields.difficulty')}</Text>
            <ChipGroup options={difficultyOptions} value={form.difficulty_level} onChange={(id) => onChange('difficulty_level', id)} />

            <Text style={styles.fieldLabel}>{t('activities.fields.status')}</Text>
            <ChipGroup options={statusOptions} value={form.status} onChange={(id) => onChange('status', id)} />

            <Text style={styles.fieldLabel}>{t('activities.fields.subjects')}</Text>
            <View style={styles.chipWrap}>
              {subjects.map((subject) => {
                const selected = form.subject_relevance?.includes(subject.id);
                return (
                  <TouchableOpacity
                    key={subject.id}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => onToggleSubject(subject.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                      {subject.name_ar || subject.name_he || subject.name_en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Field label={t('activities.fields.imageUrl')} value={form.image_url} onChangeText={(v) => onChange('image_url', v)} autoCapitalize="none" />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
                <Text style={styles.cancelBtnText}>{t('activities.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!canSubmit || submitting) && styles.saveBtnDisabled]}
                onPress={onSave}
                disabled={!canSubmit || submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('account.save')}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function RegistrationsModal({
  visible,
  activity,
  students,
  registrations,
  selectedStudentId,
  loading,
  studentName,
  onSelectStudent,
  onRegister,
  onUpdateStatus,
  onClose,
}) {
  const { t } = useTranslation('principal');
  const registrationOptions = REGISTRATION_STATUSES.map((status) => ({ id: status, label: t(`activities.registrationStatus.${status}`) }));

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalLayer}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <FontAwesome name="times" size={14} color="#064E3B" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('activities.registrantsTitle')}</Text>
            </View>

            <Text style={styles.sectionHint}>{activity?.title_ar || activity?.title_he}</Text>
            <Text style={styles.fieldLabel}>{t('activities.registerStudentFromSchool')}</Text>
            <ChipGroup
              options={students.map((student) => ({ id: student.id, label: studentName(student.id) }))}
              value={selectedStudentId}
              onChange={onSelectStudent}
            />
            <TouchableOpacity style={styles.addBtnWide} onPress={onRegister} disabled={loading || !selectedStudentId}>
              <FontAwesome name="user-plus" size={13} color="#fff" />
              <Text style={styles.addBtnText}>{t('activities.registerStudent')}</Text>
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator color="#16A34A" style={{ marginTop: 16 }} />
            ) : !registrations.length ? (
              <Text style={styles.emptyText}>{t('activities.noRegistrations')}</Text>
            ) : (
              registrations.map((registration) => (
                <View key={registration.id} style={styles.registrationCard}>
                  <Text style={styles.activityTitle}>{studentName(registration.student_id)}</Text>
                  <Text style={styles.activityMeta}>{t('activities.currentStatus')}: {t(`activities.registrationStatus.${registration.status}`)}</Text>
                  <View style={styles.chipWrap}>
                    {registrationOptions.map(({ id: status, label }) => (
                      <TouchableOpacity
                        key={status}
                        style={[styles.chip, registration.status === status && styles.chipActive]}
                        onPress={() => onUpdateStatus(registration, status)}
                      >
                        <Text style={[styles.chipText, registration.status === status && styles.chipTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, value, onChangeText, multiline, keyboardType, autoCapitalize }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.textArea]}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        textAlign="right"
      />
    </View>
  );
}

function ChipGroup({ options, value, onChange }) {
  return (
    <View style={styles.chipWrap}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <TouchableOpacity key={option.id} style={[styles.chip, selected && styles.chipActive]} onPress={() => onChange(option.id)}>
            <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0FDF4' },
  content: { padding: 16, paddingBottom: 30 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDF4' },
  loadingText: { marginTop: 10, color: '#064E3B', fontWeight: '900' },
  header: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 14 },
  backBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#ECFDF5', marginBottom: 10 },
  backText: { color: '#047857', fontWeight: '900' },
  title: { color: '#064E3B', fontSize: 25, fontWeight: '900', textAlign: 'right' },
  subtitle: { color: '#475569', fontWeight: '700', marginTop: 6, textAlign: 'right' },
  headerActions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 14, alignItems: 'center', justifyContent: 'space-between' },
  metaPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 999, backgroundColor: '#DCFCE7', paddingHorizontal: 11, paddingVertical: 9 },
  metaText: { color: '#064E3B', fontWeight: '900', fontSize: 17 },
  addBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16A34A', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  addBtnWide: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16A34A', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 10 },
  addBtnText: { color: '#fff', fontWeight: '900' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#BBF7D0', padding: 22, alignItems: 'center' },
  emptyTitle: { color: '#064E3B', fontWeight: '900', fontSize: 18 },
  emptyText: { color: '#64748B', fontWeight: '700', marginTop: 8, textAlign: 'right' },
  activityCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 12 },
  activityTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  activityTitleWrap: { flex: 1 },
  activityTitle: { color: '#064E3B', fontSize: 16, fontWeight: '900', textAlign: 'right' },
  activityMeta: { color: '#64748B', fontWeight: '700', fontSize: 17, marginTop: 5, textAlign: 'right' },
  activityDesc: { color: '#334155', lineHeight: 21, marginTop: 10, textAlign: 'right' },
  scopeBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  globalBadge: { backgroundColor: '#E0E7FF' },
  schoolBadge: { backgroundColor: '#DCFCE7' },
  scopeText: { fontWeight: '900', fontSize: 16 },
  globalText: { color: '#3730A3' },
  schoolText: { color: '#047857' },
  cardActions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  secondaryBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0' },
  secondaryBtnText: { color: '#047857', fontWeight: '900' },
  dangerBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  dangerBtnText: { color: '#B91C1C', fontWeight: '900' },
  modalLayer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6, 78, 59, 0.36)' },
  modalCard: { width: '100%', maxWidth: 760, maxHeight: '94%', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#BBF7D0' },
  modalContent: { padding: 16, paddingBottom: 22 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: '#064E3B', fontSize: 20, fontWeight: '900', textAlign: 'right', flex: 1 },
  closeBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0' },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { color: '#064E3B', fontWeight: '900', fontSize: 17, marginBottom: 7, textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, color: '#0F172A', backgroundColor: '#F8FAFC' },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  twoCols: { gap: 10 },
  chipWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#D1FAE5' },
  chipActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  chipText: { color: '#047857', fontWeight: '900', fontSize: 17 },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row-reverse', gap: 10, justifyContent: 'flex-start', marginTop: 8 },
  saveBtn: { minHeight: 44, minWidth: 120, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16A34A', paddingHorizontal: 16 },
  saveBtnDisabled: { backgroundColor: '#94A3B8' },
  saveBtnText: { color: '#fff', fontWeight: '900' },
  cancelBtn: { minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BBF7D0', paddingHorizontal: 16 },
  cancelBtnText: { color: '#064E3B', fontWeight: '900' },
  sectionHint: { color: '#475569', fontWeight: '800', marginBottom: 12, textAlign: 'right' },
  registrationCard: { borderRadius: 14, borderWidth: 1, borderColor: '#D1FAE5', backgroundColor: '#F8FAFC', padding: 12, marginBottom: 10 },
});
