import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { buildStudentProfileSummary } from '../../services/studentProfileSummaryService';

const colors = {
  bg: '#F7FBF9',
  card: '#FFFFFF',
  text: '#12312B',
  muted: '#667085',
  green: '#16A34A',
  greenDark: '#047857',
  blue: '#2563EB',
  softGreen: '#DCFCE7',
  softBlue: '#EAF2FF',
  border: '#D9EEE4',
  warning: '#F59E0B',
};

function pct(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

const profileCopy = {
  ar: {
    studentFallback: 'الطالب',
    grade: 'الصف',
    section: 'الشعبة',
    loadErrorTitle: 'تعذر تحميل البروفايل',
    loadErrorMessage: 'حدث خطأ غير متوقع.',
    deleteTitle: 'حذف الحساب؟',
    deleteMessage: 'سيتم حذف بيانات حسابك من النظام.',
    cancel: 'إلغاء',
    delete: 'حذف',
    deleteError: 'تعذر الحذف',
    loading: 'جاري بناء بروفايلك الشخصي...',
    noProfileTitle: 'لا يوجد بروفايل طالب جاهز',
    noProfileText: 'أكمل بيانات الطالب أولاً حتى تظهر لوحة البروفايل.',
    examPower: 'قوة الامتحان',
    interests: 'ميولك',
    gameSignals: 'إشارات الألعاب',
    editProfile: 'تعديل بياناتي',
    logout: 'تسجيل الخروج',
    deleteAccount: 'حذف الحساب',
    profileTitle: 'بروفايل الطالب',
    headerTitle: (name) => `أهلاً ${name}، هذا ملخص رحلتك التعليمية`,
    headerSubtitle: 'هنا ترى صورتك التعليمية بناءً على الامتحان، الشخصية، الاهتمامات، والألعاب.',
    completion: (value) => `اكتملت ${value}% من بياناتك`,
    completionHint: 'كلما أنهيت اختباراً أو لعبة، تصبح التوصية أدق.',
    bestPath: 'أفضل مسار لك حالياً',
    noRecommendation: 'لا توجد توصية جاهزة بعد. أكمل الاختبار الشامل أولاً.',
    match: 'ملاءمة',
    whyPath: 'لماذا هذا المسار؟',
    breakdownTitle: 'كيف وصلنا لهذه النتيجة؟',
    breakdownHint: 'الامتحان هو الأساس. الألعاب تضيف إشارة داعمة فقط ولا تحدد مستقبلك وحدها.',
    abilitiesFromExam: 'القدرات من الامتحان',
    personality: 'الشخصية',
    bonus: (value) => `إشارات الألعاب: ${value > 0 ? `+${value}` : value} نقاط داعمة فقط`,
    strengths: 'نقاط قوتك',
    strengthsEmpty: 'ستظهر نقاط قوتك بعد إكمال الاختبار الشامل أو بعض الألعاب.',
    improvements: 'مجالات يمكن تقويتها',
    improvementsEmpty: 'لا توجد ملاحظات تطوير واضحة الآن. استمر، بروفايلك يتحسن مع كل محاولة.',
    gameHint: 'الألعاب لا تحدد مستقبلك وحدها، لكنها تساعدنا نفهم طريقة تفكيرك بشكل عملي.',
    gameEmpty: 'لم تلعب ألعاباً كافية بعد. جرّب الألعاب للحصول على توصية أذكى.',
    topFields: 'أفضل المسارات المقترحة',
    majorDetails: 'تفاصيل التخصص',
    nearbyUniversities: 'جامعات قريبة',
    shortTask: 'جرّب مهمة قصيرة',
    suitableWith: (subject) => `مناسب بسبب قوة ${subject} وإشارة داعمة من الألعاب.`,
    suitableExam: (subject) => `مناسب بسبب قوة ${subject} في الامتحان.`,
    gameSupportOnly: 'الألعاب أعطت إشارة داعمة، لكنها ليست المصدر الأساسي للتوصية.',
    generalReason: 'مناسب حسب نتائج الامتحان والشخصية والاهتمامات المتاحة.',
    learningPotential: 'إمكانات التعلم',
    learningFallback: 'إمكانات التعلم تظهر كلما زادت محاولاتك وتجاربك.',
    persistence: 'المثابرة',
    improvement: 'التحسن',
    focus: 'التركيز',
    speedStability: 'ثبات السرعة',
    nextSteps: 'خطواتك التالية',
    improveAccuracy: 'لزيادة دقة التوصية',
    fullAssessment: 'الاختبار الشامل',
    personalityTest: 'اختبار الشخصية',
    games: 'الألعاب',
    miniTasks: 'المهام القصيرة',
  },
  he: {
    studentFallback: 'התלמיד',
    grade: 'כיתה',
    section: 'קבוצה',
    loadErrorTitle: 'טעינת הפרופיל נכשלה',
    loadErrorMessage: 'אירעה שגיאה לא צפויה.',
    deleteTitle: 'למחוק חשבון?',
    deleteMessage: 'נתוני החשבון שלך יימחקו מהמערכת.',
    cancel: 'ביטול',
    delete: 'מחיקה',
    deleteError: 'המחיקה נכשלה',
    loading: 'בונה את הפרופיל האישי שלך...',
    noProfileTitle: 'אין עדיין פרופיל תלמיד מוכן',
    noProfileText: 'השלם קודם את פרטי התלמיד כדי להציג את לוח הפרופיל.',
    examPower: 'חוזק המבחן',
    interests: 'תחומי העניין שלך',
    gameSignals: 'אותות משחקים',
    editProfile: 'עריכת הפרטים שלי',
    logout: 'יציאה',
    deleteAccount: 'מחיקת חשבון',
    profileTitle: 'פרופיל תלמיד',
    headerTitle: (name) => `שלום ${name}, זה סיכום המסע הלימודי שלך`,
    headerSubtitle: 'כאן מוצגת התמונה הלימודית שלך לפי המבחן, האישיות, תחומי העניין והמשחקים.',
    completion: (value) => `${value}% מהנתונים שלך הושלמו`,
    completionHint: 'ככל שתסיים מבחן או משחק, ההמלצה תהיה מדויקת יותר.',
    bestPath: 'המסלול המתאים ביותר כרגע',
    noRecommendation: 'אין עדיין המלצה מוכנה. השלם קודם את המבחן המקיף.',
    match: 'התאמה',
    whyPath: 'למה המסלול הזה?',
    breakdownTitle: 'איך הגענו לתוצאה הזאת?',
    breakdownHint: 'המבחן הוא הבסיס. המשחקים מוסיפים אות תומך בלבד ולא קובעים לבד את העתיד שלך.',
    abilitiesFromExam: 'יכולות מהמבחן',
    personality: 'אישיות',
    bonus: (value) => `אותות משחקים: ${value > 0 ? `+${value}` : value} נקודות תמיכה בלבד`,
    strengths: 'נקודות החוזק שלך',
    strengthsEmpty: 'נקודות החוזק יופיעו אחרי השלמת המבחן המקיף או כמה משחקים.',
    improvements: 'תחומים שאפשר לחזק',
    improvementsEmpty: 'אין כרגע הערות שיפור ברורות. המשך להתקדם, הפרופיל משתפר מכל ניסיון.',
    gameHint: 'המשחקים לא קובעים לבד את העתיד שלך, אבל הם עוזרים להבין את דרך החשיבה שלך בצורה מעשית.',
    gameEmpty: 'עדיין אין מספיק נתוני משחקים. נסה משחקים כדי לקבל המלצה חכמה יותר.',
    topFields: 'המסלולים המומלצים ביותר',
    majorDetails: 'פרטי תחום',
    nearbyUniversities: 'אוניברסיטאות קרובות',
    shortTask: 'נסה משימה קצרה',
    suitableWith: (subject) => `מתאים בגלל חוזק ב${subject} ואות תומך מהמשחקים.`,
    suitableExam: (subject) => `מתאים בגלל חוזק ב${subject} במבחן.`,
    gameSupportOnly: 'המשחקים נתנו אות תומך, אך הם לא המקור המרכזי להמלצה.',
    generalReason: 'מתאים לפי תוצאות המבחן, האישיות ותחומי העניין הזמינים.',
    learningPotential: 'פוטנציאל למידה',
    learningFallback: 'פוטנציאל הלמידה מתבהר ככל שיש יותר ניסיונות והתנסויות.',
    persistence: 'התמדה',
    improvement: 'שיפור',
    focus: 'מיקוד',
    speedStability: 'יציבות מהירות',
    nextSteps: 'הצעדים הבאים שלך',
    improveAccuracy: 'כדי לשפר את דיוק ההמלצה',
    fullAssessment: 'המבחן המקיף',
    personalityTest: 'מבחן אישיות',
    games: 'משחקים',
    miniTasks: 'משימות קצרות',
  },
};

function localizeConfidence(confidence, copy, language) {
  if (!confidence) {
    return {
      label: language === 'he' ? 'אמון נמוך' : 'ثقة منخفضة',
      message: language === 'he' ? 'צריך עוד נתונים לפני בניית המלצה חזקה.' : 'نحتاج بيانات أكثر قبل بناء توصية قوية.',
    };
  }
  if (language !== 'he') return confidence;
  const labels = {
    high: 'אמון גבוה',
    medium: 'אמון בינוני',
    low: 'אמון נמוך',
  };
  const messages = {
    high: 'המבחן, האישיות ואותות המשחקים נתנו תמונה עקבית.',
    medium: 'המבחן נתן תמונה טובה, והשלמת האישיות או המשחקים תשפר את הדיוק.',
    low: 'צריך עוד נתונים לפני בניית המלצה חזקה.',
  };
  return {
    ...confidence,
    label: labels[confidence.level] || confidence.label,
    message: messages[confidence.level] || confidence.message,
  };
}

export default function StudentProfileScreen({ navigateTo }) {
  const { user, studentData, signOut, deleteAccount } = useAuth();
  const { i18n } = useTranslation();
  const language = String(i18n.language || '').toLowerCase().startsWith('he') ? 'he' : 'ar';
  const copy = profileCopy[language];
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const studentId = studentData?.id;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!studentId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await buildStudentProfileSummary(studentId, { language });
        if (!cancelled) setSummary(data);
      } catch (error) {
        if (!cancelled) {
          Alert.alert(copy.loadErrorTitle, error.message || copy.loadErrorMessage);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [studentId, language]);

  const student = summary?.student || studentData || {};
  const displayName = student.display_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || copy.studentFallback;
  const best = summary?.bestRecommendation || null;
  const completion = pct(summary?.profileCompletion);
  const confidence = localizeConfidence(summary?.confidenceLevel, copy, language);

  const classLabel = useMemo(() => {
    const grade = student.grade ? `${copy.grade} ${student.grade}` : '';
    const section = student.class_section ? `${copy.section} ${student.class_section}` : '';
    return [grade, section].filter(Boolean).join(' | ');
  }, [copy.grade, copy.section, student.grade, student.class_section]);

  const handleDelete = () => {
    Alert.alert(copy.deleteTitle, copy.deleteMessage, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.delete,
        style: 'destructive',
        onPress: () => deleteAccount?.().catch((error) => Alert.alert(copy.deleteError, error.message)),
      },
    ]);
  };

  function go(route, params = {}) {
    navigateTo?.(route, params);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.loadingText}>{copy.loading}</Text>
      </View>
    );
  }

  if (!studentId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>{copy.noProfileTitle}</Text>
        <Text style={styles.emptyText}>{copy.noProfileText}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <HeaderCard
        name={displayName}
        school={student.school_name}
        classLabel={classLabel}
        completion={completion}
        bestName={best?.name}
        copy={copy}
      />

      <BestMatchCard best={best} confidence={confidence} explanation={localizedExplanation(summary?.explanation, language)} copy={copy} />

      <BreakdownCard summary={summary} copy={copy} />

      <View style={styles.threeGrid}>
        <MiniStat title={copy.examPower} value={`${summary?.abilityHighlights?.[0]?.score || 0}%`} icon="analytics-outline" tone="blue" />
        <MiniStat title={copy.interests} value={`${summary?.interestHighlights?.[0]?.score || 0}%`} icon="heart-outline" tone="green" />
        <MiniStat title={copy.gameSignals} value={`${summary?.gameHighlights?.skills?.length || 0}`} icon="game-controller-outline" tone="blue" />
      </View>

      <StrengthsCard strengths={summary?.strengths || []} copy={copy} language={language} />
      <ImprovementCard improvements={summary?.improvements || []} copy={copy} language={language} />
      <GameSignalsCard signals={summary?.gameHighlights || {}} copy={copy} language={language} />
      <TopFieldsCard fields={summary?.topFields || []} onNavigate={go} copy={copy} language={language} />
      <LearningPotentialCard data={summary?.learningPotential} copy={copy} language={language} />
      <NextStepsCard steps={summary?.nextSteps || []} onNavigate={go} studentId={studentId} best={best} language={language} copy={copy} />
      <DataQualityCard quality={summary?.dataQuality} copy={copy} language={language} />

      <View style={styles.accountActions}>
        <TouchableOpacity style={styles.lightButton} onPress={() => go('editProfile')}>
          <Ionicons name="create-outline" size={18} color={colors.greenDark} />
          <Text style={styles.lightButtonText}>{copy.editProfile}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.lightButton} onPress={() => signOut?.()}>
          <Ionicons name="log-out-outline" size={18} color="#B42318" />
          <Text style={[styles.lightButtonText, { color: '#B42318' }]}>{copy.logout}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dangerGhost} onPress={handleDelete}>
          <Text style={styles.dangerGhostText}>{copy.deleteAccount}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function localizedExplanation(explanation, language) {
  if (!explanation) return '';
  if (typeof explanation === 'string') {
    if (language === 'he') {
      return 'ההמלצה מבוססת על המבחן, האישיות ותחומי העניין. המשחקים מוסיפים אות תומך בלבד ואינם מחליפים את תוצאות המבחן.';
    }
    return explanation;
  }
  if (language === 'he') return explanation.he || explanation.text_he || explanation.ar || explanation.text_ar || '';
  return explanation.ar || explanation.text_ar || explanation.he || explanation.text_he || '';
}

