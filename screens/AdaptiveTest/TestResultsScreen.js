/**
 * TEST RESULTS SCREEN
 * 
 * Displays test results with radar chart visualization
 */

import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import RadarChart from '../../components/AdaptiveTest/RadarChart';
import { useAuth } from '../../contexts/AuthContext';
import { getStudentAbilities } from '../../services/abilityService';
import { generateStudentRecommendations } from '../../services/adaptiveTestService';

export default function TestResultsScreen({ navigateTo, results, subjectName }) {
  const { t } = useTranslation();
  const { studentData } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [allAbilities, setAllAbilities] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get all abilities for radar chart
      const abilitiesResult = await getStudentAbilities(studentData.id);
      if (abilitiesResult.success) {
        setAllAbilities(abilitiesResult.abilities);
      }

      // Generate recommendations
      const recsResult = await generateStudentRecommendations(studentData.id);
      if (recsResult.success) {
        setRecommendations(recsResult.recommendations);
      }
    } catch (error) {
      console.error('Error loading results data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAbilityLevel = (score) => {
    if (score >= 80) return { text: 'ممتاز', color: '#27ae60' };
    if (score >= 60) return { text: 'جيد جداً', color: '#3498db' };
    if (score >= 40) return { text: 'جيد', color: '#f39c12' };
    return { text: 'يحتاج تحسين', color: '#e74c3c' };
  };

  const level = getAbilityLevel(results.abilityScore);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <FontAwesome name="check-circle" size={64} color="#27ae60" />
        <Text style={styles.headerTitle}>اكتمل الاختبار!</Text>
        <Text style={styles.headerSubtitle}>{subjectName}</Text>
      </View>

      {/* Main Score Card */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>نتيجتك</Text>
        <Text style={[styles.scoreValue, { color: level.color }]}>
          {Math.round(results.abilityScore)}%
        </Text>
        <Text style={[styles.scoreLevel, { color: level.color }]}>
          {level.text}
        </Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <FontAwesome name="check" size={20} color="#27ae60" />
            <Text style={styles.statValue}>{results.accuracy.toFixed(0)}%</Text>
            <Text style={styles.statLabel}>دقة</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <FontAwesome name="list" size={20} color="#3498db" />
            <Text style={styles.statValue}>{results.questionsAnswered}</Text>
            <Text style={styles.statLabel}>أسئلة</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <FontAwesome name="clock-o" size={20} color="#f39c12" />
            <Text style={styles.statValue}>
              {Math.round(results.totalTime / 60)}
            </Text>
            <Text style={styles.statLabel}>دقيقة</Text>
          </View>
        </View>

        {/* Confidence Interval */}
        <View style={styles.confidenceSection}>
          <Text style={styles.confidenceLabel}>نطاق الثقة (95%):</Text>
          <Text style={styles.confidenceValue}>
            {Math.round(results.confidenceInterval.lower * 100 / 6 + 50)}% - 
            {Math.round(results.confidenceInterval.upper * 100 / 6 + 50)}%
          </Text>
        </View>
      </View>

      {/* Radar Chart */}
      {!loading && allAbilities.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>ملفك الشامل</Text>
          <Text style={styles.chartSubtitle}>
            مستوى قدراتك في جميع المواد
          </Text>
          <RadarChart abilities={allAbilities} />
        </View>
      )}

      {/* Recommendations Preview */}
      {!loading && recommendations.length > 0 && (
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>
            المواد الموصى بها لك
          </Text>
          <Text style={styles.recommendationsSubtitle}>
            بناءً على قدراتك واهتماماتك
          </Text>
          
          {recommendations.slice(0, 3).map((rec, index) => (
            <View key={rec.subjectId} style={styles.recommendationItem}>
              <View style={styles.recommendationRank}>
                <Text style={styles.recommendationRankText}>{index + 1}</Text>
              </View>
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationName}>
                  {rec.subjectId}
                </Text>
                <Text style={styles.recommendationReason}>
                  {rec.reasoning?.ar}
                </Text>
              </View>
              <View style={styles.recommendationScore}>
                <Text style={styles.recommendationScoreText}>
                  {Math.round(rec.recommendationScore)}%
                </Text>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => navigateTo('recommendations')}
          >
            <Text style={styles.viewAllButtonText}>
              عرض جميع التوصيات
            </Text>
            <FontAwesome name="arrow-left" size={16} color="#27ae60" />
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigateTo('home')}
        >
          <Text style={styles.primaryButtonText}>العودة للرئيسية</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigateTo('recommendations')}
        >
          <Text style={styles.secondaryButtonText}>
            عرض التوصيات الكاملة
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#27ae60" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#94A3B8',
  },
  scoreCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#94A3B8',
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: '700',
  },
  scoreLevel: {
    fontSize: 20,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#334155',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  confidenceSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  confidenceValue: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 12,
  },
  recommendationsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  recommendationsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  recommendationsSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
  },
  recommendationRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationRankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  recommendationContent: {
    flex: 1,
    gap: 4,
  },
  recommendationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  recommendationReason: {
    fontSize: 12,
    color: '#94A3B8',
  },
  recommendationScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#334155',
    borderRadius: 8,
  },
  recommendationScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#27ae60',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
  },
  actions: {
    gap: 12,
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
});
