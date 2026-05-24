// screens/AdaptiveTest/TotalExamScreen.js
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import adaptiveTestService from '../../services/adaptiveTestService';
import { getAllSubjects } from '../../services/questionService';
import {
  font,
  lh,
  textColors,
  touchTargets,
  webContent,
} from '../../src/theme/typography';

function StatChip({ icon, label }) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={18} color={textColors.onHero} />
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
    <Pressable
      accessibilityRole="text"
      style={({ hovered, pressed }) => [
        styles.tile,
        hovered && styles.tileHover,
        pressed && styles.tilePressed,
      ]}
    >
      <View style={styles.tileHeader}>
        <View style={styles.tileIconBox}>
          <Ionicons name="albums-outline" size={20} color="#2455D6" />
        </View>

        <View style={styles.tileTextBlock}>
          <View style={styles.tileTitleRow}>
            <View style={styles.tileBadge}>
              <Ionicons name="checkmark" size={12} color="#2455D6" />
              <Text style={styles.tileBadgeText}>
                {t('totalExam.included', isArabic ? 'مُضمن' : 'כלול')}
              </Text>
            </View>

            <Text style={styles.tileTitle}>{name}</Text>
          </View>

          <Text style={styles.tileMetaText}>
            {t(
              'totalExam.inTotalExam',
              isArabic ? 'ضمن الاختبار الشامل' : 'כלול במבחן המלא'
            )}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function formatStartError(error, isArabic) {
  const text = String(error || '');
  if (text.includes('NO_ACTIVE_SUBJECTS') || text.includes('NO_SUBJECT_IDS')) {
    return isArabic ? 'لا توجد مواد مفعّلة لبدء الامتحان حالياً.' : 'אין מקצועות פעילים להתחלת המבחן כרגע.';
  }
  if (text.includes('SESSION_CREATION_FAILED') || text.includes('row-level security') || text.includes('permission denied')) {
    return isArabic
      ? 'تعذر فتح الامتحان بسبب صلاحيات قاعدة البيانات. حدّث صلاحيات الامتحان ثم جرّب مرة أخرى.'
      : 'לא ניתן לפתוח את המבחן בגלל הרשאות מסד הנתונים. עדכנו את הרשאות המבחן ונסו שוב.';
  }
  return isArabic
    ? 'تعذر فتح الامتحان الآن. جرّب مرة أخرى بعد لحظات.'
    : 'לא ניתן לפתוח את המבחן כרגע. נסו שוב בעוד רגע.';
}

const firstValue = (source, fields) => {
  for (const field of fields) {
    const value = source?.[field];
    if (String(value ?? '').trim()) return String(value).trim();
  }
  return '';
};

function hasCompleteStudentProfile(studentData) {
  if (!studentData?.id) return false;

  const firstName = firstValue(studentData, ['first_name', 'firstName']);
  const lastName = firstValue(studentData, ['last_name', 'lastName']);
  const fullName = firstValue(studentData, ['full_name', 'fullName', 'name', 'display_name']);
  const schoolName = firstValue(studentData, ['school_name', 'schoolName', 'school']);
  const grade = firstValue(studentData, ['grade', 'grade_level', 'class_grade']);
  const birthday = firstValue(studentData, ['birthday', 'birth_date', 'date_of_birth']);

  return Boolean(
    (firstName && lastName ? true : fullName) &&
      schoolName &&
      grade &&
      birthday
  );
}