function localizedName(item, language) {
  if (!item) return '';
  if (language === 'he') {
    return item.name_he || item.subject_name_he || item.label_he || item.name || item.name_ar || item.subject_name_ar || item.label || '';
  }
  return item.name_ar || item.subject_name_ar || item.label_ar || item.name || item.name_he || item.subject_name_he || item.label || '';
}

function localizedStrength(item, language) {
  if (language !== 'he') return item;
  const sourceMap = {
    exam: 'מהמבחן',
    game: 'מהמשחקים',
    both: 'מהמבחן ומהמשחקים',
  };
  return {
    ...item,
    label: localizedName(item, language) || item.label,
    source: sourceMap[item.sourceType] || sourceMap[item.source] || item.source || '',
  };
}

function localizedImprovement(item, language) {
  if (language !== 'he') return item;
  if (item.icon === 'person-outline' || item.key === 'personality') {
    return {
      ...item,
      title: 'מבחן האישיות עדיין לא הושלם',
      hint: 'השלמתו תעזור לנו להבין טוב יותר את דרך החשיבה שלך.',
    };
  }
  if (item.icon === 'game-controller-outline' || item.key === 'games') {
    return {
      ...item,
      title: 'אפשר להוסיף עוד אותות משחקים',
      hint: 'משחק אחד או שניים נוספים ישפרו את דיוק הפרופיל.',
    };
  }
  return {
    ...item,
    title: item.title_he || 'תחום שאפשר לחזק',
    hint: item.hint_he || 'תרגול קצר וניסיון נוסף יכולים לשפר את התוצאה.',
  };
}

