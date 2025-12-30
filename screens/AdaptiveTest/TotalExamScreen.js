// screens/AdaptiveTest/TotalExamScreen.js
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import adaptiveTestService from '../../services/adaptiveTestService';
import { getAllSubjects } from '../../services/questionService';

function StatChip({ icon, label }) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={16} color="#EAF0FF" />
      <Text style={styles.statChipText}>{label}</Text>
    </View>
  );
}

function SubjectTile({ subject, t, isArabic }) {
  const name =
    (isArabic ? subject?.name_ar : subject?.name_he) ||
    subject?.name_en ||
    subject?.name_he ||
    subject?.name_ar ||
    t('totalExam.subjectFallback', isArabic ? 'مادة' : 'מקצוע');

  return (
    <View style={styles.tile}>
      <View style={styles.tileTopRow}>
        <View style={styles.tileBadge}>
          <Ionicons name="checkmark" size={14} color="#fff" />
          <Text style={styles.tileBadgeText}>
            {t('totalExam.included', isArabic ? 'مُضمن' : 'כלול')}
          </Text>
        </View>

        <Text style={styles.tileTitle} numberOfLines={1}>
          {name}
        </Text>
      </View>

      <View style={styles.tileMetaRow}>
        <Ionicons name="albums-outline" size={14} color="#546A99" />
        <Text style={styles.tileMetaText} numberOfLines={1}>
          {t(
            'totalExam.inTotalExam',
            isArabic ? 'ضمن الاختبار الشامل' : 'כלול במבחן המלא'
          )}
        </Text>
      </View>
    </View>
  );
}

