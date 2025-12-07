/**
 * TEST RESULTS SCREEN
 * 
 * Displays test results with radar chart visualization
 * Supports both single-subject and comprehensive test results
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

export default function TestResultsScreen({ navigateTo, results, subjectName, subjectNames, isComprehensive = false }) {
  const { t } = useTranslation();
  const { studentData } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [allAbilities, setAllAbilities] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [comprehensiveResults, setComprehensiveResults] = useState([]);

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
        
        // If comprehensive test, extract just-tested subjects
        if (isComprehensive && results && Array.isArray(results)) {
          // results should be an array of objects with subjectId and abilityScore
          setComprehensiveResults(results);
        }
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

  // Calculate overall score for comprehensive test
  const calculateOverallScore = () => {
    if (!isComprehensive || !comprehensiveResults.length) return 0;
    const sum = comprehensiveResults.reduce((total, r) => total + r.abilityScore, 0);
    return sum / comprehensiveResults.length;
  };

  // Get subject name by ID
  const getSubjectNameById = (subjectId, index) => {
    if (subjectNames && subjectNames[index]) {
      return subjectNames[index];
    }
    // Try to find in allAbilities
    const ability = allAbilities.find(a => a.subject_id === subjectId);
    return ability?.subjects?.name_ar || ability?.subjects?.name_en || `المادة ${index + 1}`;
  };

  const level = isComprehensive 
    ? getAbilityLevel(calculateOverallScore())
    : getAbilityLevel(results?.abilityScore || 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header - Different for comprehensive vs single */}
      <View style={styles.header}>
        <FontAwesome 
          name={isComprehensive ? "star" : "check-circle"} 
          size={64} 
          color="#27ae60" 
        />
        <Text style={styles.headerTitle}>
          {isComprehensive ? "اكتمل الاختبار الشامل!" : "اكتمل الاختبار!"}
        </Text>
        <Text style={styles.headerSubtitle}>
          {isComprehensive 
            ? `${subjectNames?.length || comprehensiveResults.length || 0} مواد` 
            : subjectName}
        </Text>
      </View>

      {/* Main Score Card */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>
          {isComprehensive ? "نتيجتك الشاملة" : "نتيجتك"}
        </Text>
        <Text style={[styles.scoreValue, { color: level.color }]}>
          {Math.round(isComprehensive ? calculateOverallScore() : results?.abilityScore || 0)}%
        </Text>
        <Text style={[styles.scoreLevel, { color: level.color }]}>
          {level.text}
        </Text>

        {/* Stats Row - Different for comprehensive */}
        {isComprehensive ? (
          // Comprehensive test stats
          <View style={styles.comprehensiveStats}>
            <View style={styles.statItem}>
              <FontAwesome name="book" size={20} color="#3498db" />
              <Text style={styles.statValue}>{comprehensiveResults.length}</Text>
              <Text style={styles.statLabel}>مواد</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <FontAwesome name="clock-o" size={20} color="#f39c12" />
              <Text style={styles.statValue}>
                {Math.round((results?.totalTime || 0) / 60)}
              </Text>
              <Text style={styles.statLabel}>دقيقة</Text>
            </View>
          </View>
        ) : (
          // Single subject stats
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <FontAwesome name="check" size={20} color="#27ae60" />
              <Text style={styles.statValue}>{results?.accuracy?.toFixed(0) || 0}%</Text>
              <Text style={styles.statLabel}>دقة</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <FontAwesome name="list" size={20} color="#3498db" />
              <Text style={styles.statValue}>{results?.questionsAnswered || 0}</Text>
              <Text style={styles.statLabel}>أسئلة</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <FontAwesome name="clock-o" size={20} color="#f39c12" />
              <Text style={styles.statValue}>
                {Math.round((results?.totalTime || 0) / 60)}
              </Text>
              <Text style={styles.statLabel}>دقيقة</Text>
            </View>
          </View>
        )}

        {/* Confidence Interval - Only for single subject */}
        {!isComprehensive && results?.confidenceInterval && (
          <View style={styles.confidenceSection}>
            <Text style={styles.confidenceLabel}>نطاق الثقة (95%):</Text>
            <Text style={styles.confidenceValue}>
              {Math.round(results.confidenceInterval.lower * 100 / 6 + 50)}% - 
              {Math.round(results.confidenceInterval.upper * 100 / 6 + 50)}%
            </Text>
          </View>
        )}
      </View>

      {/* Comprehensive Results Breakdown */}
      {isComprehensive && comprehensiveResults.length > 0 && (
        <View style={styles.comprehensiveBreakdown}>
          <Text style={styles.breakdownTitle}>نتائج المواد المفصلة</Text>
          
          {comprehensiveResults.map((result, index) => {
            const subjectLevel = getAbilityLevel(result.abilityScore);
            return (
              <View key={result.subjectId || index} style={styles.subjectResultCard}>
                <View style={styles.subjectResultHeader}>
                  <Text style={styles.subjectResultName}>
                    {getSubjectNameById(result.subjectId, index)}
                  </Text>
                  <Text style={[styles.subjectResultScore, { color: subjectLevel.color }]}>
                    {Math.round(result.abilityScore)}%
                  </Text>
                </View>
                
                <View style={styles.subjectResultDetails}>
                  <View style={styles.detailItem}>
                    <FontAwesome name="check" size={14} color="#27ae60" />
                    <Text style={styles.detailText}>
                      {result.accuracy?.toFixed(0) || 0}% دقة
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <FontAwesome name="list" size={14} color="#3498db" />
                    <Text style={styles.detailText}>
                      {result.questionsAnswered || 0} أسئلة
                    </Text>
                  </View>
                  <Text style={styles.subjectResultLevel}>
                    {subjectLevel.text}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Radar Chart - Show all abilities */}
      {!loading && allAbilities.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {isComprehensive ? "ملفك الشامل بعد الاختبار" : "ملفك الشامل"}
          </Text>
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
                  {rec.reasoning?.ar || rec.reasoning?.en || 'مادة موصى بها'}
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

        {isComprehensive && comprehensiveResults.length > 0 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              // Navigate to subject details or start new test
              navigateTo('home');
            }}
          >
            <Text style={styles.secondaryButtonText}>
              اختبار مواد أخرى
            </Text>
          </TouchableOpacity>
        )}

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
  comprehensiveStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  comprehensiveBreakdown: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subjectResultCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  subjectResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  subjectResultScore: {
    fontSize: 20,
    fontWeight: '700',
  },
  subjectResultDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  subjectResultLevel: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
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