function nextStepTitle(step, language) {
  if (language !== 'he') return step.title;
  const titles = {
    report: 'פתח את הדוח המלא',
    recommendations: 'ראה את כל ההמלצות',
    miniTasks: 'נסה משימה קצרה',
    games: 'שחק משחק חדש',
    universities: 'ראה אוניברסיטאות קרובות',
    personality: 'השלם מבחן אישיות',
    moreGames: 'שחק עוד שני משחקים',
  };
  return titles[step.key] || step.title_he || step.title;
}

function localizedMissingItems(items, language) {
  if (language !== 'he') return items;
  return items.map((item) => {
    const text = String(item);
    if (text.includes('الشامل')) return 'השלם את המבחן המקיף';
    if (text.includes('الشخصية')) return 'השלם את מבחן האישיות';
    if (text.includes('لعبة') || text.includes('الألعاب')) return 'שחק משחק אחד או שניים כדי לשפר את דיוק הפרופיל';
    return item;
  });
}

function HeaderCard({ name, school, classLabel, completion, bestName, copy }) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerIcon}>
        <Ionicons name="school-outline" size={30} color="#fff" />
      </View>
      <Text style={styles.kicker}>{copy.profileTitle}</Text>
      <Text style={styles.headerTitle}>{copy.headerTitle(name)}</Text>
      <Text style={styles.headerSubtitle}>{copy.headerSubtitle}</Text>

      <View style={styles.metaWrap}>
        {!!school && <MetaChip icon="business-outline" text={school} />}
        {!!classLabel && <MetaChip icon="people-outline" text={classLabel} />}
        {!!bestName && <MetaChip icon="trophy-outline" text={bestName} />}
      </View>

      <View style={styles.completionBox}>
        <View style={styles.completionTop}>
          <Text style={styles.completionText}>{copy.completion(completion)}</Text>
          <Text style={styles.completionHint}>{copy.completionHint}</Text>
        </View>
        <Progress value={completion} color="#fff" track="rgba(255,255,255,0.28)" />
      </View>
    </View>
  );
}

