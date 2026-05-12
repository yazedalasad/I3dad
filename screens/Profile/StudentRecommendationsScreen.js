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

import { useAuth } from '../../contexts/AuthContext';
import { getStudentJourneySnapshot } from '../../services/studentJourneyService';

export default function StudentRecommendationsScreen({ navigateTo }) {
  const { studentData } = useAuth();
  const { i18n = { language: 'en' } } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const isArabic = String(i18n.language || '').toLowerCase().startsWith('ar');
  const isHebrew = String(i18n.language || '').toLowerCase().startsWith('he');
  const isRtl = isArabic || isHebrew;

  const copy = isHebrew
    ? {
        title: 'המלצות אקדמיות',
        loading: 'מנתח את התוצאות שלך...',
        empty: 'עדיין אין המלצות. כדאי להשלים את המבחנים והמשחקים תחילה.',
        overview: '3 המסלולים המובילים שלך',
        overviewBody: 'כאן רואים לא רק ציון, אלא למה המסלול מתאים לך, מה כדאי לחזק, ומהו הצעד הבא.',
        score: 'אחוז התאמה',
        why: 'למה זה מתאים לך',
        improve: 'מה לחזק',
        roadmap: 'המסלול הבא',
        profileSignals: 'אותות מהפרופיל',
        topStrengths: 'חוזקות מובילות',
        gameSignals: 'מהמשחקים',
        fullReport: 'לפתיחת הדוח המלא',
        details: 'פרטי מסלול',
        miniTask: 'משימת טעימה',
        institutions: 'מוסדות לימוד',
        back: 'חזרה לפרופיל',
        noGames: 'עדיין אין נתוני משחקים.',
        noStrengths: 'עדיין אין נתוני יכולות.',
      }
    : isArabic
      ? {
          title: 'التوصيات الأكاديمية',
          loading: 'جاري تحليل نتائجك...',
          empty: 'لا توجد توصيات بعد. من الأفضل إكمال الاختبارات والألعاب أولًا.',
          overview: 'أفضل 3 مسارات لك',
          overviewBody: 'هنا لا نعرض فقط نسبة التوافق، بل لماذا يناسبك المسار، ماذا تحتاج أن تطور، وما الخطوة التالية.',
          score: 'نسبة التوافق',
          why: 'لماذا يناسبك',
          improve: 'ما الذي تحتاج تطويره',
          roadmap: 'المسار التالي',
          profileSignals: 'إشارات من ملفك',
          topStrengths: 'أقوى نقاطك',
          gameSignals: 'من الألعاب',
          fullReport: 'فتح التقرير الكامل',
          details: 'تفاصيل التخصص',
          miniTask: 'مهمة تجريبية',
          institutions: 'المؤسسات التعليمية',
          back: 'العودة للملف الشخصي',
          noGames: 'لا توجد بيانات ألعاب بعد.',
          noStrengths: 'لا توجد بيانات قدرات بعد.',
        }
      : {
          title: 'Academic Recommendations',
          loading: 'Analyzing your results...',
          empty: 'No recommendations yet. Complete the tests and games first.',
          overview: 'Your top 3 paths',
          overviewBody: 'This view shows more than a score: why the path fits, what to improve, and what to do next.',
          score: 'Match score',
          why: 'Why it fits you',
          improve: 'What to improve',
          roadmap: 'Next roadmap',
          profileSignals: 'Profile signals',
          topStrengths: 'Top strengths',
          gameSignals: 'From games',
          fullReport: 'Open full report',
          details: 'تفاصيل التخصص',
          miniTask: 'مهمة تجريبية',
          institutions: 'Institutions',
          back: 'Back to profile',
          noGames: 'No game data yet.',
          noStrengths: 'No ability data yet.',
        };

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      if (!studentData?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await getStudentJourneySnapshot(studentData.id, {
          language: i18n.language,
        });

        if (cancelled) return;

        if (!result?.success) {
          setError(result?.error || 'Failed to load recommendations');
          return;
        }

        setSnapshot(result.data || null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || 'Unexpected error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [studentData?.id, i18n.language]);

  const recommendations = snapshot?.recommendations || [];
  const topRecommendation = snapshot?.topRecommendation || null;
  const strongestAbilities = snapshot?.strongestAbilities || [];
  const gameHighlights = snapshot?.gameHighlights || [];
  const gameCareerSignals = snapshot?.gameCareerSignals || { skills: [], topics: [], degrees: [], explanations: [] };

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRtl && styles.headerRtl]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo('profile')}>
          <FontAwesome name={isRtl ? 'arrow-right' : 'arrow-left'} size={18} color="#94a3b8" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, isRtl && styles.rtlText]}>{copy.title}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.loadingText}>{copy.loading}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : recommendations.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{copy.empty}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <Text style={[styles.heroTitle, isRtl && styles.rtlText]}>{copy.overview}</Text>
            <Text style={[styles.heroBody, isRtl && styles.rtlText]}>{copy.overviewBody}</Text>

            {topRecommendation ? (
              <View style={[styles.heroScoreRow, isRtl && styles.heroScoreRowRtl]}>
                <View style={styles.heroScoreBadge}>
                  <FontAwesome name="star" size={14} color="#0b1223" />
                  <Text style={styles.heroScoreText}>{topRecommendation.scorePercent}%</Text>
                </View>

                <Text style={[styles.heroScoreLabel, isRtl && styles.rtlText]}>
                  {topRecommendation.name}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.signalsCard}>
            <Text style={[styles.sectionTitle, isRtl && styles.rtlText]}>{copy.profileSignals}</Text>

            <View style={styles.signalBlock}>
              <Text style={[styles.signalTitle, isRtl && styles.rtlText]}>{copy.topStrengths}</Text>
              {strongestAbilities.length === 0 ? (
                <Text style={[styles.signalFallback, isRtl && styles.rtlText]}>{copy.noStrengths}</Text>
              ) : (
                <View style={[styles.chipsRow, isRtl && styles.chipsRowRtl]}>
                  {strongestAbilities.slice(0, 4).map((item) => (
                    <View key={item.subjectId || item.label} style={styles.signalChip}>
                      <Text style={styles.signalChipScore}>{item.score}%</Text>
                      <Text style={[styles.signalChipText, isRtl && styles.rtlText]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.signalBlock}>
              <Text style={[styles.signalTitle, isRtl && styles.rtlText]}>{copy.gameSignals}</Text>
              {gameHighlights.length === 0 && !gameCareerSignals.skills?.length ? (
                <Text style={[styles.signalFallback, isRtl && styles.rtlText]}>{copy.noGames}</Text>
              ) : (
                <>
                  {gameCareerSignals.skills?.length ? (
                    <View style={[styles.chipsRow, isRtl && styles.chipsRowRtl]}>
                      {gameCareerSignals.skills.slice(0, 4).map((skill) => (
                        <View key={skill.skill_tag} style={styles.signalChip}>
                          <Text style={styles.signalChipScore}>{skill.score}%</Text>
                          <Text style={[styles.signalChipText, isRtl && styles.rtlText]}>{skill.label}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {gameCareerSignals.topics?.slice(0, 3).map((topic) => (
                    <Text key={topic.topic_key} style={[styles.gameHint, isRtl && styles.rtlText]}>
                      {topic.label}: {topic.score}
                    </Text>
                  ))}

                  {gameCareerSignals.degrees?.slice(0, 3).map((degree) => (
                    <Text key={degree.degree_id || degree.degree_code} style={[styles.gameHint, isRtl && styles.rtlText]}>
                      {degree.name_ar || degree.name_he || degree.name_en || degree.degree_code}
                    </Text>
                  ))}

                  {gameCareerSignals.explanations?.[0] ? (
                    <Text style={[styles.gameHint, isRtl && styles.rtlText]}>
                      {isHebrew
                        ? gameCareerSignals.explanations[0].reason_he
                        : isArabic
                          ? gameCareerSignals.explanations[0].reason_ar
                          : gameCareerSignals.explanations[0].reason_en}
                    </Text>
                  ) : null}

                  {gameHighlights.slice(0, 2).map((game) => (
                    <View key={game.gameId} style={[styles.gameRow, isRtl && styles.gameRowRtl]}>
                    <View style={styles.gameLead}>
                      <Text style={[styles.gameName, isRtl && styles.rtlText]}>{game.title}</Text>
                      <Text style={[styles.gameHint, isRtl && styles.rtlText]}>{game.focusArea}</Text>
                      <Text style={[styles.gameHint, isRtl && styles.rtlText]}>
                        {`Plays: ${game.playCount || 1} • ${game.totalPlayMinutes || 0} min • Interest ${game.interest || 0}%`}
                      </Text>
                      {game.topics?.length ? (
                        <Text style={[styles.gameHint, isRtl && styles.rtlText]}>
                          {game.topics.slice(0, 3).join(' • ')}
                        </Text>
                      ) : null}
                      {game.suggestedMajors?.length ? (
                        <Text style={[styles.gameHint, isRtl && styles.rtlText]}>
                          {game.suggestedMajors.slice(0, 3).join(' • ')}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.gameScore}>{game.score}%</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>

          {recommendations.map((recommendation, index) => (
            <View key={recommendation.degree_id || `${recommendation.name}-${index}`} style={styles.card}>
              <View style={[styles.cardHeader, isRtl && styles.cardHeaderRtl]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>

                <View style={styles.cardTitleBlock}>
                  <Text style={[styles.degreeName, isRtl && styles.rtlText]}>{recommendation.name}</Text>
                  <Text style={[styles.score, isRtl && styles.rtlText]}>
                    {copy.score}: {recommendation.scorePercent}%
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${recommendation.scorePercent}%` }]} />
              </View>

              <View style={styles.infoSection}>
                <Text style={[styles.infoTitle, isRtl && styles.rtlText]}>{copy.why}</Text>
                {(recommendation.reasons || []).map((reason, reasonIndex) => (
                  <Text key={`${recommendation.degree_id}-reason-${reasonIndex}`} style={[styles.infoItem, isRtl && styles.rtlText]}>
                    • {reason}
                  </Text>
                ))}
              </View>

              <View style={styles.infoSection}>
                <Text style={[styles.infoTitle, isRtl && styles.rtlText]}>{copy.improve}</Text>
                {(recommendation.improvementAreas || []).map((item, itemIndex) => (
                  <Text key={`${recommendation.degree_id}-improve-${itemIndex}`} style={[styles.infoItem, isRtl && styles.rtlText]}>
                    • {item}
                  </Text>
                ))}
              </View>

              {index === 0 && topRecommendation?.roadmap?.length ? (
                <View style={styles.infoSection}>
                  <Text style={[styles.infoTitle, isRtl && styles.rtlText]}>{copy.roadmap}</Text>
                  {topRecommendation.roadmap.map((step, stepIndex) => (
                    <Text key={`roadmap-${stepIndex}`} style={[styles.infoItem, isRtl && styles.rtlText]}>
                      {stepIndex + 1}. {step}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={[styles.cardActions, isRtl && styles.cardActionsRtl]}>
                <TouchableOpacity
                  style={styles.cardGhostBtn}
                  onPress={() =>
                    navigateTo('majorDetails', {
                      majorName: recommendation.name,
                    })
                  }
                >
                  <Text style={styles.cardGhostBtnText}>{copy.details}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cardSolidBtn}
                  onPress={() =>
                    navigateTo('miniTasks', {
                      majorName: recommendation.name,
                    })
                  }
                >
                  <Text style={styles.cardSolidBtnText}>{copy.miniTask}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cardGhostBtn}
                  onPress={() =>
                    navigateTo('universitiesAndColleges', {
                      majorName: recommendation.name,
                    })
                  }
                >
                  <Text style={styles.cardGhostBtnText}>{copy.institutions}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() =>
              navigateTo('studentInsightReport', {
                studentId: studentData?.id,
                language: i18n.language,
              })
            }
          >
            <FontAwesome name="file-text" size={16} color="#0b1223" />
            <Text style={styles.primaryBtnText}>{copy.fullReport}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigateTo('profile')}>
            <Text style={styles.secondaryBtnText}>{copy.back}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

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
  headerRtl: {
    flexDirection: 'row-reverse',
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
    lineHeight: 20,
  },
  content: {
    padding: 18,
    paddingTop: 8,
  },
  heroCard: {
    backgroundColor: '#111c31',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  heroTitle: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 18,
  },
  heroBody: {
    marginTop: 8,
    color: '#94a3b8',
    fontWeight: '700',
    lineHeight: 20,
  },
  heroScoreRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroScoreRowRtl: {
    flexDirection: 'row-reverse',
  },
  heroScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#86efac',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroScoreText: {
    color: '#0b1223',
    fontWeight: '900',
  },
  heroScoreLabel: {
    flex: 1,
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 15,
  },
  signalsCard: {
    marginTop: 14,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 16,
  },
  signalBlock: {
    marginTop: 14,
  },
  signalTitle: {
    color: '#e2e8f0',
    fontWeight: '900',
    fontSize: 13,
  },
  signalFallback: {
    marginTop: 8,
    color: '#94a3b8',
    fontWeight: '700',
  },
  chipsRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipsRowRtl: {
    flexDirection: 'row-reverse',
  },
  signalChip: {
    minWidth: '47%',
    backgroundColor: '#111c31',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
  },
  signalChipScore: {
    color: '#86efac',
    fontWeight: '900',
    fontSize: 18,
  },
  signalChipText: {
    marginTop: 6,
    color: '#e2e8f0',
    fontWeight: '800',
  },
  gameRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#111c31',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
  },
  gameRowRtl: {
    flexDirection: 'row-reverse',
  },
  gameLead: {
    flex: 1,
  },
  gameName: {
    color: '#f8fafc',
    fontWeight: '800',
  },
  gameHint: {
    marginTop: 4,
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 12,
  },
  gameScore: {
    color: '#38bdf8',
    fontWeight: '900',
    fontSize: 18,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(39,174,96,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#27ae60',
    fontWeight: '900',
  },
  cardTitleBlock: {
    flex: 1,
  },
  degreeName: {
    color: '#e2e8f0',
    fontWeight: '900',
    fontSize: 16,
  },
  score: {
    marginTop: 6,
    color: '#94a3b8',
    fontWeight: '800',
    fontSize: 13,
  },
  progressTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#1e293b',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#f5b301',
  },
  infoSection: {
    marginTop: 14,
  },
  infoTitle: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 13,
  },
  infoItem: {
    marginTop: 8,
    color: '#94a3b8',
    fontWeight: '700',
    lineHeight: 19,
  },
  cardActions: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cardActionsRtl: {
    flexDirection: 'row-reverse',
  },
  cardGhostBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGhostBtnText: {
    color: '#e2e8f0',
    fontWeight: '900',
  },
  cardSolidBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSolidBtnText: {
    color: '#fff',
    fontWeight: '900',
  },
  primaryBtn: {
    marginTop: 18,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#86efac',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtnText: {
    color: '#0b1223',
    fontWeight: '900',
  },
  secondaryBtn: {
    marginTop: 12,
    marginBottom: 20,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#111c31',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#e2e8f0',
    fontWeight: '900',
  },
  rtlText: {
    textAlign: 'right',
  },
});
