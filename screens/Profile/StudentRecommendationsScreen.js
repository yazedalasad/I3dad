// File: screens/Profile/StudentRecommendationsScreen.js

import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { recommendTopDegrees } from '../../services/recommendationService';

export default function StudentRecommendationsScreen({ navigateTo }) {
  const { studentData } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (!studentData?.id) return;

    loadRecommendations();
  }, [studentData?.id]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await recommendTopDegrees(studentData.id, { limit: 5 });

      if (!res.success) {
        setError(res.error || 'Failed to load recommendations');
        return;
      }

      setRecommendations(res.data || []);
    } catch (e) {
      setError('Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigateTo('profile')}
        >
          <FontAwesome name="arrow-left" size={18} color="#94a3b8" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>التوصيات الأكاديمية</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.loadingText}>جاري تحليل النتائج…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : recommendations.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            لا توجد توصيات حالياً. أكمل الاختبارات أولاً.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {recommendations.map((rec, index) => (
            <View key={rec.degree_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.rank}>#{index + 1}</Text>
                <Text style={styles.degreeName}>{rec.name_he}</Text>
              </View>

              <Text style={styles.score}>
                نسبة التوافق: {(rec.score * 100).toFixed(0)}%
              </Text>

              <View style={styles.reasons}>
                <Text style={styles.reasonsTitle}>سبب التوصية:</Text>

                {rec.explanation?.top_subjects?.slice(0, 3).map((s) => (
                  <Text key={s.subject_id} style={styles.reasonItem}>
                    • {s.subject_name_he}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/* ======================= STYLES ======================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1223',
  },

  header: {
    paddingTop: 24,
    paddingBottom: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '900',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  errorText: {
    color: '#e74c3c',
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontWeight: '800',
    textAlign: 'center',
  },

  content: {
    padding: 18,
  },

  card: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rank: {
    color: '#27ae60',
    fontWeight: '900',
    fontSize: 14,
  },
  degreeName: {
    color: '#e2e8f0',
    fontWeight: '900',
    fontSize: 15,
    flex: 1,
  },

  score: {
    marginTop: 8,
    color: '#94a3b8',
    fontWeight: '800',
    fontSize: 13,
  },

  reasons: {
    marginTop: 10,
  },
  reasonsTitle: {
    color: '#e2e8f0',
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 4,
  },
  reasonItem: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 12,
  },
});