function BestMatchCard({ best, confidence, explanation, copy }) {
  if (!best) {
    return (
      <Card icon="trophy-outline" title={copy.bestPath}>
        <Text style={styles.emptyText}>{copy.noRecommendation}</Text>
      </Card>
    );
  }

  return (
    <Card icon="trophy-outline" title={copy.bestPath} accent>
      <Text style={styles.bestName}>{best.name}</Text>
      <View style={styles.matchRow}>
        <View style={styles.matchCircle}>
          <Text style={styles.matchNumber}>{pct(best.score_percent)}%</Text>
          <Text style={styles.matchLabel}>{copy.match}</Text>
        </View>
        <View style={styles.matchTextBlock}>
          <Text style={styles.reasonTitle}>{copy.whyPath}</Text>
          <Text style={styles.reasonText}>{explanation}</Text>
          <View style={styles.confidencePill}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.greenDark} />
            <Text style={styles.confidenceText}>{confidence.label}</Text>
          </View>
          <Text style={styles.confidenceHint}>{confidence.message}</Text>
        </View>
      </View>
    </Card>
  );
}

function BreakdownCard({ summary, copy }) {
  const best = summary?.bestRecommendation;
  const ability = pct((best?.breakdown?.ability?.score || 0) * 100);
  const personality = pct((best?.breakdown?.personality?.score || 0) * 100);
  const interest = pct((best?.breakdown?.interest?.score || 0) * 100);
  const gameBonus = Number(best?.game_signal_bonus || 0);

  return (
    <Card icon="stats-chart-outline" title={copy.breakdownTitle}>
      <Text style={styles.cardHint}>{copy.breakdownHint}</Text>
      <SignalBar label={copy.abilitiesFromExam} weight="40%" value={ability} color={colors.blue} />
      <SignalBar label={copy.personality} weight="40%" value={personality} color={colors.green} />
      <SignalBar label={copy.interests} weight="20%" value={interest} color="#0EA5E9" />
      <View style={styles.bonusRow}>
        <Ionicons name="game-controller-outline" size={18} color={colors.greenDark} />
        <Text style={styles.bonusText}>{copy.bonus(gameBonus)}</Text>
      </View>
    </Card>
  );
}

