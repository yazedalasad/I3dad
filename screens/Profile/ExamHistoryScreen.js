import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);

  // date + hour/min
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ExamHistoryScreen({ navigateTo }) {
  const { studentData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [errorText, setErrorText] = useState('');

  const studentId = studentData?.id;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErrorText('');

        if (!studentId) {
          if (mounted) {
            setSessions([]);
            setLoading(false);
          }
          return;
        }

        // Pull completed sessions (the radar details are loaded later by TestResultsScreen via sessionId)
        const { data, error } = await supabase
          .from('test_sessions')
          .select('id, completed_at, created_at, status, session_type')
          .eq('student_id', studentId)
          .order('completed_at', { ascending: false });

        if (error) {
          console.log('ExamHistoryScreen test_sessions error:', error);
          if (mounted) {
            setSessions([]);
            setErrorText('Failed to load exam history.');
          }
          return;
        }

        const list = (data || []).filter((s) => s?.completed_at); // only completed exams
        if (mounted) setSessions(list);
      } catch (e) {
        console.log('ExamHistoryScreen error:', e?.message || e);
        if (mounted) {
          setSessions([]);
          setErrorText('Something went wrong.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [studentId]);

  const title = useMemo(() => 'سجل الاختبارات', []);

  const renderItem = ({ item, index }) => {
    const dateStr = formatDateTime(item.completed_at || item.created_at);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.badge}>
            <FontAwesome name="calendar" size={12} color="#94A3B8" />
            <Text style={styles.badgeText}>{dateStr}</Text>
          </View>

          <Text style={styles.examTitle}>اختبار #{sessions.length - index}</Text>
        </View>

        <TouchableOpacity
          style={styles.openBtn}
          onPress={() => navigateTo('testResults', { sessionId: item.id })}
          activeOpacity={0.9}
        >
          <FontAwesome name="area-chart" size={16} color="#0b1223" />
          <Text style={styles.openBtnText}>عرض النتائج (Radar)</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.page}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigateTo('profile')}
          activeOpacity={0.9}
        >
          <FontAwesome name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>{title}</Text>

        <View style={{ width: 42 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.centerText}>جارٍ تحميل السجل...</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.center}>
          <FontAwesome name="inbox" size={26} color="#94A3B8" />
          <Text style={styles.centerText}>
            {errorText ? errorText : 'لا يوجد اختبارات مكتملة بعد.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0b1223',
  },

  topBar: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  centerText: {
    color: '#94A3B8',
    fontWeight: '900',
    textAlign: 'center',
  },

  list: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 12,
  },

  card: {
    backgroundColor: '#121a2e',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },

  cardTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  examTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },

  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  badgeText: {
    color: '#94A3B8',
    fontWeight: '900',
    fontSize: 11,
  },

  openBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#22c55e',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  openBtnText: {
    color: '#0b1223',
    fontWeight: '900',
    fontSize: 13,
  },
});
