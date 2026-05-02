import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getStudentJourneySnapshot } from '../../services/studentJourneyService';

export default function StudentProfileScreen({ navigateTo }) {
  const { user, studentData, profile, studentIdentity, signOut, deleteAccount, refreshUserData } = useAuth();
  const { i18n = { language: 'en' } } = useTranslation();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('about');
  const [imgFailed, setImgFailed] = useState(false);
  const [localizedSchoolName, setLocalizedSchoolName] = useState('');
  const [journeySnapshot, setJourneySnapshot] = useState(null);

  const isArabic = String(i18n?.language || '').toLowerCase().startsWith('ar');
  const isHebrew = String(i18n?.language || '').toLowerCase().startsWith('he');
  const isRtl = isArabic || isHebrew;
  const isWide = width >= 980;
  const isMedium = width >= 720;

  useEffect(() => {
    if (user?.id) {
      refreshUserData?.(user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const copy = isHebrew
    ? {
        student: 'תלמיד/ה',
        notSet: 'לא הוגדר',
        noEmail: 'ללא אימייל',
        noPhone: 'ללא טלפון',
        heroSubtitle: 'כל פרופיל הלמידה שלך במקום אחד, עם גישה מהירה להתקדמות ולכלים.',
        points: 'נקודות',
        completed: 'הושלם',
        level: 'רמה',
        continue: 'המשך',
        edit: 'עריכה',
        details: 'פרטי הפרופיל',
        detailsSubtitle: 'תצוגה מסודרת של המידע האישי והלימודי שלך',
        about: 'אודות',
        contact: 'יצירת קשר',
        birthday: 'תאריך לידה',
        address: 'כתובת',
        gender: 'מגדר',
        school: 'בית ספר',
        grade: 'כיתה',
        track: 'מסלול',
        email: 'אימייל',
        phone: 'טלפון',
        quickActions: 'פעולות מהירות',
        quickSubtitle: 'קיצורי דרך לעמודים החשובים ביותר',
        recommendations: 'המלצות',
        recommendationsSubtitle: 'צפייה במסלולים מומלצים והשלבים הבאים',
        institutions: 'מוסדות לימוד',
        institutionsSubtitle: 'חיפוש אוניברסיטאות ומכללות לפי תחום ועיר',
        examHistory: 'היסטוריית מבחנים',
        examHistorySubtitle: 'סקירה של מבחנים ותוצאות קודמות',
        changePassword: 'שינוי סיסמה',
        changePasswordSubtitle: 'עדכון הסיסמה והאבטחה שלך',
        signOut: 'התנתקות',
        deleteAccount: 'מחיקת חשבון',
        deleteTitle: 'למחוק את החשבון?',
        deleteMessage: 'הנתונים האישיים והפרופיל שלך יימחקו מהמערכת.',
        deleteConfirm: 'מחיקה',
        deleteFailed: 'מחיקת החשבון נכשלה',
        gradePrefix: 'כיתה',
        male: 'זכר',
        female: 'נקבה',
      }
    : isArabic
      ? {
          student: 'طالب',
          notSet: 'غير محدد',
          noEmail: 'بدون بريد',
          noPhone: 'بدون هاتف',
          heroSubtitle: 'كل ملفك التعليمي في مكان واحد، مع وصول سريع للتقدم والأدوات.',
          points: 'النقاط',
          completed: 'المكتمل',
          level: 'المستوى',
          continue: 'متابعة',
          edit: 'تعديل',
          details: 'تفاصيل الحساب',
          detailsSubtitle: 'عرض مرتب لمعلوماتك الشخصية والدراسية',
          about: 'حول',
          contact: 'التواصل',
          birthday: 'تاريخ الميلاد',
          address: 'العنوان',
          gender: 'الجنس',
          school: 'المدرسة',
          grade: 'الصف',
          track: 'المسار',
          email: 'البريد الإلكتروني',
          phone: 'الهاتف',
          quickActions: 'إجراءات سريعة',
          quickSubtitle: 'اختصارات للصفحات الأكثر استخدامًا',
          recommendations: 'التوصيات',
          recommendationsSubtitle: 'عرض المسارات المقترحة والخطوات القادمة',
          institutions: 'المؤسسات التعليمية',
          institutionsSubtitle: 'ابحث عن الجامعات والكليات حسب التخصص والمدينة',
          examHistory: 'سجل الاختبارات',
          examHistorySubtitle: 'مراجعة الاختبارات والنتائج السابقة',
          changePassword: 'تغيير كلمة المرور',
          changePasswordSubtitle: 'تحديث كلمة المرور والحماية',
          signOut: 'تسجيل الخروج',
          deleteAccount: 'حذف الحساب',
          deleteTitle: 'حذف الحساب؟',
          deleteMessage: 'سيتم حذف بياناتك الشخصية وبروفايل الطالب من النظام.',
          deleteConfirm: 'حذف',
          deleteFailed: 'فشل حذف الحساب',
          gradePrefix: 'الصف',
          male: 'ذكر',
          female: 'أنثى',
        }
      : {
          student: 'Student',
          notSet: 'Not set',
          noEmail: 'No email',
          noPhone: 'No phone',
          heroSubtitle: 'Your learning profile in one place, with quick access to progress and tools.',
          points: 'Points',
          completed: 'Completed',
          level: 'Level',
          continue: 'Continue',
          edit: 'Edit',
          details: 'Profile Details',
          detailsSubtitle: 'Clean overview of your personal and school information',
          about: 'About',
          contact: 'Contact',
          birthday: 'Birthday',
          address: 'Address',
          gender: 'Gender',
          school: 'School',
          grade: 'Grade',
          track: 'Track',
          email: 'Email',
          phone: 'Phone',
          quickActions: 'Quick Actions',
          quickSubtitle: 'Shortcuts for the pages you use most',
          recommendations: 'Recommendations',
          recommendationsSubtitle: 'View suggested paths and next steps',
          institutions: 'Institutions',
          institutionsSubtitle: 'Browse universities and colleges by field and city',
          examHistory: 'Exam History',
          examHistorySubtitle: 'Review tests and previous results',
          changePassword: 'Change Password',
          changePasswordSubtitle: 'Update your password and security',
          signOut: 'Sign Out',
          deleteAccount: 'Delete Account',
          deleteTitle: 'Delete account?',
          deleteMessage: 'Your personal student data and profile will be removed from the system.',
          deleteConfirm: 'Delete',
          deleteFailed: 'Account deletion failed',
          gradePrefix: 'Grade',
          male: 'Male',
          female: 'Female',
        };

  const journeyCopy = isHebrew
    ? {
        insightReport: 'דו"ח אישי',
        insightReportSubtitle: 'סיכום משולב של המבחן, המשחקים וההמלצות',
        profileSummary: 'פרופיל תלמיד',
        profileSummarySubtitle: 'כאן המערכת מחברת בין המבחן, המשחקים והתאמת המסלול.',
        topMatch: 'המסלול המתאים לך',
        strongestAreas: 'חוזקות מובילות',
        gameSignals: 'אותות מהמשחקים',
        openFullReport: 'פתח דו"ח מלא',
        noJourneyData: 'עדיין אין נתונים משולבים.',
      }
    : isArabic
      ? {
          insightReport: 'التقرير الشخصي',
          insightReportSubtitle: 'ملخص موحّد يجمع الاختبار والألعاب والتوصيات',
          profileSummary: 'ملف الطالب',
          profileSummarySubtitle: 'هنا النظام يربط بين الاختبار والألعاب وتوافق المسار.',
          topMatch: 'المسار الأنسب لك',
          strongestAreas: 'أقوى نقاطك',
          gameSignals: 'إشارات من الألعاب',
          openFullReport: 'فتح التقرير الكامل',
          noJourneyData: 'لا توجد بيانات موحّدة بعد.',
        }
      : {
          insightReport: 'Insight Report',
          insightReportSubtitle: 'Unified summary of test, games, and recommendations',
          profileSummary: 'Student Profile',
          profileSummarySubtitle: 'The system connects the exam, games, and path matching here.',
          topMatch: 'Best-fit path',
          strongestAreas: 'Top strengths',
          gameSignals: 'Game signals',
          openFullReport: 'Open full report',
          noJourneyData: 'No unified data yet.',
        };

  const accountDisplayName = useMemo(
    () => {
      const studentFullName = `${studentData?.first_name || ''} ${studentData?.last_name || ''}`
        .replace(/\s+/g, ' ')
        .trim();

      return studentIdentity?.fullName || studentFullName || copy.student;
    },
    [copy.student, studentData?.first_name, studentData?.last_name, studentIdentity?.fullName]
  );

  const fullName = accountDisplayName;

  const smartBirthdayValue = useMemo(
    () =>
      studentData?.birthday ||
      studentData?.birth_date ||
      studentData?.date_of_birth ||
      profile?.birthday ||
      profile?.birth_date ||
      '',
    [
      profile?.birth_date,
      profile?.birthday,
      studentData?.birth_date,
      studentData?.birthday,
      studentData?.date_of_birth,
    ]
  );

  const smartGradeValue = useMemo(
    () =>
      studentData?.grade ||
      studentData?.grade_level ||
      studentData?.class_grade ||
      profile?.grade ||
      profile?.grade_level ||
      '',
    [
      profile?.grade,
      profile?.grade_level,
      studentData?.class_grade,
      studentData?.grade,
      studentData?.grade_level,
    ]
  );

  const smartSchoolName = useMemo(
    () =>
      studentData?.school_name ||
      studentData?.schoolName ||
      studentData?.school ||
      profile?.school_name ||
      profile?.schoolName ||
      profile?.school ||
      '',
    [
      profile?.school,
      profile?.schoolName,
      profile?.school_name,
      studentData?.school,
      studentData?.schoolName,
      studentData?.school_name,
    ]
  );

  const smartTrackValue = useMemo(
    () =>
      studentData?.track ||
      studentData?.pathway ||
      studentData?.major_track ||
      profile?.track ||
      profile?.pathway ||
      '',
    [
      profile?.pathway,
      profile?.track,
      studentData?.major_track,
      studentData?.pathway,
      studentData?.track,
    ]
  );

  const smartAddressText = useMemo(() => {
    const parts = [
      studentData?.city || profile?.city,
      studentData?.street || profile?.street,
      studentData?.house_number || profile?.house_number,
      studentData?.address || profile?.address,
    ]
      .filter(Boolean)
      .join(', ');
    return parts || '';
  }, [
    profile?.address,
    profile?.city,
    profile?.house_number,
    profile?.street,
    studentData?.address,
    studentData?.city,
    studentData?.house_number,
    studentData?.street,
  ]);

  const smartGenderRaw = String(studentData?.gender || profile?.gender || '').trim().toLowerCase();

  const gradeText = smartGradeValue ? `${copy.gradePrefix} ${smartGradeValue}` : copy.notSet;
  const birthText = smartBirthdayValue
    ? new Date(smartBirthdayValue).toLocaleDateString('en-US')
    : copy.notSet;

  const addressText = useMemo(
    () => smartAddressText || copy.notSet,
    [copy.notSet, smartAddressText]
  );

  const genderText = useMemo(() => {
    const raw = smartGenderRaw;
    if (!raw) return copy.notSet;
    if (['male', 'm', 'boy', 'ذكر', 'זכר'].includes(raw)) return copy.male;
    if (['female', 'f', 'girl', 'أنثى', 'נקבה'].includes(raw)) return copy.female;
    return studentData?.gender || profile?.gender || copy.notSet;
  }, [copy.female, copy.male, copy.notSet, profile?.gender, smartGenderRaw, studentData?.gender]);

  useEffect(() => {
    let cancelled = false;

    const loadLocalizedSchoolName = async () => {
      const fallbackName = smartSchoolName || copy.notSet;
      if (!studentData?.school_id && !smartSchoolName) {
        setLocalizedSchoolName(copy.notSet);
        return;
      }

      try {
        let school = null;

        if (studentData?.school_id) {
          const { data } = await supabase
            .from('schools')
            .select('name_ar,name_he')
            .eq('id', studentData.school_id)
            .maybeSingle();
          school = data || null;
        }

        if (!school && smartSchoolName) {
          const { data } = await supabase
            .from('schools')
            .select('name_ar,name_he')
            .or(`name_ar.eq.${smartSchoolName},name_he.eq.${smartSchoolName}`)
            .maybeSingle();
          school = data || null;
        }

        if (cancelled) return;

        if (school) {
          setLocalizedSchoolName(isHebrew ? school.name_he || fallbackName : school.name_ar || fallbackName);
          return;
        }

        setLocalizedSchoolName(fallbackName);
      } catch (_error) {
        if (!cancelled) setLocalizedSchoolName(fallbackName);
      }
    };

    loadLocalizedSchoolName();

    return () => {
      cancelled = true;
    };
  }, [copy.notSet, isHebrew, smartSchoolName, studentData?.school_id]);

  const avatarUrlRaw =
    (studentData?.avatar_url || studentData?.image_url || studentData?.profile_image_url || '')
      ?.toString()
      .replace(/[\s"]/g, '')
      .trim() || '';

  const avatarUrl = avatarUrlRaw
    ? `${avatarUrlRaw}${avatarUrlRaw.includes('?') ? '&' : '?'}v=${studentData?.updated_at || Date.now()}`
    : null;

  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrlRaw]);

  useEffect(() => {
    let cancelled = false;

    async function loadJourneySnapshot() {
      if (!studentData?.id) return;

      const result = await getStudentJourneySnapshot(studentData.id, {
        language: i18n.language,
      });

      if (cancelled || !result?.success) return;
      setJourneySnapshot(result.data || null);
    }

    loadJourneySnapshot();

    return () => {
      cancelled = true;
    };
  }, [studentData?.id, i18n.language]);

  const showImage = avatarUrl && !imgFailed;

  const infoRows =
    activeTab === 'about'
      ? [
          { icon: 'birthday-cake', label: copy.birthday, value: birthText },
          { icon: 'map-marker', label: copy.address, value: addressText },
          { icon: 'venus-mars', label: copy.gender, value: genderText },
          { icon: 'building', label: copy.school, value: localizedSchoolName || copy.notSet },
          { icon: 'graduation-cap', label: copy.grade, value: smartGradeValue || copy.notSet },
          { icon: 'compass', label: copy.track, value: smartTrackValue || copy.notSet },
        ]
      : [
          { icon: 'envelope', label: copy.email, value: user?.email || studentData?.email || copy.notSet },
          { icon: 'phone', label: copy.phone, value: studentData?.phone || profile?.phone || copy.notSet },
          { icon: 'building-o', label: copy.school, value: localizedSchoolName || copy.notSet },
        ];

  const quickLinks = [
    {
      key: 'recommendations',
      title: copy.recommendations,
      subtitle: copy.recommendationsSubtitle,
      icon: 'graduation-cap',
      accent: '#27ae60',
      onPress: () => navigateTo('recommendations'),
    },
    {
      key: 'institutions',
      title: copy.institutions,
      subtitle: copy.institutionsSubtitle,
      icon: 'university',
      accent: '#1d4ed8',
      onPress: () =>
        navigateTo('universitiesAndColleges', {
          majorName: journeySnapshot?.topRecommendation?.name || '',
        }),
    },
    {
      key: 'examHistory',
      title: copy.examHistory,
      subtitle: copy.examHistorySubtitle,
      icon: 'history',
      accent: '#38bdf8',
      onPress: () => navigateTo('examHistory'),
    },
    {
      key: 'skillsProfile',
      title: isHebrew ? 'פרופיל מיומנויות' : 'ملف المهارات',
      subtitle: isHebrew
        ? 'מבט רדאר על לוגיקה, ריכוז, שפה וחשיבה מדעית'
        : 'عرض رادار للمنطق، التركيز، اللغة، والتفكير العلمي',
      icon: 'area-chart',
      accent: '#14b8a6',
      onPress: () => navigateTo('skillsProfile'),
    },
    {
      key: 'insightReport',
      title: journeyCopy.insightReport,
      subtitle: journeyCopy.insightReportSubtitle,
      icon: 'file-text',
      accent: '#8b5cf6',
      onPress: () =>
        navigateTo('studentInsightReport', {
          studentId: studentData?.id,
          language: i18n.language,
        }),
    },
    {
      key: 'changePassword',
      title: copy.changePassword,
      subtitle: copy.changePasswordSubtitle,
      icon: 'lock',
      accent: '#f59e0b',
      onPress: () => navigateTo('changePassword'),
    },
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      navigateTo('login');
    } catch (e) {}
  };

  const handleDeleteAccount = () => {
    Alert.alert(copy.deleteTitle, copy.deleteMessage, [
      { text: isHebrew ? 'ביטול' : isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
      {
        text: copy.deleteConfirm,
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteAccount();
          if (error) {
            Alert.alert(copy.deleteFailed, error.message || copy.deleteFailed);
            return;
          }
          navigateTo('home');
        },
      },
    ]);
  };

  const topRecommendation = journeySnapshot?.topRecommendation || null;
  const strongestAbilities = journeySnapshot?.strongestAbilities || [];
  const gameHighlights = journeySnapshot?.gameHighlights || [];

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={[styles.infoLead, isRtl && styles.infoLeadRtl]}>
        <View style={styles.infoIconWrap}>
          <FontAwesome name={icon} size={14} color="#27ae60" />
        </View>
        <View style={styles.infoTextGroup}>
          <Text style={[styles.infoLabel, isRtl && styles.rtlText]}>{label}</Text>
          <Text style={[styles.infoValue, isRtl && styles.rtlText]}>{value}</Text>
        </View>
      </View>
    </View>
  );

  const missingStudentProfile = !studentData?.id;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.shell}>
          <View style={styles.heroCard}>
            <View style={styles.heroGlowLarge} />
            <View style={styles.heroGlowSmall} />

            <View style={styles.heroTopRow}>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => navigateTo('settings')}
                activeOpacity={0.88}
              >
                <FontAwesome name="cog" size={18} color="#dbeafe" />
              </TouchableOpacity>

              <View style={styles.gradePill}>
                <FontAwesome name="bookmark" size={12} color="#0b1223" />
                <Text style={styles.gradePillText}>{gradeText}</Text>
              </View>
            </View>

            <View style={[styles.profileHeader, isWide && styles.profileHeaderWide, isRtl && styles.profileHeaderRtl]}>
              <View style={styles.avatarShell}>
                {showImage ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <FontAwesome name="user" size={32} color="#27ae60" />
                  </View>
                )}
              </View>

              <View style={styles.heroTextArea}>
                <View style={[styles.heroNameRow, isRtl && styles.heroNameRowRtl]}>
                  <View style={styles.onlineDot} />
                  <Text style={[styles.heroName, isRtl && styles.rtlText]}>{fullName}</Text>
                </View>
                <Text style={[styles.heroSubtitle, isRtl && styles.rtlText]}>{copy.heroSubtitle}</Text>

                <View style={[styles.metaRow, !isMedium && styles.metaRowStacked, isRtl && styles.metaRowRtl]}>
                  <View style={[styles.metaChip, isRtl && styles.metaChipRtl]}>
                    <FontAwesome name="envelope" size={12} color="#86efac" />
                    <Text style={styles.metaChipText}>{user?.email || copy.noEmail}</Text>
                  </View>

                  <View style={[styles.metaChip, isRtl && styles.metaChipRtl]}>
                    <FontAwesome name="phone" size={12} color="#86efac" />
                    <Text style={styles.metaChipText}>{studentData?.phone || copy.noPhone}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.statsGrid, isMedium && styles.statsGridWide]}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{studentData?.points ?? 0}</Text>
              <Text style={styles.statLabel}>{copy.points}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{studentData?.completed_tasks ?? 0}</Text>
              <Text style={styles.statLabel}>{copy.completed}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{studentData?.level ?? 1}</Text>
              <Text style={styles.statLabel}>{copy.level}</Text>
            </View>
          </View>

          {missingStudentProfile && (
            <View style={styles.missingProfileCard}>
              <Text style={[styles.missingProfileTitle, isRtl && styles.rtlText]}>
                {isHebrew ? 'פרטי הפרופיל עדיין לא נטענו' : 'بيانات البروفايل غير مكتملة'}
              </Text>
              <Text style={[styles.missingProfileText, isRtl && styles.rtlText]}>
                {isHebrew
                  ? 'אפשר להשלים את הפרטים עכשיו כדי שהמבחן וההמלצות יעבדו נכון.'
                  : 'أكمل بيانات الطالب الآن حتى يعمل الامتحان والتوصيات بشكل صحيح.'}
              </Text>
              <TouchableOpacity
                style={styles.missingProfileBtn}
                onPress={() => navigateTo('editProfile')}
                activeOpacity={0.9}
              >
                <FontAwesome name="pencil" size={15} color="#0b1223" />
                <Text style={styles.missingProfileBtnText}>
                  {isHebrew ? 'עריכת פרופיל' : 'تعديل البروفايل'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.primaryActions, isMedium && styles.primaryActionsWide]}>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={() => navigateTo('studentDashboard')}
              activeOpacity={0.9}
            >
              <FontAwesome name="home" size={16} color="#0b1223" />
              <Text style={styles.primaryActionText}>{copy.continue}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => navigateTo('editProfile')}
              activeOpacity={0.9}
            >
              <FontAwesome name="pencil" size={16} color="#27ae60" />
              <Text style={styles.secondaryActionText}>{copy.edit}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.mainGrid, isWide && styles.mainGridWide]}>
            <View style={styles.detailsColumn}>
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, isRtl && styles.rtlText]}>{journeyCopy.profileSummary}</Text>
                    <Text style={[styles.sectionSubtitle, isRtl && styles.rtlText]}>
                      {journeyCopy.profileSummarySubtitle}
                    </Text>
                  </View>
                </View>

                {!topRecommendation && strongestAbilities.length === 0 && gameHighlights.length === 0 ? (
                  <Text style={[styles.sectionSubtitle, isRtl && styles.rtlText]}>{journeyCopy.noJourneyData}</Text>
                ) : (
                  <View style={styles.journeyGrid}>
                    <View style={styles.journeyCard}>
                      <Text style={[styles.journeyLabel, isRtl && styles.rtlText]}>{journeyCopy.topMatch}</Text>
                      <Text style={[styles.journeyValue, isRtl && styles.rtlText]}>
                        {topRecommendation?.name || copy.notSet}
                      </Text>
                      {topRecommendation ? (
                        <Text style={[styles.journeyHint, isRtl && styles.rtlText]}>
                          {topRecommendation.scorePercent}%
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.journeyCard}>
                      <Text style={[styles.journeyLabel, isRtl && styles.rtlText]}>
                        {journeyCopy.strongestAreas}
                      </Text>
                      {strongestAbilities.slice(0, 3).map((item) => (
                        <Text key={item.subjectId || item.label} style={[styles.journeyListItem, isRtl && styles.rtlText]}>
                          • {item.label} ({item.score}%)
                        </Text>
                      ))}
                    </View>

                    <View style={styles.journeyCard}>
                      <Text style={[styles.journeyLabel, isRtl && styles.rtlText]}>{journeyCopy.gameSignals}</Text>
                      {gameHighlights.slice(0, 2).map((game) => (
                        <Text key={game.gameId} style={[styles.journeyListItem, isRtl && styles.rtlText]}>
                          • {game.title} - {game.focusArea} ({game.score}%) - {game.playCount || 1} plays
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.reportBtn}
                  onPress={() =>
                    navigateTo('studentInsightReport', {
                      studentId: studentData?.id,
                      language: i18n.language,
                    })
                  }
                  activeOpacity={0.9}
                >
                  <FontAwesome name="file-text" size={16} color="#0b1223" />
                  <Text style={styles.reportBtnText}>{journeyCopy.openFullReport}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, isRtl && styles.rtlText]}>{copy.details}</Text>
                    <Text style={[styles.sectionSubtitle, isRtl && styles.rtlText]}>{copy.detailsSubtitle}</Text>
                  </View>
                </View>

                <View style={styles.tabs}>
                  <TouchableOpacity
                    onPress={() => setActiveTab('about')}
                    style={[styles.tab, activeTab === 'about' && styles.tabActive]}
                    activeOpacity={0.9}
                  >
                    <FontAwesome
                      name="info-circle"
                      size={14}
                      color={activeTab === 'about' ? '#0b1223' : '#94a3b8'}
                    />
                    <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>
                      {copy.about}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab('contact')}
                    style={[styles.tab, activeTab === 'contact' && styles.tabActive]}
                    activeOpacity={0.9}
                  >
                    <FontAwesome
                      name="phone"
                      size={14}
                      color={activeTab === 'contact' ? '#0b1223' : '#94a3b8'}
                    />
                    <Text style={[styles.tabText, activeTab === 'contact' && styles.tabTextActive]}>
                      {copy.contact}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.infoList}>
                  {infoRows.map((item) => (
                    <InfoRow key={`${activeTab}-${item.label}`} {...item} />
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.linksColumn}>
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, isRtl && styles.rtlText]}>{copy.quickActions}</Text>
                    <Text style={[styles.sectionSubtitle, isRtl && styles.rtlText]}>{copy.quickSubtitle}</Text>
                  </View>
                </View>

                <View style={styles.quickLinksList}>
                  {quickLinks.map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.quickLinkCard}
                      onPress={item.onPress}
                      activeOpacity={0.9}
                    >
                      <View style={[styles.quickIconWrap, { backgroundColor: `${item.accent}22` }]}>
                        <FontAwesome name={item.icon} size={18} color={item.accent} />
                      </View>

                      <View style={styles.quickTextBlock}>
                        <Text style={[styles.quickLinkTitle, isRtl && styles.rtlText]}>{item.title}</Text>
                        <Text style={[styles.quickLinkSubtitle, isRtl && styles.rtlText]}>{item.subtitle}</Text>
                      </View>

                      <FontAwesome name={isRtl ? 'angle-right' : 'angle-left'} size={18} color="#64748b" />
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.9}>
                  <FontAwesome name="sign-out" size={18} color="#f87171" />
                  <Text style={styles.logoutText}>{copy.signOut}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.9}>
                  <FontAwesome name="trash" size={18} color="#fecaca" />
                  <Text style={styles.deleteText}>{copy.deleteAccount}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  shell: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#101a2f',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 8,
  },
  heroGlowLarge: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(39,174,96,0.16)',
    top: -120,
    right: -60,
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(56,189,248,0.08)',
    bottom: -80,
    left: -40,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
  },
  gradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#86efac',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  gradePillText: {
    color: '#0b1223',
    fontSize: 12,
    fontWeight: '900',
  },
  profileHeader: {
    gap: 14,
    alignItems: 'flex-start',
  },
  profileHeaderWide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  avatarShell: {
    width: 92,
    height: 92,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0b1223',
    borderWidth: 3,
    borderColor: 'rgba(39,174,96,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextArea: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroNameRowRtl: {
    flexDirection: 'row-reverse',
  },
  heroName: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '900',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  heroSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 560,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  metaRowStacked: {
    flexDirection: 'column',
  },
  metaRowRtl: {
    alignItems: 'flex-end',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(134,239,172,0.12)',
  },
  metaChipRtl: {
    flexDirection: 'row-reverse',
  },
  metaChipText: {
    color: '#dbeafe',
    fontSize: 13,
    fontWeight: '700',
  },
  statsGrid: {
    marginTop: 14,
    gap: 12,
  },
  statsGridWide: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    minHeight: 94,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  missingProfileCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    padding: 14,
    gap: 10,
  },
  missingProfileTitle: {
    color: '#fef3c7',
    fontSize: 15,
    fontWeight: '900',
  },
  missingProfileText: {
    color: '#fde68a',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  missingProfileBtn: {
    alignSelf: 'flex-start',
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: '#fbbf24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  missingProfileBtnText: {
    color: '#0b1223',
    fontSize: 13,
    fontWeight: '900',
  },
  primaryActions: {
    gap: 12,
    marginTop: 14,
  },
  primaryActionsWide: {
    flexDirection: 'row',
  },
  primaryAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  primaryActionText: {
    color: '#0b1223',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: 'rgba(39,174,96,0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  secondaryActionText: {
    color: '#27ae60',
    fontSize: 14,
    fontWeight: '900',
  },
  mainGrid: {
    gap: 14,
    marginTop: 14,
  },
  mainGridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailsColumn: {
    flex: 1.15,
  },
  linksColumn: {
    flex: 0.85,
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    padding: 14,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: '#111c31',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#86efac',
    borderColor: '#86efac',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#0b1223',
  },
  infoList: {
    gap: 10,
  },
  infoRow: {
    borderRadius: 15,
    backgroundColor: '#111c31',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  infoLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLeadRtl: {
    flexDirection: 'row-reverse',
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(39,174,96,0.12)',
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  infoValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  quickLinksList: {
    gap: 10,
  },
  quickLinkCard: {
    borderRadius: 15,
    backgroundColor: '#111c31',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTextBlock: {
    flex: 1,
  },
  quickLinkTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
  },
  quickLinkSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  journeyGrid: {
    gap: 10,
  },
  journeyCard: {
    borderRadius: 15,
    backgroundColor: '#111c31',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
    padding: 12,
  },
  journeyLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  journeyValue: {
    marginTop: 6,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
  },
  journeyHint: {
    marginTop: 6,
    color: '#86efac',
    fontSize: 13,
    fontWeight: '900',
  },
  journeyListItem: {
    marginTop: 8,
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
  },
  reportBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: '#86efac',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  reportBtnText: {
    color: '#0b1223',
    fontSize: 14,
    fontWeight: '900',
  },
  logoutBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(248,113,113,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '900',
  },
  deleteBtn: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(127,29,29,0.28)',
    borderWidth: 1.5,
    borderColor: 'rgba(252,165,165,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  deleteText: {
    color: '#fecaca',
    fontSize: 14,
    fontWeight: '900',
  },
  rtlText: {
    textAlign: 'right',
  },
});