function StrengthsCard({ strengths, copy, language }) {
  return (
    <Card icon="bulb-outline" title={copy.strengths}>
      {!strengths.length ? (
        <Text style={styles.emptyText}>{copy.strengthsEmpty}</Text>
      ) : (
        <View style={styles.chipList}>
          {strengths.map((rawItem) => {
            const item = localizedStrength(rawItem, language);
            return (
            <View key={`${item.label}-${item.source}`} style={styles.strengthChip}>
              <Text style={styles.strengthText}>{item.label}</Text>
              <Text style={styles.sourceText}>{item.source}</Text>
            </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

function ImprovementCard({ improvements, copy, language }) {
  return (
    <Card icon="trending-up-outline" title={copy.improvements}>
      {!improvements.length ? (
        <Text style={styles.emptyText}>{copy.improvementsEmpty}</Text>
      ) : (
        improvements.map((rawItem, index) => {
          const item = localizedImprovement(rawItem, language);
          return (
          <View key={`${item.title}-${rawItem.title || ''}-${index}`} style={styles.improvementRow}>
            <View style={styles.smallIcon}>
              <Ionicons name={item.icon || 'sparkles-outline'} size={17} color={colors.greenDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.improvementTitle}>{item.title}</Text>
              <Text style={styles.improvementHint}>{item.hint}</Text>
            </View>
          </View>
          );
        })
      )}
    </Card>
  );
}

function GameSignalsCard({ signals, copy, language }) {
  const hasSignals = signals?.skills?.length || signals?.topics?.length || signals?.degrees?.length;
  return (
    <Card icon="game-controller-outline" title={copy.gameSignals}>
      <Text style={styles.cardHint}>{copy.gameHint}</Text>
      {!hasSignals ? (
        <Text style={styles.emptyText}>{copy.gameEmpty}</Text>
      ) : (
        <>
          <View style={styles.chipList}>
            {(signals.skills || []).slice(0, 4).map((skill) => (
              <View key={skill.skill_tag} style={styles.gameSkillChip}>
                <Text style={styles.strengthText}>{skill.label}</Text>
                <Text style={styles.sourceText}>{skill.score}%</Text>
              </View>
            ))}
          </View>
          {(signals.explanations || []).slice(0, 2).map((item, index) => (
            <Text key={`${item.topic_key}-${index}`} style={styles.gameReason}>
              {language === 'he' ? item.reason_he || item.reason_en || item.reason_ar : item.reason_ar || item.reason_he || item.reason_en}
            </Text>
          ))}
        </>
      )}
    </Card>
  );
}

function TopFieldsCard({ fields, onNavigate, copy, language }) {
  return (
    <Card icon="compass-outline" title={copy.topFields}>
      {!fields.length ? (
        <Text style={styles.emptyText}>{copy.noRecommendation}</Text>
      ) : (
        fields.slice(0, 5).map((field, index) => (
          <View key={field.degree_id || field.name} style={styles.fieldCard}>
            <View style={styles.fieldTop}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldName}>{field.name}</Text>
                <Text style={styles.fieldReason}>{buildFieldReason(field, copy, language)}</Text>
              </View>
              <Text style={styles.fieldScore}>{pct(field.score_percent)}%</Text>
            </View>
            <View style={styles.fieldActions}>
              <SmallButton text={copy.majorDetails} onPress={() => onNavigate('majorDetails', { majorName: field.name })} />
              <SmallButton text={copy.nearbyUniversities} onPress={() => onNavigate('universitiesAndColleges', { majorName: field.name })} />
              <SmallButton text={copy.shortTask} onPress={() => onNavigate('miniTasks', { majorName: field.name })} />
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

function buildFieldReason(field, copy, language) {
  const abilitySubject = field.breakdown?.ability?.top_subjects?.[0];
  const gameBonus = Number(field.game_signal_bonus || 0);
  const subjectName = localizedName(abilitySubject, language);
  if (subjectName && gameBonus > 0) {
    return copy.suitableWith(subjectName);
  }
  if (subjectName) return copy.suitableExam(subjectName);
  if (gameBonus > 0) return copy.gameSupportOnly;
  return copy.generalReason;
}

function LearningPotentialCard({ data, copy, language }) {
  const message = language === 'he' ? copy.learningFallback : data?.message || copy.learningFallback;
  return (
    <Card icon="leaf-outline" title={copy.learningPotential}>
      <Text style={styles.cardHint}>{message}</Text>
      <SignalBar label={copy.persistence} value={pct(data?.persistence)} color={colors.green} />
      <SignalBar label={copy.improvement} value={pct(data?.improvement)} color={colors.blue} />
      <SignalBar label={copy.focus} value={pct(data?.focus)} color="#0EA5E9" />
      <SignalBar label={copy.speedStability} value={pct(data?.speedStability)} color="#F59E0B" />
    </Card>
  );
}

function NextStepsCard({ steps, onNavigate, studentId, best, language, copy }) {
  return (
    <Card icon="map-outline" title={copy.nextSteps}>
      <View style={styles.nextGrid}>
        {steps.map((step) => (
          <TouchableOpacity
            key={step.key}
            style={styles.nextButton}
            onPress={() =>
              onNavigate(step.route, {
                studentId,
                majorName: best?.name,
                language,
              })
            }
          >
            <Ionicons name={step.icon} size={19} color={colors.greenDark} />
            <Text style={styles.nextButtonText}>{nextStepTitle(step, language)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}

function DataQualityCard({ quality, copy, language }) {
  const rows = [
    { label: copy.fullAssessment, done: quality?.fullAssessmentCompleted },
    { label: copy.personalityTest, done: quality?.personalityCompleted },
    { label: copy.games, done: quality?.gamesPlayed },
    { label: copy.miniTasks, done: quality?.miniTasksCompleted },
  ];
  return (
    <Card icon="checkmark-circle-outline" title={copy.improveAccuracy}>
      {rows.map((row) => (
        <View key={row.label} style={styles.qualityRow}>
          <Ionicons
            name={row.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={row.done ? colors.green : colors.warning}
          />
          <Text style={styles.qualityText}>{row.label}</Text>
        </View>
      ))}
      {localizedMissingItems(quality?.missing || [], language).map((item) => (
        <Text key={item} style={styles.missingItem}>- {item}</Text>
      ))}
    </Card>
  );
}

function Card({ title, icon, children, accent }) {
  return (
    <View style={[styles.card, accent && styles.accentCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name={icon} size={19} color={colors.greenDark} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function MetaChip({ icon, text }) {
  return (
    <View style={styles.metaChip}>
      <Ionicons name={icon} size={15} color="#fff" />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function MiniStat({ title, value, icon, tone }) {
  const color = tone === 'blue' ? colors.blue : colors.green;
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniTitle}>{title}</Text>
    </View>
  );
}

function SignalBar({ label, value, weight, color }) {
  const width = pct(value);
  return (
    <View style={styles.signalRow}>
      <View style={styles.signalLabelRow}>
        <Text style={styles.signalLabel}>{label}</Text>
        <Text style={styles.signalValue}>{weight ? `${weight} | ` : ''}{width}%</Text>
      </View>
      <Progress value={width} color={color} />
    </View>
  );
}

function Progress({ value, color = colors.green, track = '#EEF4F0' }) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: track }]}>
      <View style={[styles.progressFill, { width: `${pct(value)}%`, backgroundColor: color }]} />
    </View>
  );
}

function SmallButton({ text, onPress }) {
  return (
    <TouchableOpacity style={styles.smallButton} onPress={onPress}>
      <Text style={styles.smallButtonText}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 34 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  loadingText: { marginTop: 10, color: colors.text, fontWeight: '800' },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: colors.muted, fontWeight: '700', lineHeight: 21, textAlign: 'right' },

  headerCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: colors.green,
    marginBottom: 14,
    shadowColor: '#064E3B',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
  },
  headerIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  kicker: { color: '#E7FFF1', fontWeight: '900', textAlign: 'right' },
  headerTitle: { color: '#fff', fontSize: 25, lineHeight: 34, fontWeight: '900', textAlign: 'right', marginTop: 6 },
  headerSubtitle: { color: '#E7FFF1', lineHeight: 22, fontWeight: '700', textAlign: 'right', marginTop: 8 },
  metaWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  metaChip: { flexDirection: 'row-reverse', gap: 7, alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.18)' },
  metaText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  completionBox: { marginTop: 16, gap: 10 },
  completionTop: { gap: 3 },
  completionText: { color: '#fff', fontWeight: '900', textAlign: 'right' },
  completionHint: { color: '#E7FFF1', fontSize: 12, fontWeight: '700', textAlign: 'right' },

  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#063A2E',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },
  accentCard: { borderColor: '#A7F3D0' },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { flex: 1, color: colors.text, fontSize: 19, fontWeight: '900', textAlign: 'right' },
  cardHint: { color: colors.muted, lineHeight: 21, fontWeight: '700', textAlign: 'right', marginBottom: 12 },

  bestName: { color: colors.text, fontSize: 24, fontWeight: '900', textAlign: 'right', marginBottom: 12 },
  matchRow: { gap: 14 },
  matchCircle: { alignSelf: 'center', width: 132, height: 132, borderRadius: 66, backgroundColor: colors.softBlue, borderWidth: 8, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center' },
  matchNumber: { color: colors.blue, fontSize: 28, fontWeight: '900' },
  matchLabel: { color: colors.muted, fontWeight: '800' },
  matchTextBlock: { gap: 8 },
  reasonTitle: { color: colors.text, fontWeight: '900', fontSize: 15, textAlign: 'right' },
  reasonText: { color: colors.muted, fontWeight: '700', lineHeight: 22, textAlign: 'right' },
  confidencePill: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: colors.softGreen, paddingHorizontal: 10, paddingVertical: 7 },
  confidenceText: { color: colors.greenDark, fontWeight: '900' },
  confidenceHint: { color: colors.muted, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  threeGrid: { flexDirection: 'row-reverse', gap: 10, marginBottom: 14 },
  miniStat: { flex: 1, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center', minHeight: 106 },
  miniValue: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 8 },
  miniTitle: { color: colors.muted, fontSize: 12, fontWeight: '800', textAlign: 'center', marginTop: 4 },

  signalRow: { marginBottom: 12 },
  signalLabelRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 10, marginBottom: 7 },
  signalLabel: { color: colors.text, fontWeight: '900', textAlign: 'right' },
  signalValue: { color: colors.muted, fontWeight: '900' },
  progressTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  bonusRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 11 },
  bonusText: { flex: 1, color: colors.text, fontWeight: '800', textAlign: 'right' },

  chipList: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 },
  strengthChip: { borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  gameSkillChip: { borderRadius: 16, backgroundColor: colors.softBlue, borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 12, paddingVertical: 10 },
  strengthText: { color: colors.text, fontWeight: '900', textAlign: 'right' },
  sourceText: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 4, textAlign: 'right' },
  improvementRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#EEF4F0' },
  smallIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.softGreen, alignItems: 'center', justifyContent: 'center' },
  improvementTitle: { color: colors.text, fontWeight: '900', textAlign: 'right' },
  improvementHint: { color: colors.muted, lineHeight: 19, fontSize: 12, fontWeight: '700', textAlign: 'right', marginTop: 3 },
  gameReason: { marginTop: 10, color: colors.text, lineHeight: 22, fontWeight: '700', textAlign: 'right' },

  fieldCard: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FBFEFC', padding: 12, marginBottom: 10 },
  fieldTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  rank: { color: colors.greenDark, fontWeight: '900', backgroundColor: colors.softGreen, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  fieldName: { color: colors.text, fontWeight: '900', fontSize: 16, textAlign: 'right' },
  fieldReason: { color: colors.muted, lineHeight: 19, fontWeight: '700', fontSize: 12, textAlign: 'right', marginTop: 4 },
  fieldScore: { color: colors.blue, fontSize: 18, fontWeight: '900' },
  fieldActions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  smallButton: { borderRadius: 999, backgroundColor: colors.softBlue, paddingHorizontal: 10, paddingVertical: 8 },
  smallButtonText: { color: colors.blue, fontSize: 12, fontWeight: '900' },

  nextGrid: { gap: 9 },
  nextButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.border, padding: 12 },
  nextButtonText: { flex: 1, color: colors.text, fontWeight: '900', textAlign: 'right' },
  qualityRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 6 },
  qualityText: { color: colors.text, fontWeight: '800', textAlign: 'right' },
  missingItem: { color: colors.muted, fontWeight: '700', textAlign: 'right', marginTop: 4 },

  accountActions: { gap: 9, marginBottom: 8 },
  lightButton: { minHeight: 48, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8 },
  lightButtonText: { color: colors.greenDark, fontWeight: '900' },
  dangerGhost: { alignItems: 'center', padding: 12 },
  dangerGhostText: { color: '#B42318', fontWeight: '900' },
});
