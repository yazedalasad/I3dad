import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  findInstitutionByName,
  findMajorByName,
  localizeField,
  majorCatalog,
} from '../../data/majorCatalog';
import { getInstitutionById } from '../../services/institutionService';
import { getProgramsByInstitution } from '../../services/programService';

export default function InstitutionDetailsScreen({ navigateTo, route = { params: {} } }) {
  const { i18n } = useTranslation();
  const lang = String(i18n.language || 'ar');
  const isArabic = lang.toLowerCase().startsWith('ar');
  const isHebrew = lang.toLowerCase().startsWith('he');
  const isRtl = isArabic || isHebrew;

  const institutionId = route?.params?.institutionId || '';
  const institutionName = route?.params?.institutionName || '';
  const majorName = route?.params?.majorName || '';
  const catalogInstitution = findInstitutionByName(institutionName || institutionId);
  const [databaseInstitution, setDatabaseInstitution] = useState(null);
  const [institutionLoading, setInstitutionLoading] = useState(!!institutionId && !catalogInstitution);
  const institution = catalogInstitution || databaseInstitution;
  const matchedMajor = findMajorByName(majorName);
  const [programs, setPrograms] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [programsError, setProgramsError] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!institutionId || catalogInstitution) {
      setInstitutionLoading(false);
      setDatabaseInstitution(null);
      return () => {
        mounted = false;
      };
    }

    setInstitutionLoading(true);
    getInstitutionById(institutionId)
      .then((row) => {
        if (mounted) setDatabaseInstitution(row);
      })
      .finally(() => {
        if (mounted) setInstitutionLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [catalogInstitution, institutionId]);

  useEffect(() => {
    let mounted = true;
    setProgramsLoading(true);
    setProgramsError(null);
    getProgramsByInstitution(institutionId || institution?.id || institution?.code || institutionName)
      .then((result) => {
        if (!mounted) return;
        setPrograms(result.data || []);
        if (!result.success) setProgramsError(result.error || 'Failed to load programs');
      })
      .catch((error) => mounted && setProgramsError(error?.message || 'Failed to load programs'))
      .finally(() => mounted && setProgramsLoading(false));
    return () => {
      mounted = false;
    };
  }, [institutionId, institution?.id, institution?.code, institutionName]);

  const copy = isHebrew
    ? {
        fallback: 'לא נמצא מידע על המוסד.',
        type: 'סוג מוסד',
        city: 'עיר',
        website: 'אתר רשמי',
        fields: 'תחומי לימוד בולטים',
        whyFit: 'למה זה עשוי להתאים לך',
        admission: 'הערות קבלה כלליות',
        recommendedMajors: 'מסלולים קשורים',
        openSite: 'פתיחת אתר',
        browseAll: 'לכל המוסדות',
        viewMajor: 'לצפייה במסלול',
        university: 'אוניברסיטה',
        academicCollege: 'מכללה אקדמית',
        engineeringCollege: 'מכללת הנדסה',
        educationCollege: 'מכללת חינוך',
        openUniversity: 'אוניברסיטה פתוחה',
      }
    : isArabic
      ? {
          fallback: 'لم نجد معلومات عن هذه المؤسسة.',
          type: 'نوع المؤسسة',
          city: 'المدينة',
          website: 'الموقع الرسمي',
          fields: 'مجالات الدراسة البارزة',
          whyFit: 'لماذا قد تناسبك',
          admission: 'ملاحظات قبول عامة',
          recommendedMajors: 'التخصصات المرتبطة',
          openSite: 'فتح الموقع',
          browseAll: 'كل المؤسسات',
          viewMajor: 'عرض التخصص',
          university: 'جامعة',
          academicCollege: 'كلية أكاديمية',
          engineeringCollege: 'كلية هندسة',
          educationCollege: 'كلية تربية',
          openUniversity: 'جامعة مفتوحة',
        }
      : {
          fallback: 'We could not find information for this institution.',
          type: 'Institution type',
          city: 'City',
          website: 'Official website',
          fields: 'Featured study fields',
          whyFit: 'Why it may fit you',
          admission: 'General admission notes',
          recommendedMajors: 'Related majors',
          openSite: 'Open website',
          browseAll: 'All institutions',
          viewMajor: 'View major',
          university: 'University',
          academicCollege: 'Academic College',
          engineeringCollege: 'Engineering College',
          educationCollege: 'Education College',
          openUniversity: 'Open University',
        };

  const programCopy = isHebrew
    ? {
        availablePrograms: 'מסלולים זמינים',
        noPrograms: 'אין כרגע מסלולים זמינים.',
        loadingPrograms: 'טוען מסלולים...',
      }
    : isArabic
      ? {
          availablePrograms: 'البرامج المتاحة',
          noPrograms: 'لا توجد برامج متاحة حالياً',
          loadingPrograms: 'جاري تحميل البرامج...',
        }
      : {
          availablePrograms: 'Available programs',
          noPrograms: 'No available programs yet.',
          loadingPrograms: 'Loading programs...',
        };

  const institutionWebsite = institution?.website || institution?.website_url || '';
  const institutionTitle =
    localizeField(institution?.title, lang) ||
    pickLocalized(institution, 'name', lang) ||
    institution?.name ||
    institutionName;
  const institutionSummary =
    localizeField(institution?.summary, lang) ||
    pickLocalized(institution, 'description', lang) ||
    pickLocalized(institution, 'summary', lang) ||
    '';
  const institutionCity =
    localizeField(institution?.cityLabel, lang) ||
    pickLocalized(institution, 'city', lang) ||
    institution?.city ||
    '';
  const institutionFields = toList(localizeField(institution?.fields, lang));
  const admissionText =
    localizeField(institution?.admission, lang) ||
    pickLocalized(institution, 'admission_requirements', lang) ||
    institutionSummary;

  const typeLabel = {
    university: copy.university,
    academic_college: copy.academicCollege,
    engineering_college: copy.engineeringCollege,
    education_college: copy.educationCollege,
    open_university: copy.openUniversity,
  }[institution?.typeKey || institution?.institution_type || institution?.type || ''] || institution?.type || institution?.institution_type;

  const relatedMajors = (institution?.majors || [])
    .map((majorKey) => majorCatalog.find((item) => item.key === majorKey))
    .filter(Boolean);

  if (institutionLoading) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={[styles.fallbackText, isRtl && styles.rtlText]}>{programCopy.loadingPrograms}</Text>
      </View>
    );
  }

  if (!institution) {
    return (
      <View style={styles.fallbackWrap}>
        <Text style={[styles.fallbackText, isRtl && styles.rtlText]}>{copy.fallback}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={[styles.header, isRtl && styles.headerRtl]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo?.('universitiesAndColleges', { majorName })}>
          <FontAwesome name={isRtl ? 'arrow-right' : 'arrow-left'} size={16} color="#1d4ed8" />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={[styles.title, isRtl && styles.rtlText]}>{institutionTitle}</Text>
          {!!institutionSummary && <Text style={[styles.subtitle, isRtl && styles.rtlText]}>{institutionSummary}</Text>}
        </View>
      </View>

      <View style={styles.metaCard}>
        <MetaRow label={copy.type} value={typeLabel} isRtl={isRtl} />
        <MetaRow label={copy.city} value={institutionCity || '-'} isRtl={isRtl} />
        <MetaRow label={copy.website} value={institutionWebsite || '-'} isRtl={isRtl} />
      </View>

      <Section title={copy.fields} isRtl={isRtl}>
        <View style={styles.tagsWrap}>
          {(institutionFields.length ? institutionFields : programs.map((program) => pickLocalized(program, 'program_name', lang)).filter(Boolean)).map((field) => (
            <View key={`${institution.code}-${field}`} style={styles.tag}>
              <Text style={styles.tagText}>{field}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title={copy.whyFit} isRtl={isRtl}>
        <Text style={[styles.bodyText, isRtl && styles.rtlText]}>
          {matchedMajor
            ? `${localizeField(matchedMajor.title, lang)}: ${admissionText}`
            : institutionSummary}
        </Text>
      </Section>

      <Section title={copy.admission} isRtl={isRtl}>
        <Text style={[styles.bodyText, isRtl && styles.rtlText]}>
          {admissionText || '-'}
        </Text>
      </Section>

      <Section title={copy.recommendedMajors} isRtl={isRtl}>
        {relatedMajors.map((major) => (
          <TouchableOpacity
            key={major.key}
            style={[styles.majorRow, isRtl && styles.majorRowRtl]}
            onPress={() => navigateTo?.('majorDetails', { majorId: major.id || major.key, majorKey: major.key, majorName: localizeField(major.title, lang) })}
          >
            <Text style={[styles.majorLabel, isRtl && styles.rtlText]}>{localizeField(major.title, lang)}</Text>
            <Text style={styles.majorAction}>{copy.viewMajor}</Text>
          </TouchableOpacity>
        ))}
      </Section>

      <Section title={programCopy.availablePrograms} isRtl={isRtl}>
        {programsLoading ? (
          <Text style={[styles.bodyText, isRtl && styles.rtlText]}>{programCopy.loadingPrograms}</Text>
        ) : programsError ? (
          <Text style={[styles.errorText, isRtl && styles.rtlText]}>{programsError}</Text>
        ) : programs.length === 0 ? (
          <Text style={[styles.bodyText, isRtl && styles.rtlText]}>{programCopy.noPrograms}</Text>
        ) : (
          programs.map((program) => {
            const label = pickLocalized(program, 'program_name', lang) || program.program_name_en || program.major_key;
            return (
              <TouchableOpacity
                key={program.id || `${program.major_key}-${label}`}
                style={[styles.majorRow, isRtl && styles.majorRowRtl]}
                onPress={() => navigateTo?.('majorDetails', {
                  majorId: program.major_id || program.major_key,
                  majorKey: program.major_key,
                  majorName: label,
                })}
              >
                <View style={styles.programTextWrap}>
                  <Text style={[styles.majorLabel, isRtl && styles.rtlText]}>{label}</Text>
                  <Text style={[styles.programMeta, isRtl && styles.rtlText]}>
                    {[program.degree_type, program.study_duration, program.language_of_study].filter(Boolean).join(' • ')}
                  </Text>
                </View>
                <Text style={styles.majorAction}>{copy.viewMajor}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </Section>

      {!!institutionWebsite && (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => Linking.openURL(institutionWebsite)}>
          <Text style={styles.primaryBtnText}>{copy.openSite}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => navigateTo?.('universitiesAndColleges', { majorName })}
      >
        <Text style={styles.secondaryBtnText}>{copy.browseAll}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ title, children, isRtl }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isRtl && styles.rtlText]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function MetaRow({ label, value, isRtl }) {
  return (
    <View style={[styles.metaRow, isRtl && styles.metaRowRtl]}>
      <Text style={[styles.metaLabel, isRtl && styles.rtlText]}>{label}</Text>
      <Text style={[styles.metaValue, isRtl && styles.rtlText]}>{value}</Text>
    </View>
  );
}

function pickLocalized(record, field, language) {
  const normalized = String(language || '').toLowerCase().startsWith('he')
    ? 'he'
    : String(language || '').toLowerCase().startsWith('ar')
      ? 'ar'
      : 'en';
  return record?.[`${field}_${normalized}`] || record?.[`${field}_en`] || record?.[`${field}_ar`] || record?.[`${field}_he`] || '';
}

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || '')
    .split(/[،,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 28 },
  fallbackWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackText: { color: '#475569', fontWeight: '700', textAlign: 'center' },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  headerRtl: { flexDirection: 'row-reverse' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 6, color: '#475569', lineHeight: 20, fontWeight: '700' },
  metaCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metaRowRtl: { flexDirection: 'row-reverse' },
  metaLabel: { color: '#64748b', fontWeight: '800', flex: 1 },
  metaValue: { color: '#0f172a', fontWeight: '900', flex: 1 },
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  sectionBody: { marginTop: 12 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tagText: { color: '#1d4ed8', fontWeight: '800' },
  bodyText: { color: '#334155', lineHeight: 22, fontWeight: '700' },
  errorText: { color: '#dc2626', lineHeight: 22, fontWeight: '800', textAlign: 'right' },
  programTextWrap: { flex: 1 },
  programMeta: { marginTop: 4, color: '#64748b', fontWeight: '700', fontSize: 12 },
  majorRow: {
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  majorRowRtl: { flexDirection: 'row-reverse' },
  majorLabel: { flex: 1, color: '#0f172a', fontWeight: '900' },
  majorAction: { color: '#16a34a', fontWeight: '900' },
  primaryBtn: {
    marginTop: 18,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  secondaryBtn: {
    marginTop: 12,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: '#1d4ed8', fontWeight: '900' },
  rtlText: { textAlign: 'right' },
});
