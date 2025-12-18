import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import adaptiveTestService from '../../services/adaptiveTestService';
import { getAllSubjects } from '../../services/questionService';

const AR = 'ar';

function StatChip({ icon, label }) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={16} color="#EAF0FF" />
      <Text style={styles.statChipText}>{label}</Text>
    </View>
  );
}

export default function TotalExamScreen({
  navigateTo,
  studentId,
  studentName = 'طالب'
}) {
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

          // ✅ Auto-select ALL subjects (user cannot change)
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
      selectedIds.length > 0 ? selectedIds : (subjects || []).map((s) => String(s.id));

    if (!subjectIdsToUse.length) {
      console.log('No subjects available to start exam');
      return;
    }

    setStarting(true);

    try {
      // ✅ IMPORTANT: call with an OBJECT (matches your fixed adaptiveTestService.js)
      const res = await adaptiveTestService.startComprehensiveAssessment({
        studentId,
        subjectIds: subjectIdsToUse,
        language: AR,
        questionsPerSubject: 2
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
        language: AR,
        isComprehensive: true
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={['#1B3A8A', '#1E4FBF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>اختبار شامل</Text>
            <Text style={styles.heroSubtitle}>أهلاً {studentName} 👋</Text>
            <Text style={styles.heroDesc}>
              سيشمل الاختبار جميع المواد المتاحة. ستحصل في النهاية على تقرير واضح يوضح نقاط القوة وما يحتاج لتحسين.
            </Text>
          </View>

          <View style={styles.abstractBox}>
            <View style={styles.abstractInner} />
            <View style={styles.abstractCircle} />
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          <StatChip icon="time-outline" label="نبض كل 15 ثانية" />
          <StatChip icon="language-outline" label="اللغة: العربية" />
          <StatChip icon="albums-outline" label={`المواد: ${subjects.length}`} />
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>المواد المتاحة</Text>
        <Text style={styles.sectionHint}>جميع المواد مُدرجة تلقائياً في الاختبار.</Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>جاري تحميل المواد...</Text>
          </View>
        ) : subjects.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="alert-circle-outline" size={22} color="#B42318" />
            <Text style={styles.warnText}>لا توجد مواد متاحة حالياً.</Text>
          </View>
        ) : (
          <View style={styles.cardsGrid}>
            {subjects.map((s) => {
              const nameAr = s?.name_ar || s?.name_en || 'مادة';
              return (
                <Pressable
                  key={String(s.id)}
                  disabled
                  style={[styles.subjectCard, styles.subjectCardSelected]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.checkBox, styles.checkBoxOn]}>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </View>
                    <Text style={styles.subjectName}>{nameAr}</Text>
                  </View>

                  <Text style={styles.subjectMeta}>مُضمن في الاختبار</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={startTotalExam}
          disabled={starting || loading || subjects.length === 0 || !studentId}
          style={({ pressed }) => [
            styles.startBtn,
            (starting || loading || subjects.length === 0 || !studentId) && styles.startBtnDisabled,
            pressed && !starting && !loading && studentId ? styles.startBtnPressed : null
          ]}
        >
          {starting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.startBtnText}>ابدأ الاختبار</Text>
            </>
          )}
        </Pressable>

        {!studentId && (
          <Text style={styles.warnText}>
            ⚠️ لا يمكن البدء بدون studentId (تأكد من ManualNavigator + AuthContext)
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F6F8FF' },
  content: { paddingBottom: 22 },

  hero: { padding: 18, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
    overflow: 'hidden'
  },
  abstractInner: {
    position: 'absolute',
    left: 10,
    top: 16,
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)'
  },
  abstractCircle: {
    position: 'absolute',
    right: -18,
    bottom: -18,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.18)'
  },

  heroStatsRow: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)'
  },
  statChipText: { color: '#EAF0FF', fontWeight: '800' },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { color: '#102A68', fontWeight: '900', fontSize: 16 },
  sectionHint: { color: '#546A99', marginTop: 6, fontWeight: '700' },

  centerBox: { paddingVertical: 20, alignItems: 'center', gap: 8 },
  loadingText: { color: '#546A99', fontWeight: '800' },

  cardsGrid: { marginTop: 14, gap: 10 },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5ECFF'
  },
  subjectCardSelected: { borderColor: '#1E4FBF' },
  cardTopRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkBoxOn: { backgroundColor: '#1E4FBF' },
  subjectName: { flex: 1, color: '#102A68', fontWeight: '900', textAlign: 'right' },
  subjectMeta: { marginTop: 8, color: '#546A99', fontWeight: '700', textAlign: 'right' },

  footer: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  startBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1E4FBF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8
  },
  startBtnDisabled: { opacity: 0.6 },
  startBtnPressed: { transform: [{ scale: 0.99 }] },
  startBtnText: { color: '#fff', fontWeight: '900' },

  warnText: { color: '#B42318', fontWeight: '800', textAlign: 'center' }
});
