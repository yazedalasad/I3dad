import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getAllSubjects, getQuestionsBySubject } from '../../services/questionService';

export default function ManageQuestionsScreen({ navigateTo }) {
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadSubjects() {
      const result = await getAllSubjects();
      if (cancelled) return;
      const rows = result?.success ? result.subjects || [] : [];
      setSubjects(rows);
      setSelectedSubjectId(rows[0]?.id || null);
      setLoading(false);
    }

    loadSubjects();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      if (!selectedSubjectId) {
        setQuestions([]);
        return;
      }

      const result = await getQuestionsBySubject(selectedSubjectId, {
        useCache: false,
        poolLimit: 30,
      });

      if (cancelled) return;
      setQuestions(result?.success ? result.questions || [] : []);
    }

    loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [selectedSubjectId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const isHebrew = String(i18n.language || '').toLowerCase().startsWith('he');
  const copy = isHebrew
    ? {
        back: 'חזרה',
        title: 'ניהול שאלות',
        subtitle: 'סקירה של מקצועות, קושי, שפה ומצב מאגר השאלות.',
        pool: 'מאגר שאלות',
        empty: 'לא נמצאו שאלות עבור המקצוע הזה.',
      }
    : {
        back: 'رجوع',
        title: 'إدارة الأسئلة',
        subtitle: 'راجع المواد، الصعوبة، اللغة، وحالة بنك الأسئلة.',
        pool: 'بنك الأسئلة',
        empty: 'لم يتم العثور على أسئلة لهذه المادة.',
      };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo?.('adminDashboard')}>
          <FontAwesome name="arrow-left" size={16} color="#1d4ed8" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>
      </View>

      <View style={styles.subjectRow}>
        {subjects.slice(0, 8).map((subject) => (
          <TouchableOpacity
            key={subject.id}
            style={[styles.subjectChip, selectedSubjectId === subject.id && styles.subjectChipActive]}
            onPress={() => setSelectedSubjectId(subject.id)}
          >
            <Text style={[styles.subjectChipText, selectedSubjectId === subject.id && styles.subjectChipTextActive]}>
              {subject.name_en}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{copy.pool}</Text>
        {questions.map((question, index) => (
          <View key={question.id || index} style={styles.questionCard}>
            <Text style={styles.questionText} numberOfLines={3}>
              {question.question_text || question.prompt || `Question ${index + 1}`}
            </Text>
            <Text style={styles.questionMeta}>
              Difficulty: {question.difficulty ?? '—'} • Language: {question.target_language || 'both'}
            </Text>
          </View>
        ))}
        {questions.length === 0 ? (
          <Text style={styles.emptyText}>{copy.empty}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
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
  subjectRow: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  subjectChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  subjectChipText: { color: '#0f172a', fontWeight: '800' },
  subjectChipTextActive: { color: '#fff' },
  card: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  questionCard: {
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  questionText: { color: '#0f172a', fontWeight: '700', lineHeight: 20 },
  questionMeta: { marginTop: 6, color: '#64748b', fontWeight: '700', fontSize: 17 },
  emptyText: { marginTop: 10, color: '#64748b', fontWeight: '700' },
});
