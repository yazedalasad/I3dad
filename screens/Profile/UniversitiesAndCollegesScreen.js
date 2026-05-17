import { FontAwesome } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  findMajorByName,
  institutionsCatalog,
  localizeField,
} from '../../data/majorCatalog';

const REGION_OPTIONS = ['all', 'south', 'center', 'north', 'haifa', 'jerusalem', 'tel_aviv', 'multiple'];
const TYPE_OPTIONS = ['all', 'university', 'academic_college', 'engineering_college', 'education_college', 'open_university'];

function getCopy(isArabic, isHebrew) {
  if (isHebrew) {
    return {
      title: 'אוניברסיטאות ומכללות',
      subtitle: 'גלו מוסדות לימוד המתאימים לתחום שלכם ולמקום המגורים.',
      search: 'חיפוש לפי מוסד, עיר או תחום...',
      region: 'אזור',
      type: 'סוג מוסד',
      recommendedFor: 'מומלץ עבורכם',
      institutions: 'מוסדות',
      allRegions: 'הכול',
      south: 'דרום',
      center: 'מרכז',
      north: 'צפון',
      haifa: 'חיפה',
      jerusalem: 'ירושלים',
      telAviv: 'תל אביב',
      multiple: 'מספר אזורים',
      allTypes: 'כל הסוגים',
      university: 'אוניברסיטה',
      academicCollege: 'מכללה אקדמית',
      engineeringCollege: 'מכללת הנדסה',
      educationCollege: 'מכללת חינוך',
      openUniversity: 'אוניברסיטה פתוחה',
      suitable: 'מתאים לכם',
      details: 'לפרטים',
      majors: 'תחומים בולטים',
      noResults: 'לא נמצאו מוסדות לפי הסינון הנוכחי.',
      clear: 'ניקוי סינון',
    };
  }

  if (isArabic) {
    return {
      title: 'الجامعات والكليات',
      subtitle: 'اكتشف المؤسسات التعليمية المناسبة لتخصصك ولمكان سكنك.',
      search: 'ابحث عن جامعة أو كلية أو مدينة أو مجال...',
      region: 'المنطقة',
      type: 'نوع المؤسسة',
      recommendedFor: 'مقترح لك حسب المسار',
      institutions: 'مؤسسات',
      allRegions: 'الكل',
      south: 'الجنوب',
      center: 'المركز',
      north: 'الشمال',
      haifa: 'حيفا',
      jerusalem: 'القدس',
      telAviv: 'تل أبيب',
      multiple: 'عدة مناطق',
      allTypes: 'كل الأنواع',
      university: 'جامعة',
      academicCollege: 'كلية أكاديمية',
      engineeringCollege: 'كلية هندسة',
      educationCollege: 'كلية تربية',
      openUniversity: 'جامعة مفتوحة',
      suitable: 'مناسب لك',
      details: 'عرض التفاصيل',
      majors: 'مجالات بارزة',
      noResults: 'لم نجد مؤسسات تطابق الفلاتر الحالية.',
      clear: 'مسح الفلاتر',
    };
  }

  return {
    title: 'Universities & Colleges',
    subtitle: 'Discover institutions that fit your study path and location.',
    search: 'Search by institution, city, or field...',
    region: 'Region',
    type: 'Institution type',
    recommendedFor: 'Recommended for your path',
    institutions: 'Institutions',
    allRegions: 'All',
    south: 'South',
    center: 'Center',
    north: 'North',
    haifa: 'Haifa',
    jerusalem: 'Jerusalem',
    telAviv: 'Tel Aviv',
    multiple: 'Multiple',
    allTypes: 'All types',
    university: 'University',
    academicCollege: 'Academic College',
    engineeringCollege: 'Engineering College',
    educationCollege: 'Education College',
    openUniversity: 'Open University',
    suitable: 'Suitable for you',
    details: 'View details',
    majors: 'Featured fields',
    noResults: 'No institutions match the current filters.',
    clear: 'Clear filters',
  };
}

