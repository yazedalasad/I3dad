import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { getAdminRows } from '../../services/adminPanelService';
import { adminCreateMajor, adminUpdateMajor, getMajors } from '../../services/majorService';
import {
  adminCreateProgramLink,
  adminUpdateProgramLink,
  getAllProgramLinks,
} from '../../services/programService';
import { AdminCard, EmptyState, LoadingState, useAdminLocale } from './AdminLayout';
import { adminColors } from './adminTheme';
import { translateAdminText, useAdminTranslator } from './adminTranslations';

const initialForm = {
  id: null,
  institution_id: '',
  major_id: '',
  major_key: '',
  program_name_ar: '',
  program_name_he: '',
  program_name_en: '',
  degree_type: 'bachelor',
  study_duration: '',
  language_of_study: '',
  admission_requirements_ar: '',
  admission_requirements_he: '',
  admission_requirements_en: '',
  program_url: '',
  is_active: true,
};

const initialMajorForm = {
  id: null,
  name_ar: '',
  name_he: '',
  name_en: '',
  category: 'academic',
  description_ar: '',
  is_active: true,
};

const degreeTypeLabels = {
  ar: {
    bachelor: 'بكالوريوس',
    practical_engineer: 'هندسي عملي',
    certificate: 'شهادة',
    other: 'أخرى',
  },
  he: {
    bachelor: 'תואר ראשון',
    practical_engineer: 'הנדסאי',
    certificate: 'תעודה',
    other: 'אחר',
  },
};

const languageLabels = {
  ar: { arabic: 'العربية', hebrew: 'العبرية', english: 'الإنجليزية' },
  he: { arabic: 'ערבית', hebrew: 'עברית', english: 'אנגלית' },
};

function pickLocalized(row = {}, base, preferHebrew) {
  return preferHebrew
    ? row[`${base}_he`] || row[`${base}_ar`] || row[`${base}_en`] || row[base] || ''
    : row[`${base}_ar`] || row[`${base}_he`] || row[`${base}_en`] || row[base] || '';
}

function degreeLabel(value, isHebrew) {
  return (isHebrew ? degreeTypeLabels.he : degreeTypeLabels.ar)[value] || value || '';
}

function languageLabel(value, isHebrew) {
  return (isHebrew ? languageLabels.he : languageLabels.ar)[value] || value || '';
}

