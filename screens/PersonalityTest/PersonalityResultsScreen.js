/**
 * PERSONALITY RESULTS SCREEN
 * 
 * Displays personality test results with radar chart visualization
 * Shows insights, strengths, and career recommendations
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
import { getStudentPersonalityProfile } from '../../services/personalityTestService';

export default function PersonalityResultsScreen({ navigateTo, profiles }) {
  const { t, i18n } = useTranslation();
  const { studentData } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [fullProfile, setFullProfile] = useState(null);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    loadFullProfile();
  }, []);

  const loadFullProfile = async () => {
    try {
      setLoading(true);

      const result = await getStudentPersonalityProfile(studentData.id);
      if (result.success) {
        setFullProfile(result.profiles);
        setInsights(result.insights);
      }
    } catch (error) {
      console.error('Error loading personality profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDimensionIcon = (code) => {
    const icons = {
      openness: 'lightbulb-o',
      conscientiousness: 'check-square-o',
      extraversion: 'users',
      agreeableness: 'heart',
      emotional_stability: 'shield'
    };
    return icons[code] || 'star';
  };

  const getDimensionColor = (code) => {
    const colors = {
      openness: '#9b59b6',
      conscientiousness: '#3498db',
      extraversion: '#e74c3c',
      agreeableness: '#27ae60',
      emotional_stability: '#f39c12'
    };
    return colors[code] || '#9b59b6';
  };

  const getScoreLevel = (score) => {
    if (score >= 80) return { 
      textAr: 'مرتفع جداً', 
      textHe: 'גבוה מאוד',
      color: '#27ae60' 
    };
    if (score >= 60) return { 
      textAr: 'مرتفع', 
      textHe: 'גבוה',
      color: '#3498db' 
    };
    if (score >= 40) return { 
      textAr: 'متوسط', 
      textHe: 'בינוני',
      color: '#f39c12' 
    };
    return { 
      textAr: 'منخفض', 
      textHe: 'נמוך',
      color: '#e74c3c' 
    };
  };

  // Prepare data for radar chart
  const radarData = fullProfile?.map(p => ({
    subject: {
      name_ar: p.personality_dimensions.name_ar,
      name_he: p.personality_dimensions.name_he,
      code: p.personality_dimensions.code
    },
    ability_score: p.dimension_score
  })) || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <FontAwesome name="user-circle" size={64} color="#9b59b6" />
        <Text style={styles.headerTitle}>
          {t('personalityTest.resultsTitle')}
        </Text>
        <Text style={styles.headerSubtitle}>
          {t('personalityTest.resultsSubtitle')}
        </Text>
      </View>

      {/* Personality Type Card */}
      {insights && (
        <View style={styles.typeCard}>
          <View style={styles.typeHeader}>
            <FontAwesome name="star" size={24} color="#f39c12" />
            <Text style={styles.typeTitle}>
              {t('personalityTest.yourType')}
            </Text>
          </View>
          <Text style={styles.typeName}>
            {insights.personality_type || t('personalityTest.balanced')}
          </Text>
          <Text style={styles.typeDescription}>
            {i18n.language === 'ar' 
              ? insights.personality_type_description_ar 
              : insights.personality_type_description_he
            }
          </Text>
        </View>
      )}

      {/* Radar Chart */}
      {!loading && radarData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {t('personalityTest.dimensionsChart')}
          </Text>
          <Text style={styles.chartSubtitle}>
            {t('personalityTest.dimensionsChartSubtitle')}
          </Text>
          <RadarChart abilities={radarData} />
        </View>
      )}

      {/* Dimensions Breakdown */}
      <View style={styles.dimensionsCard}>
        <Text style={styles.sectionTitle}>
          {t('personalityTest.dimensionsBreakdown')}
        </Text>
        {fullProfile?.map((profile, index) => {
          const dimension = profile.personality_dimensions;
          const level = getScoreLevel(profile.dimension_score);
          
          return (
            <View key={index} style={styles.dimensionItem}>
              <View style={styles.dimensionHeader}>
                <View style={styles.dimensionIconContainer}>
                  <FontAwesome 
                    name={getDimensionIcon(dimension.code)} 
                    size={20} 
                    color={getDimensionColor(dimension.code)} 
                  />
                </View>
                <View style={styles.dimensionInfo}>
                  <Text style={styles.dimensionName}>
                    {i18n.language === 'ar' ? dimension.name_ar : dimension.name_he}
                  </Text>
                  <Text style={styles.dimensionDescription}>
                    {i18n.language === 'ar' ? dimension.description_ar : dimension.description_he}
                  </Text>
                </View>
              </View>
              
              <View style={styles.dimensionScore}>
                <View style={styles.scoreBar}>
                  <View 
                    style={[
                      styles.scoreBarFill, 
                      { 
                        width: `${profile.dimension_score}%`,
                        backgroundColor: getDimensionColor(dimension.code)
                      }
                    ]} 
                  />
                </View>
                <View style={styles.scoreInfo}>
                  <Text style={[styles.scoreValue, { color: level.color }]}>
                    {Math.round(profile.dimension_score)}%
                  </Text>
                  <Text style={[styles.scoreLevel, { color: level.color }]}>
                    {i18n.language === 'ar' ? level.textAr : level.textHe}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Strengths */}
      {insights && insights.strengths_ar && (
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <FontAwesome name="check-circle" size={20} color="#27ae60" />
            <Text style={styles.insightsTitle}>
              {t('personalityTest.strengths')}
            </Text>
          </View>
          {(i18n.language === 'ar' ? insights.strengths_ar : insights.strengths_he)?.map((strength, index) => (
            <View key={index} style={styles.insightItem}>
              <FontAwesome name="star" size={14} color="#27ae60" />
              <Text style={styles.insightText}>{strength}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Development Areas */}
      {insights && insights.development_areas_ar && (
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <FontAwesome name="arrow-up" size={20} color="#3498db" />
            <Text style={styles.insightsTitle}>
              {t('personalityTest.developmentAreas')}
            </Text>
          </View>
          {(i18n.language === 'ar' ? insights.development_areas_ar : insights.development_areas_he)?.map((area, index) => (
            <View key={index} style={styles.insightItem}>
              <FontAwesome name="lightbulb-o" size={14} color="#3498db" />
              <Text style={styles.insightText}>{area}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Career Recommendations */}
      {insights && insights.recommended_careers_ar && (
        <View style={styles.careersCard}>
          <View style={styles.careersHeader}>
            <FontAwesome name="briefcase" size={20} color="#9b59b6" />
            <Text style={styles.careersTitle}>
              {t('personalityTest.recommendedCareers')}
            </Text>
          </View>
          <Text style={styles.careersSubtitle}>
            {t('personalityTest.recommendedCareersSubtitle')}
          </Text>
          <View style={styles.careersList}>
            {(i18n.language === 'ar' ? insights.recommended_careers_ar : insights.recommended_careers_he)?.map((career, index) => (
              <View key={index} style={styles.careerItem}>
                <FontAwesome name="check" size={14} color="#9b59b6" />
                <Text style={styles.careerText}>{career}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Study Style */}
      {insights && insights.study_style_ar && (
        <View style={styles.studyCard}>
          <View style={styles.studyHeader}>
            <FontAwesome name="book" size={20} color="#f39c12" />
            <Text style={styles.studyTitle}>
              {t('personalityTest.studyStyle')}
            </Text>
          </View>
          <Text style={styles.studyText}>
            {i18n.language === 'ar' ? insights.study_style_ar : insights.study_style_he}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigateTo('home')}
        >
          <FontAwesome name="home" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {t('personalityTest.backToHome')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigateTo('personalityTest')}
        >
          <FontAwesome name="refresh" size={18} color="#9b59b6" />
          <Text style={styles.secondaryButtonText}>
            {t('personalityTest.retakeTest')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#9b59b6" />
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
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  typeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    gap: 12,
    borderWidth: 2,
    borderColor: '#9b59b6',
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  typeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  typeDescription: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
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
  dimensionsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    gap: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  dimensionItem: {
    gap: 12,
  },
  dimensionHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  dimensionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dimensionInfo: {
    flex: 1,
    gap: 4,
  },
  dimensionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dimensionDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  dimensionScore: {
    gap: 8,
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreLevel: {
    fontSize: 14,
    fontWeight: '600',
  },
  insightsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingLeft: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
  },
  careersCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  careersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  careersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  careersSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  careersList: {
    gap: 12,
  },
  careerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
  },
  careerText: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  studyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  studyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  studyText: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 24,
  },
  actions: {
    gap: 12,
    marginTop: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#9b59b6',
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9b59b6',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9b59b6',
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
