import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
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
  const requestIdRef = useRef(0);

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
        preliminaryDirections: 'כיוונים ראשוניים לפי משחקים',
        gameOnlyWarning: 'ההמלצות מבוססות כרגע על משחק אחד בלבד, ולכן רמת הביטחון נמוכה. כדי לקבל התאמה מדויקת יותר, מומלץ להשלים את המבחן המלא.',
        lowConfidence: 'ביטחון נמוך',
        completeFullAssessment: 'השלם את המבחן המלא',
        score: 'אחוז התאמה',
        why: 'למה זה מתאים לך',
        improve: 'מה לחזק',
        roadmap: 'המסלול הבא',
        profileSignals: 'אותות מהפרופיל',
        topStrengths: 'חוזקות מובילות',
        gameSignals: 'מהמשחקים',
        sudokuImpactTitle: 'השפעת משחק סודוקו',
        noSudokuSignals: 'עדיין אין נתוני סודוקו.',
        fullReport: 'לפתיחת הדוח המלא',
        details: 'פרטי מסלול',
        miniTask: 'משימת טעימה',
        institutions: 'מוסדות לימוד',
        confidence: 'רמת ביטחון',
        missingSteps: 'מה ישלים את הדיוק',
        preliminary: 'המלצות ראשוניות',
        back: 'חזרה לפרופיל',
        noGames: 'עדיין אין נתוני משחקים.',
        noStrengths: 'עדיין אין נתוני יכולות.',
        lowScoresHint: 'כל ההתאמות עדיין נמוכות. השלמת המבחן המקיף תשפר את הדיוק.',
        fitVeryHigh: 'התאמה גבוהה מאוד',
        fitHigh: 'התאמה גבוהה',
        fitGood: 'התאמה טובה',
        fitMedium: 'התאמה בינונית',
        fitWeak: 'התאמה חלשה',
      }
    : isArabic
      ? {
          title: 'التوصيات الأكاديمية',
          loading: 'جاري تحليل نتائجك...',
          empty: 'لا توجد توصيات بعد. من الأفضل إكمال الاختبارات والألعاب أولًا.',
          overview: 'أفضل 3 مسارات لك',
          overviewBody: 'هنا لا نعرض فقط نسبة التوافق، بل لماذا يناسبك المسار، ماذا تحتاج أن تطور، وما الخطوة التالية.',
          preliminaryDirections: 'اتجاهات أولية حسب الألعاب',
          gameOnlyWarning: 'التوصيات الحالية مبنية على لعبة واحدة فقط، لذلك مستوى الثقة منخفض. للحصول على نتائج أدق، يُفضّل إكمال الاختبار الشامل.',
          lowConfidence: 'ثقة منخفضة',
          completeFullAssessment: 'أكمل الاختبار الشامل',
          score: 'نسبة التوافق',
          why: 'لماذا يناسبك',
          improve: 'ما الذي تحتاج تطويره',
          roadmap: 'المسار التالي',
          profileSignals: 'إشارات من ملفك',
          topStrengths: 'أقوى نقاطك',
          gameSignals: 'من الألعاب',
          sudokuImpactTitle: 'تأثير لعبة السودوكو',
          noSudokuSignals: 'لا توجد بيانات سودوكو بعد.',
          fullReport: 'فتح التقرير الكامل',
          details: 'تفاصيل التخصص',
          miniTask: 'مهمة تجريبية',
          institutions: 'المؤسسات التعليمية',
          confidence: 'مستوى الثقة',
          missingSteps: 'خطوات لتحسين الدقة',
          preliminary: 'توصيات أولية',
          back: 'العودة للملف الشخصي',
          noGames: 'لا توجد بيانات ألعاب بعد.',
          noStrengths: 'لا توجد بيانات قدرات بعد.',
          lowScoresHint: 'كل نسب الملاءمة ما زالت منخفضة. أكمل الاختبار الشامل للحصول على توصيات أدق.',
          fitVeryHigh: 'ملاءمة عالية جداً',
          fitHigh: 'ملاءمة عالية',
          fitGood: 'ملاءمة جيدة',
          fitMedium: 'ملاءمة متوسطة',
          fitWeak: 'ملاءمة ضعيفة',
        }
      : {
          title: 'Academic Recommendations',
          loading: 'Analyzing your results...',
          empty: 'No recommendations yet. Complete the tests and games first.',
          overview: 'Your top 3 paths',
          overviewBody: 'This view shows more than a score: why the path fits, what to improve, and what to do next.',
          preliminaryDirections: 'Preliminary directions based on games',
          gameOnlyWarning: 'Current recommendations are based on one game only, so confidence is low. Complete the full assessment for more accurate matches.',
          lowConfidence: 'Low confidence',
          completeFullAssessment: 'Complete Full Assessment',
          score: 'Match score',
          why: 'Why it fits you',
          improve: 'What to improve',
          roadmap: 'Next roadmap',
          profileSignals: 'Profile signals',
          topStrengths: 'Top strengths',
          gameSignals: 'From games',
          sudokuImpactTitle: 'Sudoku game impact',
          noSudokuSignals: 'No Sudoku signals yet.',
          fullReport: 'Open full report',
          details: 'Major details',
          miniTask: 'Try a mini task',
          institutions: 'Institutions',
          confidence: 'Confidence',
          missingSteps: 'Improve accuracy',
          preliminary: 'Preliminary suggestions',
          back: 'Back to profile',
          noGames: 'No game data yet.',
          noStrengths: 'No ability data yet.',
          lowScoresHint: 'All match scores are still low. Complete the comprehensive assessment for better recommendations.',
          fitVeryHigh: 'Very high match',
          fitHigh: 'High match',
          fitGood: 'Good match',
          fitMedium: 'Medium match',
          fitWeak: 'Weak match',
        };

  const institutionCopy = isHebrew
    ? {
        matchingInstitutions: 'מוסדות מתאימים לתחום זה',
        noLinkedInstitutions: 'אין כרגע מוסדות מקושרים לתחום זה.',
        institutionType: 'סוג מוסד',
        degreeType: 'סוג תעודה',
        studyDuration: 'משך לימודים',
        admissionRequirements: 'תנאי קבלה',
        programWebsite: 'קישור למסלול',
        sameRegion: 'אותו אזור',
        closestToYou: 'הקרוב אליך',
      }
    : isArabic
      ? {
          matchingInstitutions: 'مؤسسات مناسبة لهذا التخصص',
          noLinkedInstitutions: 'لا توجد مؤسسات مرتبطة بهذا التخصص حالياً',
          institutionType: 'نوع المؤسسة',
          degreeType: 'نوع الشهادة',
          studyDuration: 'مدة الدراسة',
          admissionRequirements: 'شروط القبول',
          programWebsite: 'رابط البرنامج',
          sameRegion: 'نفس المنطقة',
          closestToYou: 'الأقرب إليك',
        }
      : {
          matchingInstitutions: 'Matching institutions for this field',
          noLinkedInstitutions: 'No institutions are linked to this field yet.',
          institutionType: 'Institution type',
          degreeType: 'Degree type',
          studyDuration: 'Study duration',
          admissionRequirements: 'Admission requirements',
          programWebsite: 'Program website',
          sameRegion: 'Same region',
          closestToYou: 'Closest to you',
        };

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      if (!studentData?.id) {
        setLoading(false);
        return;
      }

      const requestId = ++requestIdRef.current;

      try {
        setLoading(true);
        setError(null);

        const result = await getStudentJourneySnapshot(studentData.id, {
          language: i18n.language,
        });

        if (cancelled || requestId !== requestIdRef.current) return;

        if (!result?.success) {
          setError(result?.error || 'Failed to load recommendations');
          return;
        }

        setSnapshot(result.data || null);
      } catch (loadError) {
        if (!cancelled && requestId === requestIdRef.current) {
          setError(loadError?.message || 'Unexpected error');
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
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
  const gameCareerSignals = snapshot?.gameCareerSignals || { skills: [], topics: [], degrees: [], explanations: [], sudokuSkills: [] };
  const sudokuSkills =
    gameCareerSignals.sudokuSkills?.length > 0
      ? gameCareerSignals.sudokuSkills
      : (gameCareerSignals.skills || []).filter((skill) => skill.game_key === 'sudoku').slice(0, 3);
  const isGameOnlyPreliminary = recommendations.some((recommendation) => recommendation.is_game_only_preliminary);
  const hasLowConfidence = recommendations.some((recommendation) => Number(recommendation.confidence_score || 0) < 40);

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
            <Text style={[styles.heroTitle, isRtl && styles.rtlText]}>
              {isGameOnlyPreliminary ? copy.preliminaryDirections : copy.overview}
            </Text>
            <Text style={[styles.heroBody, isRtl && styles.rtlText]}>
              {isGameOnlyPreliminary ? copy.gameOnlyWarning : copy.overviewBody}
            </Text>

            {hasLowConfidence ? (
              <View style={[styles.warningActions, isRtl && styles.chipsRowRtl]}>
                <Text style={styles.lowConfidenceChip}>{copy.lowConfidence}</Text>
                <TouchableOpacity style={styles.assessmentCta} onPress={() => navigateTo('adaptiveTest')}>
                  <Text style={styles.assessmentCtaText}>{copy.completeFullAssessment}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

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

          {recommendations.every((recommendation) => Number(recommendation.scorePercent || recommendation.match_percentage || 0) < 55) ? (
            <View style={styles.lowScoresNotice}>
              <Text style={[styles.lowScoresText, isRtl && styles.rtlText]}>{copy.lowScoresHint}</Text>
            </View>
          ) : null}

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

            {sudokuSkills.length > 0 ? (
              <View style={styles.signalBlock}>
                <Text style={[styles.signalTitle, isRtl && styles.rtlText]}>{copy.sudokuImpactTitle}</Text>
                <View style={[styles.chipsRow, isRtl && styles.chipsRowRtl]}>
                  {sudokuSkills.slice(0, 3).map((skill) => (
                    <View key={skill.key || `${skill.game_key}:${skill.skill_tag}`} style={styles.signalChip}>
                      <Text style={styles.signalChipScore}>{skill.score}%</Text>
                      <Text style={[styles.signalChipText, isRtl && styles.rtlText]}>{skill.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.signalBlock}>
              <Text style={[styles.signalTitle, isRtl && styles.rtlText]}>{copy.gameSignals}</Text>
              {gameHighlights.length === 0 && !gameCareerSignals.skills?.length ? (
                <Text style={[styles.signalFallback, isRtl && styles.rtlText]}>{copy.noGames}</Text>
              ) : (
                <>
                  {gameCareerSignals.skills?.length ? (
                    <View style={[styles.chipsRow, isRtl && styles.chipsRowRtl]}>
                      {gameCareerSignals.skills.slice(0, 4).map((skill) => (
                        <View key={skill.key || `${skill.game_key || 'game'}:${skill.skill_tag}`} style={styles.signalChip}>
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

                  {gameCareerSignals.explanations?.slice(0, 2).map((item, index) => (
                    <Text key={`${item.game_key || item.topic_key || 'game'}-${index}`} style={[styles.gameHint, isRtl && styles.rtlText]}>
                      {isHebrew
                        ? item.reason_he
                        : isArabic
                          ? item.reason_ar
                          : item.reason_en}
                    </Text>
                  ))}

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
                  <Text style={[styles.fitLabel, isRtl && styles.rtlText]}>
                    {fitLabel(recommendation.scorePercent, copy)}
                  </Text>
                  <View style={[styles.confidenceRow, isRtl && styles.chipsRowRtl]}>
                    <Text style={[styles.confidenceBadge, styles[`confidence_${recommendation.confidence_level || 'low'}`]]}>
                      {copy.confidence}: {recommendation.confidence_score ?? 0}%
                    </Text>
                    {recommendation.is_preliminary ? (
                      <Text style={styles.preliminaryBadge}>{copy.preliminary}</Text>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${recommendation.scorePercent}%` }]} />
              </View>

              <View style={styles.infoSection}>
                <Text style={[styles.infoTitle, isRtl && styles.rtlText]}>{copy.why}</Text>
                {!!recommendation.explanation && (
                  <Text style={[styles.infoItem, isRtl && styles.rtlText]}>
                    {recommendation.explanation}
                  </Text>
                )}
                {(recommendation.top_reasons || []).map((reason, reasonIndex) => (
                  <Text key={`${recommendation.degree_id}-top-reason-${reasonIndex}`} style={[styles.infoItem, isRtl && styles.rtlText]}>
                    • {reason}
                  </Text>
                ))}
                {(recommendation.reasons || []).map((reason, reasonIndex) => (
                  <Text key={`${recommendation.degree_id}-reason-${reasonIndex}`} style={[styles.infoItem, isRtl && styles.rtlText]}>
                    • {reason}
                  </Text>
                ))}
              </View>

              <View style={styles.infoSection}>
                <Text style={[styles.infoTitle, isRtl && styles.rtlText]}>{copy.missingSteps}</Text>
                <Text style={[styles.infoItem, isRtl && styles.rtlText]}>
                  {localizeCopy(recommendation.confidence_reason, i18n.language)}
                </Text>
                {(recommendation.missing_steps || []).slice(0, 3).map((step) => (
                  <Text key={`${recommendation.degree_id}-missing-${step.key}`} style={[styles.infoItem, isRtl && styles.rtlText]}>
                    • {localizeCopy(step.label, i18n.language)}
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

              <View style={styles.infoSection}>
                <Text style={[styles.infoTitle, isRtl && styles.rtlText]}>{institutionCopy.matchingInstitutions}</Text>
                {(recommendation.institutions || []).length === 0 ? (
                  <Text style={[styles.infoItem, isRtl && styles.rtlText]}>{institutionCopy.noLinkedInstitutions}</Text>
                ) : (
                  (recommendation.institutions || []).slice(0, 4).map((program) => (
                    <InstitutionProgramCard
                      key={program.id || `${program.institution_id}-${program.major_key}-${program.program_name_en}`}
                      program={program}
                      copy={institutionCopy}
                      language={i18n.language}
                      isRtl={isRtl}
                      navigateTo={navigateTo}
                      majorName={recommendation.name}
                    />
                  ))
                )}
              </View>

              <View style={[styles.cardActions, isRtl && styles.cardActionsRtl]}>
                <TouchableOpacity
                  style={styles.cardGhostBtn}
                  onPress={() =>
                    navigateTo('majorDetails', {
                      majorId: recommendation.degree_id || recommendation.major_id,
                      majorKey: recommendation.major_key || recommendation.code,
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
                      majorId: recommendation.degree_id || recommendation.major_id,
                      majorKey: recommendation.major_key || recommendation.code,
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
                      majorId: recommendation.degree_id || recommendation.major_id,
                      majorKey: recommendation.major_key || recommendation.code,
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

function pickLocalized(record, field, language) {
  const lang = String(language || '').toLowerCase().startsWith('he')
    ? 'he'
    : String(language || '').toLowerCase().startsWith('ar')
      ? 'ar'
      : 'en';
  return record?.[`${field}_${lang}`] || record?.[`${field}_en`] || record?.[`${field}_ar`] || record?.[`${field}_he`] || '';
}

function localizeCopy(copy, language) {
  if (typeof copy === 'string') return copy;
  const lang = String(language || '').toLowerCase().startsWith('he')
    ? 'he'
    : String(language || '').toLowerCase().startsWith('ar')
      ? 'ar'
      : 'en';
  return copy?.[lang] || copy?.en || copy?.ar || copy?.he || '';
}

function fitLabel(score, copy) {
  const value = Number(score) || 0;
  if (value >= 80) return copy.fitVeryHigh;
  if (value >= 70) return copy.fitHigh;
  if (value >= 60) return copy.fitGood;
  if (value >= 45) return copy.fitMedium;
  return copy.fitWeak;
}

function InstitutionProgramCard({ program, copy, language, isRtl, navigateTo, majorName }) {
  const institution = program.institution || {};
  const institutionName = pickLocalized(institution, 'name', language) || institution.name || '-';
  const city = pickLocalized(institution, 'city', language) || institution.city || '';
  const programName = pickLocalized(program, 'program_name', language) || program.program_name_en || majorName;
  const admission = pickLocalized(program, 'admission_requirements', language);
  const type = institution.type || institution.institution_type || 'other';
  const url = program.program_url || institution.website_url || institution.website;

  return (
    <View style={styles.programCard}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigateTo?.('institutionDetails', {
          institutionId: program.institution_id || institution.id,
          institutionName,
          majorId: program.major_id || program.major_key,
          majorName,
        })}
      >
        <View style={[styles.programHeader, isRtl && styles.programHeaderRtl]}>
          <View style={styles.programLead}>
            <Text style={[styles.programInstitution, isRtl && styles.rtlText]}>{institutionName}</Text>
            <Text style={[styles.programMeta, isRtl && styles.rtlText]}>
              {[city || institution.region, type, programName].filter(Boolean).join(' • ')}
            </Text>
          </View>
          {program.distance_km ? (
            <Text style={styles.distanceBadge}>{`${program.distance_km} km`}</Text>
          ) : program.same_region ? (
            <Text style={styles.distanceBadge}>{copy.sameRegion}</Text>
          ) : null}
        </View>

        <View style={styles.programFacts}>
          <Fact label={copy.degreeType} value={program.degree_type} isRtl={isRtl} />
          <Fact label={copy.studyDuration} value={program.study_duration} isRtl={isRtl} />
          <Fact label={copy.admissionRequirements} value={admission} isRtl={isRtl} />
        </View>
      </TouchableOpacity>

      {!!url && (
        <TouchableOpacity style={styles.programLinkBtn} onPress={() => Linking.openURL(url)}>
          <Text style={styles.programLinkText}>{copy.programWebsite}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Fact({ label, value, isRtl }) {
  if (!value) return null;
  return (
    <Text style={[styles.programFact, isRtl && styles.rtlText]}>
      {label}: {value}
    </Text>
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
    fontSize: 17,
  },
  warningActions: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  lowConfidenceChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fecaca',
    color: '#7f1d1d',
    fontWeight: '900',
  },
  assessmentCta: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#dbeafe',
  },
  assessmentCtaText: {
    color: '#1d4ed8',
    fontWeight: '900',
  },
  lowScoresNotice: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#451a03',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  lowScoresText: {
    color: '#fed7aa',
    fontWeight: '800',
    lineHeight: 20,
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
    fontSize: 16,
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
    fontSize: 17,
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
    fontSize: 16,
  },
  fitLabel: {
    marginTop: 4,
    color: '#86efac',
    fontWeight: '900',
    fontSize: 17,
  },
  confidenceRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
    color: '#0b1223',
    backgroundColor: '#fde68a',
    fontWeight: '900',
    fontSize: 16,
  },
  confidence_low: { backgroundColor: '#fecaca' },
  confidence_medium: { backgroundColor: '#fde68a' },
  confidence_high: { backgroundColor: '#bbf7d0' },
  preliminaryBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
    color: '#e2e8f0',
    backgroundColor: '#334155',
    fontWeight: '900',
    fontSize: 16,
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
    fontSize: 16,
  },
  infoItem: {
    marginTop: 8,
    color: '#94a3b8',
    fontWeight: '700',
    lineHeight: 19,
  },
  programCard: {
    marginTop: 10,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#111c31',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.13)',
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  programHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  programLead: {
    flex: 1,
  },
  programInstitution: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 16,
  },
  programMeta: {
    marginTop: 5,
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 18,
  },
  distanceBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(134,239,172,0.12)',
    color: '#86efac',
    fontWeight: '900',
    fontSize: 16,
    overflow: 'hidden',
  },
  programFacts: {
    marginTop: 8,
    gap: 4,
  },
  programFact: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 18,
  },
  programLinkBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(56,189,248,0.12)',
  },
  programLinkText: {
    color: '#7dd3fc',
    fontWeight: '900',
    fontSize: 17,
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
