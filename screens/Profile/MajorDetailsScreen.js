import { FontAwesome } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  findMajorByName,
  institutionsCatalog,
  localizeField,
  majorCatalog,
} from '../../data/majorCatalog';

export default function MajorDetailsScreen({ navigateTo, route = { params: {} } }) {
  const { i18n } = useTranslation();
  const majorName = route?.params?.majorName || route?.params?.major || '';
  const matchedMajor = useMemo(() => findMajorByName(majorName) || majorCatalog[0], [majorName]);
  const isArabic = String(i18n.language || '').toLowerCase().startsWith('ar');
  const isHebrew = String(i18n.language || '').toLowerCase().startsWith('he');
  const isRtl = isArabic || isHebrew;

  const institutions = institutionsCatalog.filter((institution) =>
    matchedMajor?.institutions?.includes(institution.name)
  );

  const copy = isHebrew
    ? {
        requiredSkills: 'מיומנויות נדרשות',
        bagrut: 'מקצועות בגרות חשובים',
        careers: 'אפשרויות תעסוקה',
        institutions: 'אוניברסיטאות ומכללות קרובות',
        miniTask: 'נסו משימת טעימה',
        allInstitutions: 'לכל המוסדות',
        details: 'צפייה בפרטים',
      }
    : isArabic
      ? {
          requiredSkills: 'المهارات المطلوبة',
          bagrut: 'مواد بجروت مهمة',
          careers: 'مسارات مهنية',
          institutions: 'جامعات وكليات قريبة',
          miniTask: 'جرّب مهمة قصيرة',
          allInstitutions: 'كل المؤسسات',
          details: 'عرض التفاصيل',
        }
      : {
          requiredSkills: 'Required skills',
          bagrut: 'Important Bagrut subjects',
          careers: 'Career paths',
          institutions: 'Nearby universities and colleges',
          miniTask: 'Try a mini task',
          allInstitutions: 'All institutions',
          details: 'View details',
        };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={[styles.header, isRtl && styles.headerRtl]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo?.('recommendations')}>
          <FontAwesome name={isRtl ? 'arrow-right' : 'arrow-left'} size={16} color="#1d4ed8" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, isRtl && styles.rtlText]}>
            {localizeField(matchedMajor.title, i18n.language)}
          </Text>
          <Text style={[styles.subtitle, isRtl && styles.rtlText]}>
            {localizeField(matchedMajor.summary, i18n.language)}
          </Text>
        </View>
      </View>

      <Section title={copy.requiredSkills} isRtl={isRtl}>
        {(matchedMajor.requiredSkills || []).map((skill) => (
          <Tag key={skill} label={skill.replaceAll('_', ' ')} />
        ))}
      </Section>

      <Section title={copy.bagrut} isRtl={isRtl}>
        {localizeField(matchedMajor.bagrutSubjects, i18n.language).map((item) => (
          <Bullet key={item} text={item} isRtl={isRtl} />
        ))}
      </Section>

      <Section title={copy.careers} isRtl={isRtl}>
        {localizeField(matchedMajor.careers, i18n.language).map((item) => (
          <Bullet key={item} text={item} isRtl={isRtl} />
        ))}
      </Section>

      <Section title={copy.institutions} isRtl={isRtl}>
        {institutions.map((institution) => (
          <TouchableOpacity
            key={institution.code}
            style={styles.institutionCard}
            onPress={() =>
              navigateTo?.('institutionDetails', {
                institutionName: institution.name,
                majorName: localizeField(matchedMajor.title, i18n.language),
              })
            }
          >
            <Text style={[styles.institutionName, isRtl && styles.rtlText]}>
              {localizeField(institution.title, i18n.language)}
            </Text>
            <Text style={[styles.institutionMeta, isRtl && styles.rtlText]}>
              {institution.type} • {localizeField(institution.cityLabel || institution.city, i18n.language)}
            </Text>
            <Text style={[styles.institutionLink, isRtl && styles.rtlText]}>{copy.details}</Text>
          </TouchableOpacity>
        ))}
      </Section>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() =>
          navigateTo?.('miniTasks', {
            majorKey: matchedMajor.miniTaskKey,
            majorName: localizeField(matchedMajor.title, i18n.language),
          })
        }
      >
        <Text style={styles.primaryBtnText}>{copy.miniTask}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() =>
          navigateTo?.('universitiesAndColleges', {
            majorName: localizeField(matchedMajor.title, i18n.language),
          })
        }
      >
        <Text style={styles.secondaryBtnText}>{copy.allInstitutions}</Text>
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

function Tag({ label }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function Bullet({ text, isRtl }) {
  return <Text style={[styles.bullet, isRtl && styles.rtlText]}>• {text}</Text>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 28 },
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
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  sectionBody: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#dcfce7',
  },
  tagText: { color: '#166534', fontWeight: '800' },
  bullet: { width: '100%', color: '#334155', fontWeight: '700', lineHeight: 20 },
  institutionCard: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
  },
  institutionName: { color: '#0f172a', fontWeight: '900' },
  institutionMeta: { marginTop: 4, color: '#475569', fontWeight: '700' },
  institutionLink: { marginTop: 8, color: '#16a34a', fontWeight: '900' },
  primaryBtn: {
    marginTop: 16,
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