function FilterGroup({ title, options, selected, onChange, isRtl }) {
  return (
    <View style={styles.filterSection}>
      <Text style={[styles.filterTitle, isRtl && styles.rtlText]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => onChange(option.value)}
              activeOpacity={0.9}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function UniversitiesAndCollegesScreen({ navigateTo, route = { params: {} } }) {
  const { i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');
  const [type, setType] = useState('all');

  const majorId = route?.params?.majorId || '';
  const majorKey = route?.params?.majorKey || '';
  const majorName = route?.params?.majorName || '';
  const matchedMajor = useMemo(() => findMajorByName(majorName), [majorName]);
  const activeMajorKey = matchedMajor?.key || majorKey || (isUuid(majorId) ? '' : majorId);

  const lang = String(i18n.language || 'ar');
  const isArabic = lang.toLowerCase().startsWith('ar');
  const isHebrew = lang.toLowerCase().startsWith('he');
  const isRtl = isArabic || isHebrew;
  const copy = getCopy(isArabic, isHebrew);

  const filteredInstitutions = useMemo(() => {
    return institutionsCatalog
      .filter((institution) => {
        if (activeMajorKey && !institution.majors?.includes(activeMajorKey)) return false;
        if (region !== 'all' && institution.region !== region) return false;
        if (type !== 'all' && institution.typeKey !== type) return false;

        const fields = localizeField(institution.fields, lang);
        const haystack = [
          institution.name,
          localizeField(institution.title, lang),
          localizeField(institution.cityLabel, lang),
          ...(Array.isArray(fields) ? fields : [fields]),
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(String(query || '').trim().toLowerCase());
      })
      .sort((a, b) => {
        const aScore = activeMajorKey && a.majors?.includes(activeMajorKey) ? 1 : 0;
        const bScore = activeMajorKey && b.majors?.includes(activeMajorKey) ? 1 : 0;
        return bScore - aScore;
      });
  }, [activeMajorKey, lang, query, region, type]);

  const labelForRegion = (value) => {
    const map = {
      all: copy.allRegions,
      south: copy.south,
      center: copy.center,
      north: copy.north,
      haifa: copy.haifa,
      jerusalem: copy.jerusalem,
      tel_aviv: copy.telAviv,
      multiple: copy.multiple,
    };
    return map[value] || value;
  };

  const labelForType = (value) => {
    const map = {
      all: copy.allTypes,
      university: copy.university,
      academic_college: copy.academicCollege,
      engineering_college: copy.engineeringCollege,
      education_college: copy.educationCollege,
      open_university: copy.openUniversity,
    };
    return map[value] || value;
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={[styles.header, isRtl && styles.headerRtl]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo?.('profile')} activeOpacity={0.9}>
            <FontAwesome name={isRtl ? 'arrow-right' : 'arrow-left'} size={16} color="#1d4ed8" />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={[styles.title, isRtl && styles.rtlText]}>{copy.title}</Text>
            <Text style={[styles.subtitle, isRtl && styles.rtlText]}>{copy.subtitle}</Text>
          </View>
        </View>

        {matchedMajor ? (
          <View style={[styles.majorBanner, isRtl && styles.majorBannerRtl]}>
            <FontAwesome name="graduation-cap" size={14} color="#166534" />
            <Text style={[styles.majorBannerText, isRtl && styles.rtlText]}>
              {copy.recommendedFor}: {localizeField(matchedMajor.title, lang)}
            </Text>
          </View>
        ) : null}

        <View style={[styles.statsRow, isRtl && styles.statsRowRtl]}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{filteredInstitutions.length}</Text>
            <Text style={[styles.statLabel, isRtl && styles.rtlText]}>{copy.institutions}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{REGION_OPTIONS.length - 1}</Text>
            <Text style={[styles.statLabel, isRtl && styles.rtlText]}>{copy.region}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{TYPE_OPTIONS.length - 1}</Text>
            <Text style={[styles.statLabel, isRtl && styles.rtlText]}>{copy.type}</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterPanel}>
        <View style={styles.searchBox}>
          <FontAwesome name="search" size={16} color="#94a3b8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.search}
            placeholderTextColor="#94a3b8"
            style={[styles.searchInput, isRtl && styles.rtlText]}
          />
        </View>

        <FilterGroup
          title={copy.region}
          options={REGION_OPTIONS.map((value) => ({ value, label: labelForRegion(value) }))}
          selected={region}
          onChange={setRegion}
          isRtl={isRtl}
        />

        <FilterGroup
          title={copy.type}
          options={TYPE_OPTIONS.map((value) => ({ value, label: labelForType(value) }))}
          selected={type}
          onChange={setType}
          isRtl={isRtl}
        />
      </View>

      {filteredInstitutions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={[styles.emptyText, isRtl && styles.rtlText]}>{copy.noResults}</Text>
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              setQuery('');
              setRegion('all');
              setType('all');
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.clearBtnText}>{copy.clear}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        filteredInstitutions.map((institution) => {
          const localizedFields = localizeField(institution.fields, lang);
          const fields = Array.isArray(localizedFields) ? localizedFields : [localizedFields];

          return (
            <TouchableOpacity
              key={institution.code}
              style={styles.card}
              activeOpacity={0.95}
              onPress={() =>
                navigateTo?.('institutionDetails', {
                  institutionName: institution.name,
                  institutionId: institution.code,
                  majorId: majorId || majorKey || matchedMajor?.key,
                  majorKey: majorKey || matchedMajor?.key,
                  majorName: matchedMajor ? localizeField(matchedMajor.title, lang) : majorName,
                })
              }
            >
              <View style={[styles.cardTop, isRtl && styles.cardTopRtl]}>
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, isRtl && styles.rtlText]}>
                    {localizeField(institution.title, lang)}
                  </Text>
                  <Text style={[styles.cardMeta, isRtl && styles.rtlText]}>
                    {labelForType(institution.typeKey)} | {localizeField(institution.cityLabel, lang)}
                  </Text>
                </View>

                {matchedMajor && institution.majors?.includes(matchedMajor.key) ? (
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchBadgeText}>{copy.suitable}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.cardSummary, isRtl && styles.rtlText]}>
                {localizeField(institution.summary, lang)}
              </Text>

              <View style={styles.tagsWrap}>
                {fields.slice(0, 4).map((field) => (
                  <View key={`${institution.code}-${field}`} style={styles.tag}>
                    <Text style={styles.tagText}>{field}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.cardFooter, isRtl && styles.cardFooterRtl]}>
                <Text style={[styles.footerLabel, isRtl && styles.rtlText]}>{copy.majors}</Text>
                <View style={styles.footerActionWrap}>
                  <Text style={styles.footerAction}>{copy.details}</Text>
                  <FontAwesome name={isRtl ? 'arrow-left' : 'arrow-right'} size={12} color="#2563eb" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f4f8fc',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d8e5f3',
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    color: '#475569',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '700',
  },
  majorBanner: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  majorBannerRtl: {
    flexDirection: 'row-reverse',
  },
  majorBannerText: {
    color: '#166534',
    fontWeight: '800',
    marginHorizontal: 6,
  },
  statsRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsRowRtl: {
    flexDirection: 'row-reverse',
  },
  statPill: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 18,
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2563eb',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  filterPanel: {
    marginTop: 18,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#d8e5f3',
    padding: 18,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fbff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  filterSection: {
    marginTop: 16,
  },
  filterTitle: {
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  filterRow: {
    paddingRight: 4,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  emptyCard: {
    marginTop: 18,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '700',
  },
  clearBtn: {
    marginTop: 14,
    backgroundColor: '#1d4ed8',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  clearBtnText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  card: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTopRtl: {
    flexDirection: 'row-reverse',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 30,
  },
  cardMeta: {
    marginTop: 6,
    color: '#64748b',
    fontWeight: '700',
    fontSize: 15,
  },
  matchBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#ecfccb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 12,
  },
  matchBadgeText: {
    color: '#3f6212',
    fontWeight: '900',
  },
  cardSummary: {
    marginTop: 14,
    color: '#334155',
    lineHeight: 24,
    fontSize: 16,
    fontWeight: '700',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  tag: {
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  cardFooter: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooterRtl: {
    flexDirection: 'row-reverse',
  },
  footerLabel: {
    color: '#64748b',
    fontWeight: '800',
  },
  footerActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerAction: {
    color: '#2563eb',
    fontWeight: '900',
    marginRight: 6,
  },
  rtlText: {
    textAlign: 'right',
  },
});

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}