export default function InstitutionProgramsManager() {
  const tr = useAdminTranslator();
  const { isHebrew } = useAdminLocale();
  const preferHebrew = tr('اللغة') === 'שפה' || isHebrew;
  const tx = (value) => translateAdminText(tr(value), preferHebrew);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [majors, setMajors] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [majorForm, setMajorForm] = useState(initialMajorForm);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    institutionId: '',
    majorKey: '',
    degreeType: '',
    language: '',
    status: 'all',
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [institutionRows, majorRows, programRows] = await Promise.all([
        getAdminRows('institutions'),
        getMajors({ onlyActive: false }),
        getAllProgramLinks(),
      ]);
      if (!mounted) return;
      setInstitutions((institutionRows.rows || []).filter((row) => !String(row.id || '').startsWith('catalog-')));
      setMajors(majorRows.data || []);
      setPrograms(programRows.data || []);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredPrograms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return programs.filter((program) => {
      if (q && !JSON.stringify(program).toLowerCase().includes(q)) return false;
      if (filters.institutionId && program.institution_id !== filters.institutionId) return false;
      if (filters.majorKey && program.major_key !== filters.majorKey && program.major_id !== filters.majorKey) return false;
      if (filters.degreeType && program.degree_type !== filters.degreeType) return false;
      if (filters.language && !String(program.language_of_study || '').toLowerCase().includes(filters.language.toLowerCase())) return false;
      if (filters.status === 'active' && program.is_active === false) return false;
      if (filters.status === 'inactive' && program.is_active !== false) return false;
      return true;
    });
  }, [programs, search, filters]);

  const canSave = form.institution_id && (form.major_id || form.major_key) && (form.program_name_ar || form.program_name_en);

  const selectMajor = (major) => {
    setForm((current) => ({
      ...current,
      major_id: major.id,
      major_key: major.key || major.code || major.id,
      program_name_ar: current.program_name_ar || major.name_ar || '',
      program_name_he: current.program_name_he || major.name_he || '',
      program_name_en: current.program_name_en || major.name_en || '',
    }));
  };

  const editProgram = (program) => {
    setForm({
      ...initialForm,
      id: program.id,
      institution_id: program.institution_id || '',
      major_id: program.major_id || '',
      major_key: program.major_key || '',
      program_name_ar: program.program_name_ar || '',
      program_name_he: program.program_name_he || '',
      program_name_en: program.program_name_en || '',
      degree_type: program.degree_type || 'bachelor',
      study_duration: program.study_duration || '',
      language_of_study: program.language_of_study || '',
      admission_requirements_ar: program.admission_requirements_ar || '',
      admission_requirements_he: program.admission_requirements_he || '',
      admission_requirements_en: program.admission_requirements_en || '',
      program_url: program.program_url || '',
      is_active: program.is_active !== false,
    });
  };

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const result = form.id
      ? await adminUpdateProgramLink(form.id, form)
      : await adminCreateProgramLink(form);
    setSaving(false);

    if (!result.success) {
      Alert.alert(tr('تعذر حفظ البرنامج'), result.error?.message || tr('تحقق من البيانات والصلاحيات.'));
      return;
    }

    setPrograms((current) =>
      form.id
        ? current.map((item) => (item.id === form.id ? result.row : item))
        : [result.row, ...current]
    );
    setForm(initialForm);
  };

  const saveMajor = async () => {
    const result = majorForm.id
      ? await adminUpdateMajor(majorForm.id, majorForm)
      : await adminCreateMajor(majorForm);

    if (!result.success) {
      Alert.alert(tr('تعذر حفظ التخصص'), result.error?.message || tr('تحقق من البيانات والصلاحيات.'));
      return;
    }

    setMajors((current) =>
      majorForm.id
        ? current.map((item) => (item.id === majorForm.id ? result.row : item))
        : [result.row, ...current]
    );
    setMajorForm(initialMajorForm);
  };

  if (loading) {
    return (
      <AdminCard title={tx('ربط المؤسسات بالتخصصات')}>
        <LoadingState />
      </AdminCard>
    );
  }

  return (
    <AdminCard
      title={tx('ربط المؤسسات بالتخصصات')}
      subtitle={tx('اختيار مؤسسة + تخصص ثم حفظ تفاصيل البرنامج الذي يظهر في توصيات الطالب')}
    >
      <View style={styles.managerGrid}>
        <View style={styles.editor}>
          <Text style={styles.label}>{tx('المؤسسة')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {institutions.map((institution) => (
              <ChoiceChip
                key={institution.id}
                label={tx(pickLocalized(institution, 'name', preferHebrew))}
                active={form.institution_id === institution.id}
                onPress={() => setForm((current) => ({ ...current, institution_id: institution.id }))}
              />
            ))}
          </ScrollView>

          <Text style={styles.label}>{tx('التخصص')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {majors.map((major) => (
              <ChoiceChip
                key={major.id}
                label={tx(pickLocalized(major, 'name', preferHebrew) || major.key)}
                active={form.major_id === major.id || form.major_key === major.key}
                onPress={() => selectMajor(major)}
              />
            ))}
          </ScrollView>
          {!!form.major_id && (
            <TouchableOpacity
              style={styles.inlineEditBtn}
              onPress={() => {
                const selected = majors.find((major) => major.id === form.major_id || major.key === form.major_key);
                if (selected) {
                  setMajorForm({
                    ...initialMajorForm,
                    id: selected.id,
                    name_ar: selected.name_ar || '',
                    name_he: selected.name_he || '',
                    name_en: selected.name_en || '',
                    category: selected.category || 'academic',
                    description_ar: selected.description_ar || '',
                    is_active: selected.is_active !== false,
                  });
                }
              }}
            >
              <Text style={styles.inlineEditText}>{tx('تعديل التخصص المختار')}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.majorEditor}>
            <Text style={styles.sectionTitle}>{tx('إضافة / تعديل تخصص')}</Text>
            <View style={styles.formRow}>
              <Field label={tx('اسم التخصص بالعربية')} value={majorForm.name_ar} onChangeText={(value) => setMajorForm((current) => ({ ...current, name_ar: value }))} />
            <Field label={tx('שם התחום בעברית')} value={majorForm.name_he} onChangeText={(value) => setMajorForm((current) => ({ ...current, name_he: value }))} />
            </View>
            <Field label={tx('Major name in English')} value={majorForm.name_en} onChangeText={(value) => setMajorForm((current) => ({ ...current, name_en: value }))} />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMajorForm(initialMajorForm)}>
                <Text style={styles.secondaryText}>{tx('مسح')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!majorForm.name_ar || !majorForm.name_en) && styles.disabled]}
                onPress={saveMajor}
                disabled={!majorForm.name_ar || !majorForm.name_en}
              >
                <FontAwesome name="graduation-cap" size={14} color="#fff" />
                <Text style={styles.saveText}>{tx(majorForm.id ? 'حفظ التخصص' : 'إضافة تخصص')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formRow}>
            <Field label={tx('اسم البرنامج بالعربية')} value={form.program_name_ar} onChangeText={(value) => setForm((current) => ({ ...current, program_name_ar: value }))} />
            <Field label={tx('שם המסלול בעברית')} value={form.program_name_he} onChangeText={(value) => setForm((current) => ({ ...current, program_name_he: value }))} />
          </View>
          <Field label={tx('Program name in English')} value={form.program_name_en} onChangeText={(value) => setForm((current) => ({ ...current, program_name_en: value }))} />

          <Text style={styles.label}>{tx('نوع الشهادة')}</Text>
          <View style={styles.chipRow}>
            {['bachelor', 'practical_engineer', 'certificate', 'other'].map((degreeType) => (
              <ChoiceChip
                key={degreeType}
                label={tx(degreeLabel(degreeType, preferHebrew))}
                active={form.degree_type === degreeType}
                onPress={() => setForm((current) => ({ ...current, degree_type: degreeType }))}
              />
            ))}
          </View>

          <View style={styles.formRow}>
            <Field label={tx('مدة الدراسة')} value={form.study_duration} onChangeText={(value) => setForm((current) => ({ ...current, study_duration: value }))} />
            <Field label={tx('لغة الدراسة')} value={form.language_of_study} onChangeText={(value) => setForm((current) => ({ ...current, language_of_study: value }))} />
          </View>
          <Field label={tx('شروط القبول بالعربية')} value={form.admission_requirements_ar} onChangeText={(value) => setForm((current) => ({ ...current, admission_requirements_ar: value }))} multiline />
          <Field label={tx('رابط البرنامج')} value={form.program_url} onChangeText={(value) => setForm((current) => ({ ...current, program_url: value }))} placeholder="https://example.ac.il/program" />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setForm(initialForm)}>
              <Text style={styles.secondaryText}>{tx('إلغاء')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, (!canSave || saving) && styles.disabled]} onPress={save} disabled={!canSave || saving}>
              <FontAwesome name="link" size={14} color="#fff" />
              <Text style={styles.saveText}>{tx(saving ? 'جاري الحفظ...' : form.id ? 'حفظ التعديل' : 'إنشاء الربط')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.list}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={tx('بحث في البرامج')}
            placeholderTextColor={adminColors.muted}
            style={styles.search}
            textAlign="right"
          />
          <View style={styles.filterPanel}>
            <Text style={styles.sectionTitle}>{tx('فلاتر البرامج')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <ChoiceChip label={tx('كل المؤسسات')} active={!filters.institutionId} onPress={() => setFilters((current) => ({ ...current, institutionId: '' }))} />
              {institutions.map((institution) => (
                <ChoiceChip
                  key={`filter-inst-${institution.id}`}
                  label={tx(pickLocalized(institution, 'name', preferHebrew))}
                  active={filters.institutionId === institution.id}
                  onPress={() => setFilters((current) => ({ ...current, institutionId: institution.id }))}
                />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <ChoiceChip label={tx('كل التخصصات')} active={!filters.majorKey} onPress={() => setFilters((current) => ({ ...current, majorKey: '' }))} />
              {majors.map((major) => (
                <ChoiceChip
                  key={`filter-major-${major.id}`}
                  label={tx(pickLocalized(major, 'name', preferHebrew) || major.key)}
                  active={filters.majorKey === (major.key || major.code || major.id)}
                  onPress={() => setFilters((current) => ({ ...current, majorKey: major.key || major.code || major.id }))}
                />
              ))}
            </ScrollView>
            <View style={styles.chipRow}>
              {['', 'bachelor', 'practical_engineer', 'certificate', 'other'].map((degreeType) => (
                <ChoiceChip
                  key={`filter-degree-${degreeType || 'all'}`}
                  label={degreeType ? tx(degreeLabel(degreeType, preferHebrew)) : tx('كل الشهادات')}
                  active={filters.degreeType === degreeType}
                  onPress={() => setFilters((current) => ({ ...current, degreeType }))}
                />
              ))}
            </View>
            <View style={styles.chipRow}>
              {['', 'arabic', 'hebrew', 'english'].map((language) => (
                <ChoiceChip
                  key={`filter-language-${language || 'all'}`}
                  label={language ? tx(languageLabel(language, preferHebrew)) : tx('كل اللغات')}
                  active={filters.language === language}
                  onPress={() => setFilters((current) => ({ ...current, language }))}
                />
              ))}
            </View>
            <View style={styles.chipRow}>
              {['all', 'active', 'inactive'].map((status) => (
                <ChoiceChip
                  key={`filter-status-${status}`}
                  label={tx(status === 'all' ? 'الكل' : status === 'active' ? 'نشط' : 'معطل')}
                  active={filters.status === status}
                  onPress={() => setFilters((current) => ({ ...current, status }))}
                />
              ))}
            </View>
          </View>
          {!filteredPrograms.length ? (
            <EmptyState title={tx('لا توجد برامج مرتبطة بعد')} icon="link" />
          ) : (
            filteredPrograms.map((program) => (
              <TouchableOpacity key={program.id} style={styles.programRow} onPress={() => editProgram(program)}>
                <Text style={styles.programTitle}>{tx(pickLocalized(program, 'program_name', preferHebrew) || program.program_name_en)}</Text>
                <Text style={styles.programSub}>
                  {[pickLocalized(program.institution || {}, 'name', preferHebrew), pickLocalized(program.major || {}, 'name', preferHebrew) || program.major_key, degreeLabel(program.degree_type, preferHebrew)]
                    .filter(Boolean)
                    .map((value) => tx(value))
                    .join(' • ')}
                </Text>
                <Text style={[styles.status, program.is_active === false && styles.statusOff]}>
                  {program.is_active === false ? tx('معطل') : tx('نشط')}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </AdminCard>
  );
}

function ChoiceChip({ label, active, onPress }) {
  const tr = useAdminTranslator();
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{tr(label)}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, ...props }) {
  const tr = useAdminTranslator();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{tr(label)}</Text>
      <TextInput
        {...props}
        placeholder={tr(props.placeholder)}
        placeholderTextColor={adminColors.muted}
        style={[styles.input, props.multiline && styles.textarea]}
        textAlign="right"
        writingDirection="rtl"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  managerGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 14 },
  editor: { flexGrow: 1, flexBasis: 360 },
  list: { flexGrow: 1, flexBasis: 320 },
  filterPanel: { borderRadius: 16, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff', padding: 10, marginBottom: 10 },
  label: { marginBottom: 6, color: adminColors.text, fontWeight: '900', fontSize: 17, textAlign: 'right' },
  chipRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, paddingBottom: 10 },
  chip: { maxWidth: 220, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff' },
  chipActive: { backgroundColor: adminColors.softBlue, borderColor: '#BBD0FF' },
  chipText: { color: adminColors.muted, fontWeight: '900' },
  chipTextActive: { color: adminColors.primary },
  inlineEditBtn: { alignSelf: 'flex-end', marginBottom: 10, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: adminColors.softBlue },
  inlineEditText: { color: adminColors.primary, fontWeight: '900', fontSize: 17 },
  majorEditor: { borderRadius: 16, borderWidth: 1, borderColor: adminColors.border, backgroundColor: adminColors.bg, padding: 12, marginBottom: 12 },
  sectionTitle: { color: adminColors.text, fontWeight: '900', textAlign: 'right', marginBottom: 8 },
  formRow: { flexDirection: 'row-reverse', gap: 10 },
  field: { flex: 1, marginBottom: 10 },
  input: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: adminColors.bg, color: adminColors.text, paddingHorizontal: 12, fontWeight: '800' },
  textarea: { minHeight: 80, paddingTop: 10, textAlignVertical: 'top' },
  actions: { marginTop: 4, flexDirection: 'row-reverse', gap: 10 },
  saveBtn: { minHeight: 42, borderRadius: 14, backgroundColor: adminColors.primary2, paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { color: '#fff', fontWeight: '900' },
  secondaryBtn: { minHeight: 42, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: adminColors.border, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: adminColors.text, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  search: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: adminColors.bg, color: adminColors.text, paddingHorizontal: 12, marginBottom: 10, fontWeight: '800' },
  programRow: { borderRadius: 16, borderWidth: 1, borderColor: adminColors.border, backgroundColor: '#fff', padding: 12, marginBottom: 10, alignItems: 'flex-end' },
  programTitle: { color: adminColors.text, fontWeight: '900', textAlign: 'right' },
  programSub: { marginTop: 5, color: adminColors.muted, fontWeight: '700', textAlign: 'right', lineHeight: 18 },
  status: { marginTop: 8, color: adminColors.success, fontWeight: '900' },
  statusOff: { color: adminColors.danger },
});
