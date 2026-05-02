import { FontAwesome } from '@expo/vector-icons';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  findInstitutionByName,
  findMajorByName,
  localizeField,
  majorCatalog,
} from '../../data/majorCatalog';

export default function InstitutionDetailsScreen({ navigateTo, route = { params: {} } }) {
  const { i18n } = useTranslation();
  const lang = String(i18n.language || 'ar');
  const isArabic = lang.toLowerCase().startsWith('ar');
  const isHebrew = lang.toLowerCase().startsWith('he');
  const isRtl = isArabic || isHebrew;

  const institutionName = route?.params?.institutionName || '';
  const majorName = route?.params?.majorName || '';
  const institution = findInstitutionByName(institutionName);
  const matchedMajor = findMajorByName(majorName);

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

  const typeLabel = {
    university: copy.university,
    academic_college: copy.academicCollege,
    engineering_college: copy.engineeringCollege,
    education_college: copy.educationCollege,
    open_university: copy.openUniversity,
  }[institution?.typeKey || ''] || institution?.type;

  const relatedMajors = (institution?.majors || [])
    .map((majorKey) => majorCatalog.find((item) => item.key === majorKey))
    .filter(Boolean);

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
          <Text style={[styles.title, isRtl && styles.rtlText]}>{localizeField(institution.title, lang)}</Text>
          <Text style={[styles.subtitle, isRtl && styles.rtlText]}>{localizeField(institution.summary, lang)}</Text>
        </View>
      </View>

      <View style={styles.metaCard}>
        <MetaRow label={copy.type} value={typeLabel} isRtl={isRtl} />
        <MetaRow label={copy.city} value={localizeField(institution.cityLabel, lang)} isRtl={isRtl} />
        <MetaRow label={copy.website} value={institution.website} isRtl={isRtl} />
      </View>

      <Section title={copy.fields} isRtl={isRtl}>
        <View style={styles.tagsWrap}>
          {localizeField(institution.fields, lang).map((field) => (
            <View key={`${institution.code}-${field}`} style={styles.tag}>
              <Text style={styles.tagText}>{field}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title={copy.whyFit} isRtl={isRtl}>
        <Text style={[styles.bodyText, isRtl && styles.rtlText]}>
          {matchedMajor
            ? `${localizeField(matchedMajor.title, lang)}: ${localizeField(institution.admission, lang)}`
            : localizeField(institution.summary, lang)}
        </Text>
      </Section>

      <Section title={copy.admission} isRtl={isRtl}>
        <Text style={[styles.bodyText, isRtl && styles.rtlText]}>
          {localizeField(institution.admission, lang)}
        </Text>
      </Section>

      <Section title={copy.recommendedMajors} isRtl={isRtl}>
        {relatedMajors.map((major) => (
          <TouchableOpacity
            key={major.key}
            style={[styles.majorRow, isRtl && styles.majorRowRtl]}
            onPress={() => navigateTo?.('majorDetails', { majorName: localizeField(major.title, lang) })}
          >
            <Text style={[styles.majorLabel, isRtl && styles.rtlText]}>{localizeField(major.title, lang)}</Text>
            <Text style={styles.majorAction}>{copy.viewMajor}</Text>
          </TouchableOpacity>
        ))}
      </Section>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => Linking.openURL(institution.website)}>
        <Text style={styles.primaryBtnText}>{copy.openSite}</Text>
      </TouchableOpacity>

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