export default function TotalExamScreen({
  navigateTo,
  studentId,
  studentName,
  language = 'ar',
}) {
  const { t: rawT, i18n } = useTranslation();

  // small helper: return fallback if key missing
  const t = (key, fallback) => {
    const v = rawT(key);
    return typeof v === 'string' && v !== key ? v : fallback;
  };

  // keep i18n in sync with prop
  useEffect(() => {
    const nextLang = String(language).toLowerCase() === 'he' ? 'he' : 'ar';
    if (i18n.language !== nextLang) {
      i18n.changeLanguage(nextLang).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const isArabic = String(i18n.language).toLowerCase() !== 'he';

  const displayStudentName =
    studentName ||
    t('totalExam.studentFallback', isArabic ? 'طالب' : 'תלמיד/ה');

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const [subjects, setSubjects] = useState([]);
  const [selected, setSelected] = useState({}); // { [subjectId]: true }

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        const res = await getAllSubjects();
        if (!mounted) return;

        if (res?.success) {
          const list = res.subjects || [];
          setSubjects(list);

          // Auto-select ALL subjects
          const allSelected = {};
          list.forEach((s) => {
            allSelected[String(s.id)] = true;
          });
          setSelected(allSelected);
        } else {
          console.log('Failed to load subjects:', res?.error);
          setSubjects([]);
          setSelected({});
        }
      } catch (e) {
        console.log('getAllSubjects error:', e?.message || e);
        setSubjects([]);
        setSelected({});
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const startTotalExam = async () => {
    if (!studentId) {
      console.log('TotalExamScreen: missing studentId (from ManualNavigator)');
      return;
    }

    const subjectIdsToUse =
      selectedIds.length > 0
        ? selectedIds
        : (subjects || []).map((s) => String(s.id));

    if (!subjectIdsToUse.length) {
      console.log('No subjects available to start exam');
      return;
    }

    setStarting(true);

    try {
      const res = await adaptiveTestService.startComprehensiveAssessment({
        studentId,
        subjectIds: subjectIdsToUse,
        language: isArabic ? 'ar' : 'he',

        // stronger exam length
        minQuestionsPerSubject: 5,
        maxQuestionsPerSubject: 7,

        // legacy field kept for compatibility
        questionsPerSubject: 5,
      });

      if (!res?.success) {
        console.log('Start exam failed:', res?.error);
        return;
      }

      navigateTo('startAdaptiveTest', {
        sessionId: res.sessionId,
        studentId: res.studentId,
        subjectStates: res.subjectStates,
        subjectIds: res.subjectIds || subjectIdsToUse,
        language: isArabic ? 'ar' : 'he',
        isComprehensive: true,
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={styles.page}>
      <FlatList
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={['#1B3A8A', '#1E4FBF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroTextBlock}>
                  <Text style={styles.heroTitle}>
                    {t(
                      'totalExam.title',
                      isArabic ? 'الامتحان الشامل' : 'מבחן מלא'
                    )}
                  </Text>

                  <Text style={styles.heroSubtitle}>
                    {t('totalExam.hello', isArabic ? 'أهلاً' : 'שלום')}{' '}
                    {displayStudentName} 👋
                  </Text>

                  <Text style={styles.heroDesc}>
                    {t(
                      'totalExam.desc',
                      isArabic
                        ? 'الاختبار يشمل جميع المواد. عدد الأسئلة لكل مادة من 5 إلى 7 لقياس أدق للقدرات.'
                        : 'המבחן כולל את כל המקצועות. 5–7 שאלות לכל מקצוע למדידה מדויקת יותר.'
                    )}
                  </Text>
                </View>

                <View style={styles.abstractBox}>
                  <View style={styles.abstractInner} />
                  <View style={styles.abstractCircle} />
                </View>
              </View>

              <View style={styles.heroStatsRow}>
                <StatChip
                  icon="time-outline"
                  label={t(
                    'totalExam.heartbeat',
                    isArabic ? 'نبض كل 15 ثانية' : 'דופק כל 15 שניות'
                  )}
                />
                <StatChip
                  icon="language-outline"
                  label={t(
                    'totalExam.languageLabel',
                    isArabic ? 'اللغة: العربية' : 'שפה: עברית'
                  )}
                />
                <StatChip
                  icon="help-circle-outline"
                  label={t(
                    'totalExam.qPerSubject',
                    isArabic ? '5–7 أسئلة لكل مادة' : '5–7 שאלות למקצוע'
                  )}
                />
                <StatChip
                  icon="albums-outline"
                  label={`${t(
                    'totalExam.subjectsCount',
                    isArabic ? 'المواد' : 'מקצועות'
                  )}: ${subjects.length}`}
                />
              </View>
            </LinearGradient>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t(
                  'totalExam.availableSubjects',
                  isArabic ? 'المواد المتاحة' : 'מקצועות זמינים'
                )}
              </Text>
              <Text style={styles.sectionHint}>
                {t(
                  'totalExam.autoIncludedHint',
                  isArabic
                    ? 'جميع المواد مُدرجة تلقائياً في الاختبار.'
                    : 'כל המקצועות כלולים אוטומטית במבחן.'
                )}
              </Text>

              {loading ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator />
                  <Text style={styles.loadingText}>
                    {t(
                      'totalExam.loadingSubjects',
                      isArabic
                        ? 'جاري تحميل المواد...'
                        : 'טוען מקצועות...'
                    )}
                  </Text>
                </View>
              ) : subjects.length === 0 ? (
                <View style={styles.centerBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={22}
                    color="#B42318"
                  />
                  <Text style={styles.warnText}>
                    {t(
                      'totalExam.noSubjects',
                      isArabic
                        ? 'لا توجد مواد متاحة حالياً.'
                        : 'אין מקצועות זמינים כרגע.'
                    )}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        }
        data={loading ? [] : subjects}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <SubjectTile subject={item} t={t} isArabic={isArabic} />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              onPress={startTotalExam}
              disabled={
                starting || loading || subjects.length === 0 || !studentId
              }
              style={({ pressed }) => [
                styles.startBtn,
                (starting || loading || subjects.length === 0 || !studentId) &&
                  styles.startBtnDisabled,
                pressed && !starting && !loading && studentId
                  ? styles.startBtnPressed
                  : null,
              ]}
            >
              {starting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.startBtnText}>
                    {t(
                      'totalExam.start',
                      isArabic ? 'ابدأ الامتحان' : 'התחל מבחן'
                    )}
                  </Text>
                </>
              )}
            </Pressable>

            {!studentId && (
              <Text style={styles.warnText}>
                {t(
                  'totalExam.missingStudentId',
                  isArabic
                    ? '⚠️ لا يمكن البدء بدون studentId (تأكد من ManualNavigator + AuthContext)'
                    : '⚠️ אי אפשר להתחיל בלי studentId (בדוק/י ManualNavigator + AuthContext)'
                )}
              </Text>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F8FF' },
  listContent: { paddingBottom: 22 },

  hero: { padding: 18, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTextBlock: { flex: 1, paddingRight: 10 },
  heroTitle: { color: '#fff', fontWeight: '900', fontSize: 22 },
  heroSubtitle: { color: '#EAF0FF', marginTop: 6, fontWeight: '800' },
  heroDesc: { color: '#DDE7FF', marginTop: 10, lineHeight: 20, fontWeight: '600' },

  abstractBox: {
    width: 82,
    height: 82,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    position: 'relative',
    overflow: 'hidden',
  },
  abstractInner: {
    position: 'absolute',
    left: 10,
    top: 16,
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  abstractCircle: {
    position: 'absolute',
    right: -18,
    bottom: -18,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  heroStatsRow: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  statChipText: { color: '#EAF0FF', fontWeight: '800' },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { color: '#102A68', fontWeight: '900', fontSize: 16 },
  sectionHint: { color: '#546A99', marginTop: 6, fontWeight: '700' },

  centerBox: { paddingVertical: 16, alignItems: 'center', gap: 8 },
  loadingText: { color: '#546A99', fontWeight: '800' },

  gridRow: { paddingHorizontal: 16, gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5ECFF',
    minHeight: 88,
  },
  tileTopRow: { flexDirection: 'column', gap: 8 },
  tileTitle: { color: '#102A68', fontWeight: '900', textAlign: 'right', fontSize: 14 },

  tileBadge: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#1E4FBF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tileBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  tileMetaRow: { marginTop: 8, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  tileMetaText: { color: '#546A99', fontWeight: '700', textAlign: 'right', fontSize: 12 },

  footer: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  startBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1E4FBF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  startBtnDisabled: { opacity: 0.6 },
  startBtnPressed: { transform: [{ scale: 0.99 }] },
  startBtnText: { color: '#fff', fontWeight: '900' },

  warnText: { color: '#B42318', fontWeight: '800', textAlign: 'center' },
});
