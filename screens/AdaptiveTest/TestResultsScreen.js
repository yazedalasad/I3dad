/**
 * TEST RESULTS SCREEN - COMPREHENSIVE EXAM ONLY
 * 
 * Displays comprehensive exam results with enhanced analytics
 * Designed for < 40 minute exam with 2 questions per subject
 */

import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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

const { width } = Dimensions.get('window');

export default function TestResultsScreen({ navigateTo, results, subjectNames, totalTimeSpent = 0, skippedCount = 0 }) {
  const { t } = useTranslation();
  const { studentData } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [allAbilities, setAllAbilities] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [comprehensiveResults, setComprehensiveResults] = useState([]);
  const [examAnalytics, setExamAnalytics] = useState(null);

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
        
        // Extract just-tested subjects
        if (results && Array.isArray(results)) {
          setComprehensiveResults(results);
          
          // Calculate exam analytics
          calculateExamAnalytics(results, totalTimeSpent, skippedCount);
        }
      }

      // Generate recommendations
      const recsResult = await generateStudentRecommendations(studentData.id);
      if (recsResult.success) {
        setRecommendations(recsResult.recommendations);
      }
    } catch (error) {
      console.error('Error loading results data:', error);
      Alert.alert('خطأ', 'فشل في تحميل نتائج الاختبار');
    } finally {
      setLoading(false);
    }
  };

  const getAbilityLevel = (score) => {
    if (score >= 80) return { text: 'ممتاز', color: '#27ae60', emoji: '⭐' };
    if (score >= 60) return { text: 'جيد جداً', color: '#3498db', emoji: '👍' };
    if (score >= 40) return { text: 'جيد', color: '#f39c12', emoji: '✓' };
    return { text: 'يحتاج تحسين', color: '#e74c3c', emoji: '📈' };
  };

  // Calculate exam analytics
  const calculateExamAnalytics = (results, totalTime, skipped) => {
    if (!results || results.length === 0) return;

    const totalQuestions = results.reduce((sum, r) => sum + r.questionsAnswered, 0);
    const totalCorrect = results.reduce((sum, r) => sum + (r.accuracy * r.questionsAnswered / 100), 0);
    const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    const avgTimePerQuestion = totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0;
    
    // Find strongest and weakest subjects
    const sortedResults = [...results].sort((a, b) => b.abilityScore - a.abilityScore);
    const strongestSubjects = sortedResults.slice(0, 3);
    const weakestSubjects = sortedResults.slice(-3).reverse();
    
    // Calculate time efficiency
    let timeEfficiency = 'متوسط';
    let efficiencyColor = '#f39c12';
    
    if (avgTimePerQuestion < 30) {
      timeEfficiency = 'سريع جداً';
      efficiencyColor = '#e74c3c';
    } else if (avgTimePerQuestion < 50) {
      timeEfficiency = 'سريع';
      efficiencyColor = '#f39c12';
    } else if (avgTimePerQuestion < 70) {
      timeEfficiency = 'متوسط';
      efficiencyColor = '#3498db';
    } else if (avgTimePerQuestion < 90) {
      timeEfficiency = 'بطيء';
      efficiencyColor = '#9b59b6';
    } else {
      timeEfficiency = 'بطيء جداً';
      efficiencyColor = '#e74c3c';
    }

    // Calculate skipped impact
    const skippedPercentage = totalQuestions > 0 ? (skipped / totalQuestions) * 100 : 0;
    let skippedImpact = 'منخفض';
    let skippedColor = '#27ae60';
    
    if (skippedPercentage > 20) {
      skippedImpact = 'عالٍ';
      skippedColor = '#e74c3c';
    } else if (skippedPercentage > 10) {
      skippedImpact = 'متوسط';
      skippedColor = '#f39c12';
    }

    setExamAnalytics({
      totalQuestions,
      overallAccuracy: Math.round(overallAccuracy),
      avgTimePerQuestion,
      totalTime,
      skippedCount: skipped,
      skippedPercentage: Math.round(skippedPercentage),
      timeEfficiency,
      efficiencyColor,
      skippedImpact,
      skippedColor,
      strongestSubjects,
      weakestSubjects
    });
  };

  // Calculate overall score for comprehensive test
  const calculateOverallScore = () => {
    if (!comprehensiveResults.length) return 0;
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

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const overallScore = calculateOverallScore();
  const level = getAbilityLevel(overallScore);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <FontAwesome name="trophy" size={72} color="#27ae60" />
        <Text style={styles.headerTitle}>
          اكتمل الامتحان الشامل!
        </Text>
        <Text style={styles.headerSubtitle}>
          {subjectNames?.length || comprehensiveResults.length || 0} مواد
        </Text>
      </View>

      {/* Main Score Card */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>
          النتيجة الشاملة
        </Text>
        <Text style={[styles.scoreValue, { color: level.color }]}>
          {Math.round(overallScore)}%
        </Text>
        <Text style={[styles.scoreLevel, { color: level.color }]}>
          {level.emoji} {level.text}
        </Text>

        {/* Time & Efficiency Stats */}
        {examAnalytics && (
          <View style={styles.efficiencyStats}>
            <View style={styles.efficiencyRow}>
              <View style={styles.efficiencyItem}>
                <FontAwesome name="check-circle" size={20} color="#27ae60" />
                <Text style={styles.efficiencyValue}>{examAnalytics.overallAccuracy}%</Text>
                <Text style={styles.efficiencyLabel}>دقة</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.efficiencyItem}>
                <FontAwesome name="clock-o" size={20} color="#f39c12" />
                <Text style={styles.efficiencyValue}>{formatTime(examAnalytics.totalTime)}</Text>
                <Text style={styles.efficiencyLabel}>الوقت</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.efficiencyItem}>
                <FontAwesome name="forward" size={20} color="#f39c12" />
                <Text style={[styles.efficiencyValue, { color: examAnalytics.skippedColor }]}>
                  {examAnalytics.skippedCount}
                </Text>
                <Text style={[styles.efficiencyLabel, { color: examAnalytics.skippedColor }]}>
                  تخطي
                </Text>
              </View>
            </View>

            {/* Time Efficiency Badge */}
            <View style={styles.timeEfficiencyBadge}>
              <FontAwesome name="dashboard" size={16} color={examAnalytics.efficiencyColor} />
              <Text style={[styles.timeEfficiencyText, { color: examAnalytics.efficiencyColor }]}>
                كفاءة الوقت: {examAnalytics.timeEfficiency} ({examAnalytics.avgTimePerQuestion} ثانية/سؤال)
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Comprehensive Results Breakdown */}
      {comprehensiveResults.length > 0 && (
        <View style={styles.comprehensiveBreakdown}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownTitle}>نتائج المواد المفصلة</Text>
            <Text style={styles.breakdownSubtitle}>
              {comprehensiveResults.length} مادة، {comprehensiveResults.reduce((sum, r) => sum + r.questionsAnswered, 0)} سؤال
            </Text>
          </View>
          
          {comprehensiveResults.map((result, index) => {
            const subjectLevel = getAbilityLevel(result.abilityScore);
            const timePerQuestion = examAnalytics?.totalTime > 0 
              ? Math.round(examAnalytics.totalTime / comprehensiveResults.reduce((sum, r) => sum + r.questionsAnswered, 0))
              : 60;
              
            return (
              <View key={result.subjectId || index} style={styles.subjectResultCard}>
                <View style={styles.subjectResultHeader}>
                  <View style={styles.subjectInfo}>
                    <View style={[styles.subjectBadge, { backgroundColor: subjectLevel.color + '20' }]}>
                      <Text style={[styles.subjectBadgeText, { color: subjectLevel.color }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={styles.subjectResultName}>
                      {getSubjectNameById(result.subjectId, index)}
                    </Text>
                  </View>
                  <Text style={[styles.subjectResultScore, { color: subjectLevel.color }]}>
                    {Math.round(result.abilityScore)}%
                  </Text>
                </View>
                
                <View style={styles.subjectResultDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <FontAwesome name="check" size={14} color="#27ae60" />
                      <Text style={styles.detailText}>
                        {Math.round(result.accuracy)}% دقة
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <FontAwesome name="list" size={14} color="#3498db" />
                      <Text style={styles.detailText}>
                        {result.questionsAnswered} أسئلة
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <FontAwesome name="clock-o" size={14} color="#f39c12" />
                      <Text style={styles.detailText}>
                        {Math.round(timePerQuestion)}s/سؤال
                      </Text>
                    </View>
                  </View>
                  <View style={styles.subjectLevelRow}>
                    <Text style={[styles.subjectResultLevel, { color: subjectLevel.color }]}>
                      {subjectLevel.emoji} {subjectLevel.text}
                    </Text>
                    <View style={[styles.progressBarMini, { backgroundColor: subjectLevel.color + '30' }]}>
                      <View style={[styles.progressMini, { 
                        width: `${result.abilityScore}%`,
                        backgroundColor: subjectLevel.color 
                      }]} />
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Strengths & Weaknesses Analysis */}
      {examAnalytics && (
        <View style={styles.analysisCard}>
          <Text style={styles.analysisTitle}>تحليل نقاط القوة والضعف</Text>
          
          <View style={styles.analysisGrid}>
            <View style={styles.strengthCard}>
              <View style={styles.analysisHeader}>
                <FontAwesome name="arrow-up" size={20} color="#27ae60" />
                <Text style={styles.analysisSubtitle}>أقوى المواد</Text>
              </View>
              {examAnalytics.strongestSubjects.map((subject, index) => (
                <View key={index} style={styles.analysisItem}>
                  <Text style={styles.analysisItemName}>
                    {getSubjectNameById(subject.subjectId, index)}
                  </Text>
                  <Text style={[styles.analysisItemScore, { color: '#27ae60' }]}>
                    {Math.round(subject.abilityScore)}%
                  </Text>
                </View>
              ))}
            </View>
            
            <View style={styles.weaknessCard}>
              <View style={styles.analysisHeader}>
                <FontAwesome name="arrow-down" size={20} color="#e74c3c" />
                <Text style={styles.analysisSubtitle}>مواد تحتاج تحسين</Text>
              </View>
              {examAnalytics.weakestSubjects.map((subject, index) => (
                <View key={index} style={styles.analysisItem}>
                  <Text style={styles.analysisItemName}>
                    {getSubjectNameById(subject.subjectId, index + examAnalytics.strongestSubjects.length)}
                  </Text>
                  <Text style={[styles.analysisItemScore, { color: '#e74c3c' }]}>
                    {Math.round(subject.abilityScore)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Radar Chart - Show all abilities */}
      {!loading && allAbilities.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            ملفك الشامل بعد الاختبار
          </Text>
          <Text style={styles.chartSubtitle}>
            مستوى قدراتك في جميع المواد
          </Text>
          <RadarChart abilities={allAbilities} />
          <View style={styles.chartNote}>
            <FontAwesome name="info-circle" size={14} color="#94A3B8" />
            <Text style={styles.chartNoteText}>
              الدائرة الخارجية تمثل 100%، كل نقطة تمثل مادة
            </Text>
          </View>
        </View>
      )}

      {/* Recommendations Preview */}
      {!loading && recommendations.length > 0 && (
        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>
            المواد الموصى بها لك
          </Text>
          <Text style={styles.recommendationsSubtitle}>
            بناءً على أدائك في هذا الاختبار
          </Text>
          
          {recommendations.slice(0, 3).map((rec, index) => (
            <TouchableOpacity
              key={rec.subjectId}
              style={styles.recommendationItem}
              onPress={() => navigateTo('subjectDetails', { subjectId: rec.subjectId })}
            >
              <View style={styles.recommendationRank}>
                <Text style={styles.recommendationRankText}>{index + 1}</Text>
              </View>
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationName}>
                  {rec.subjectName || `المادة ${index + 1}`}
                </Text>
                <Text style={styles.recommendationReason}>
                  {rec.reasoning?.ar || 'مادة مناسبة لمستواك واهتماماتك'}
                </Text>
              </View>
              <View style={styles.recommendationScore}>
                <Text style={styles.recommendationScoreText}>
                  {Math.round(rec.recommendationScore)}%
                </Text>
                <FontAwesome name="arrow-left" size={12} color="#27ae60" />
              </View>
            </TouchableOpacity>
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
          <FontAwesome name="home" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>العودة للرئيسية</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigateTo('recommendations')}
        >
          <FontAwesome name="list-alt" size={18} color="#27ae60" />
          <Text style={styles.secondaryButtonText}>
            عرض التوصيات الكاملة
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => {
            // Navigate to retry exam or other tests
            navigateTo('totalExam');
          }}
        >
          <FontAwesome name="refresh" size={16} color="#3498db" />
          <Text style={styles.outlineButtonText}>
            اختبار شامل آخر
          </Text>
        </TouchableOpacity>
      </View>

      {/* Performance Summary */}
      {examAnalytics && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>ملخص الأداء</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatTime(examAnalytics.totalTime)}</Text>
              <Text style={styles.summaryLabel}>الوقت الكلي</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{examAnalytics.avgTimePerQuestion}s</Text>
              <Text style={styles.summaryLabel}>متوسط الوقت/سؤال</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{examAnalytics.skippedCount}</Text>
              <Text style={styles.summaryLabel}>أسئلة متخطاة</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{Math.round(overallScore)}%</Text>
              <Text style={styles.summaryLabel}>النتيجة النهائية</Text>
            </View>
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.loadingText}>جاري تحليل النتائج...</Text>
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#94A3B8',
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: '900',
    marginVertical: 4,
  },
  scoreLevel: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  efficiencyStats: {
    width: '100%',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  efficiencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  efficiencyItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#334155',
  },
  efficiencyValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  efficiencyLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  timeEfficiencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
    gap: 8,
    marginTop: 8,
  },
  timeEfficiencyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  comprehensiveBreakdown: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  breakdownHeader: {
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  breakdownSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  subjectResultCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  subjectResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subjectBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectBadgeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  subjectResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  subjectResultScore: {
    fontSize: 24,
    fontWeight: '700',
  },
  subjectResultDetails: {
    gap: 12,
  },
  detailRow: {
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
  subjectLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectResultLevel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarMini: {
    width: 120,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressMini: {
    height: '100%',
    borderRadius: 3,
  },
  analysisCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  analysisGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  strengthCard: {
    flex: 1,
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.3)',
  },
  weaknessCard: {
    flex: 1,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  analysisSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  analysisItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisItemName: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  analysisItemScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    alignItems: 'center',
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
  chartNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
  },
  chartNoteText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  recommendationsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
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
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 16,
  },
  recommendationRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
  },
  actions: {
    gap: 12,
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#27ae60',
    gap: 10,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#27ae60',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3498db',
    gap: 8,
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
  },
  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
});