export default function TotalExamScreen({
  navigateTo,
  studentId,
  studentDataLoading = false,
  studentName,
  language = 'ar',
}) {
  const { width } = useWindowDimensions();
  const { t: rawT, i18n } = useTranslation();
  const {
    studentData: authStudentData,
    studentDataLoading: authStudentDataLoading = false,
    studentId: authStudentId,
    loading: authLoading,
    profile,
    user,
  } = useAuth();

  // small helper: return fallback if key missing
  const t = (key, fallback) => {
    if (key === 'totalExam.resolvingStudent') {
      return String(i18n.language).toLowerCase() === 'he'
        ? 'טוען את פרטי התלמיד/ה...'
        : 'جار تجهيز بيانات الطالب...';
    }
    if (key === 'totalExam.missingStudentId') {
      return String(i18n.language).toLowerCase() === 'he'
        ? 'לא נמצא פרופיל תלמיד/ה. התחבר/י עם חשבון תלמיד תקין ונסה/י שוב.'
        : 'تعذر العثور على ملف الطالب. سجل الدخول بحساب طالب صالح ثم جرب مرة أخرى.';
    }

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
  const isCompact = width < 720;
  const numColumns = width < 520 ? 1 : 2;

  const displayStudentName =
    studentName ||
    t('totalExam.studentFallback', isArabic ? 'طالب' : 'תלמיד/ה');

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const [startError, setStartError] = useState('');

  const effectiveStudentId =
    studentId ||
    authStudentId ||
    authStudentData?.id ||
    authStudentData?.student_id ||
    user?.user_metadata?.student_id ||
    null;
  const resolvingStudentId = authLoading || studentDataLoading || authStudentDataLoading;
  const waitingForStudentId = !effectiveStudentId && resolvingStudentId;
  const effectiveStudentData = {
    ...(user?.user_metadata || {}),
    ...(profile || {}),
    ...(authStudentData || {}),
    id: effectiveStudentId,
  };
  const profileComplete = hasCompleteStudentProfile(effectiveStudentData);

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
    if (startingRef.current) return;
    setStartError('');

    if (!effectiveStudentId) {
      console.log('TotalExamScreen: missing studentId after navigator + auth fallback');
      setStartError(
        t(
          'totalExam.missingStudentId',
          isArabic
            ? 'تعذر العثور على ملف الطالب. سجل الدخول بحساب طالب صالح ثم جرب مرة أخرى.'
            : 'לא נמצא פרופיל תלמיד/ה. התחבר/י עם חשבון תלמיד תקין ונסה/י שוב.'
        )
      );
      return;
    }

    const subjectIdsToUse =
      selectedIds.length > 0
        ? selectedIds
        : (subjects || []).map((s) => String(s.id));

    if (!subjectIdsToUse.length) {
      console.log('No subjects available to start exam');
      setStartError(
        t(
          'totalExam.noSubjects',
          isArabic ? 'لا توجد مواد متاحة حالياً.' : 'אין מקצועות זמינים כרגע.'
        )
      );
      return;
    }

    setStarting(true);
    startingRef.current = true;

    try {
      const res = await adaptiveTestService.startComprehensiveAssessment({
        studentId: effectiveStudentId,
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
        setStartError(formatStartError(res?.error, isArabic));
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
      startingRef.current = false;
    }
  };

  return (
    <View style={styles.page}>
      <FlatList
        key={`subjects-${numColumns}`}
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
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : null}
        contentContainerStyle={[
          styles.listContent,
          isCompact && styles.listContentCompact,
        ]}
        renderItem={({ item }) => (
          <SubjectTile subject={item} t={t} isArabic={isArabic} />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              testID="total-exam-start-button"
              onPress={startTotalExam}
              disabled={
                starting ||
                loading ||
                waitingForStudentId ||
                subjects.length === 0 ||
                !effectiveStudentId
              }
              style={({ pressed }) => [
                styles.startBtn,
                (starting ||
                  loading ||
                  waitingForStudentId ||
                  subjects.length === 0 ||
                  !effectiveStudentId) &&
                  styles.startBtnDisabled,
                pressed &&
                !starting &&
                !loading &&
                !waitingForStudentId &&
                effectiveStudentId
                  ? styles.startBtnPressed
                  : null,
              ]}
            >
              {starting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={22} color="#fff" />
                  <Text style={styles.startBtnText}>
                    {t(
                      'totalExam.start',
                      isArabic ? 'ابدأ الامتحان' : 'התחל מבחן'
                    )}
                  </Text>
                </>
              )}
            </Pressable>

            {!!startError && <Text style={styles.warnText}>{startError}</Text>}

            {effectiveStudentId && !resolvingStudentId && !profileComplete && (
              <View style={styles.profileWarningBox}>
                <Text style={styles.warnText}>
                  {t(
                    'totalExam.incompleteProfile',
                    isArabic
                      ? 'أكمل بيانات البروفايل قبل بدء الامتحان: الاسم، المدرسة، الصف وتاريخ الميلاد.'
                      : 'יש להשלים את פרטי הפרופיל לפני תחילת המבחן: שם, בית ספר, כיתה ותאריך לידה.'
                  )}
                </Text>
                <Pressable
                  onPress={() => navigateTo?.('editProfile')}
                  style={({ pressed }) => [styles.profileBtn, pressed && styles.startBtnPressed]}
                >
                  <Ionicons name="person-circle-outline" size={17} color="#fff" />
                  <Text style={styles.profileBtnText}>
                    {t(
                      'totalExam.completeProfile',
                      isArabic ? 'تعديل البروفايل' : 'עריכת פרופיל'
                    )}
                  </Text>
                </Pressable>
              </View>
            )}

            {waitingForStudentId && (
              <Text style={styles.loadingText}>
                {t(
                  'totalExam.resolvingStudent',
                  isArabic
                    ? 'جار تجهيز بيانات الطالب...'
                    : 'טוען את פרטי התלמיד/ה...'
                )}
              </Text>
            )}

            {!effectiveStudentId && !resolvingStudentId && (
              <Text style={styles.warnText}>
                {t(
                  'totalExam.missingStudentId',
                  isArabic
                    ? 'تعذر العثور على ملف الطالب. سجل الدخول بحساب طالب صالح ثم جرب مرة أخرى.'
                    : 'לא נמצא פרופיל תלמיד/ה. התחבר/י עם חשבון תלמיד תקין ונסה/י שוב.'
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
  page: {
    flex: 1,
    backgroundColor: '#F6F8FF',
    width: '100%',
  },
  listContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? webContent.paddingHorizontal : 16,
    paddingTop: 18,
    paddingBottom: 28,
  },
  listContentCompact: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 104,
  },

  hero: {
    padding: 22,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#1E4FBF',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 18,
  },
  heroTextBlock: { flex: 1, minWidth: 0 },
  heroTitle: {
    color: textColors.inverse,
    fontWeight: '900',
    fontSize: font('heroTitle'),
    lineHeight: lh('heroTitle'),
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  heroSubtitle: {
    color: textColors.onHero,
    marginTop: 8,
    fontWeight: '800',
    fontSize: font('body'),
    lineHeight: lh('body'),
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  heroDesc: {
    color: textColors.onHeroMuted,
    marginTop: 10,
    fontSize: font('body'),
    lineHeight: lh('body'),
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  abstractBox: {
    width: 74,
    height: 74,
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

  heroStatsRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  statChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  statChipText: {
    color: textColors.onHero,
    fontWeight: '800',
    fontSize: font('badge'),
    lineHeight: lh('badge'),
    writingDirection: 'rtl',
  },

  section: { paddingTop: 20, paddingBottom: 8 },
  sectionTitle: {
    color: textColors.primary,
    fontWeight: '900',
    fontSize: font('sectionTitle'),
    lineHeight: lh('sectionTitle'),
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sectionHint: {
    color: textColors.muted,
    marginTop: 8,
    fontWeight: '700',
    fontSize: font('helper'),
    lineHeight: lh('helper'),
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  centerBox: { paddingVertical: 16, alignItems: 'center', gap: 8 },
  loadingText: {
    color: textColors.muted,
    fontWeight: '800',
    fontSize: font('helper'),
    lineHeight: lh('helper'),
  },

  gridRow: { gap: 12 },
  tile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5ECFF',
    minHeight: 112,
    maxHeight: 132,
    marginBottom: 12,
    shadowColor: '#102A68',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  tileHover: {
    borderColor: '#C9D8FF',
    shadowOpacity: 0.1,
    transform: [{ translateY: -1 }],
  },
  tilePressed: { transform: [{ scale: 0.99 }] },
  tileHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
  },
  tileIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#DCE7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTextBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
  },
  tileTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tileTitle: {
    color: '#102A68',
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: font('bodyStrong'),
    lineHeight: lh('bodyStrong'),
    flex: 1,
  },

  tileBadge: {
    flexDirection: 'row-reverse',
    gap: 5,
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#DCE7FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tileBadgeText: {
    color: '#2455D6',
    fontWeight: '900',
    fontSize: font('tiny'),
    lineHeight: lh('tiny'),
    writingDirection: 'rtl',
  },

  tileMetaText: {
    color: textColors.muted,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
    fontSize: font('helper'),
    lineHeight: lh('helper'),
    marginTop: 10,
  },

  footer: { paddingTop: 10, gap: 10 },
  profileWarningBox: { gap: 10, alignItems: 'center' },
  profileBtn: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: '#1E4FBF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: 8,
    paddingHorizontal: 16,
  },
  profileBtnText: { color: '#fff', fontWeight: '900' },
  startBtn: {
    minHeight: touchTargets.examButtonMinHeight,
    borderRadius: 18,
    backgroundColor: '#2455D6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: 10,
    paddingHorizontal: 20,
  },
  startBtnDisabled: { opacity: 0.6 },
  startBtnPressed: { transform: [{ scale: 0.99 }] },
  startBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: font('button'),
    lineHeight: lh('button'),
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  warnText: {
    color: '#B42318',
    fontWeight: '800',
    textAlign: 'center',
    fontSize: font('helper'),
    lineHeight: lh('helper'),
  },
});
