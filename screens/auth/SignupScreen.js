import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import CustomButton from '../../components/Form/CustomButton';
import CustomPicker from '../../components/Form/CustomPicker';
import CustomTextInput from '../../components/Form/CustomTextInput';
import DatePicker from '../../components/Form/DatePicker';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getClassSectionOptions } from '../../utils/classSections';
import { normalizeIsraeliId } from '../../src/utils/israeliId';
import {
  formatPhone,
  validateBirthday,
  validateEmail,
  validateGrade,
  validateName,
  validateNamesLanguageMatch,
  validatePassword,
  validatePasswordMatch,
  validatePhone,
  validateSchool,
  validateStudentId,
} from '../../utils/validation';

function normalizeSchoolName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildSchoolOption({ id, name, city, savedName }) {
  const schoolName = normalizeSchoolName(name);
  const cityName = normalizeSchoolName(city);
  const persistedSchoolName = normalizeSchoolName(savedName) || schoolName;

  if (!schoolName) return null;
  const label = cityName && !schoolName.includes(cityName) ? `${schoolName} - ${cityName}` : schoolName;

  return {
    label,
    value: id ? String(id) : `fallback:${schoolName}`,
    schoolId: id ? String(id) : '',
    schoolName: persistedSchoolName,
  };
}

export default function SignupScreen({ navigateTo }) {
  const { signUp } = useAuth();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [schoolItems, setSchoolItems] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState('');
  const [errors, setErrors] = useState({});
  const [reloadSchoolsToken, setReloadSchoolsToken] = useState(0);
  const [step3Submitted, setStep3Submitted] = useState(false);

  const [formData, setFormData] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    email: '@gmail.com',
    phone: '',
    birthday: '',
    schoolId: '',
    schoolName: '',
    grade: '',
    classSection: '',
    password: '',
    confirmPassword: '',
  });

  const isHebrew = String(i18n?.language || '').toLowerCase().startsWith('he');
  const isWideLayout = width >= 1040;
  const isTablet = width >= 720;
  const schoolFallbackNotice = isHebrew
    ? 'טעינת בתי הספר ממסד הנתונים נכשלה. ודא/י שהרשאת הקריאה הציבורית לטבלת schools פעילה.'
    : 'تعذر تحميل المدارس من الداتابيس. تأكد أن صلاحية القراءة العامة لجدول schools مفعلة.';

  const promoTitle = isHebrew ? 'ברוכים הבאים ל-i3dad / إعداد' : 'مرحبًا بك في i3dad / إعداد';
  const promoSubtitle = isHebrew
    ? 'התחל את הדרך שלך עם פלטפורמה חכמה שמחברת בין היכולות שלך לבין עתיד לימודי ומקצועי שמתאים בדיוק לך.'
    : 'ابدأ رحلتك مع منصة ذكية تربط بين قدراتك وبين مستقبل أكاديمي ومهني مناسب لك بدقة.';
  const promoPoints = isHebrew
    ? [
        'פתיחת חשבון מהירה ופשוטה',
        'המלצות אקדמיות ומקצועיות מותאמות לך',
        'פעילויות, מסלולים ובתי ספר במקום אחד',
      ]
    : [
        'إنشاء حساب سريع وبسيط',
        'توصيات أكاديمية ومهنية تناسبك',
        'فعاليات، مسارات ومدارس في مكان واحد',
      ];
  const insightTitle = isHebrew ? 'התחלה חכמה יותר' : 'بداية أذكى';
  const insightText = isHebrew
    ? 'בונים עבורך מסלול ברור מתוך היכולות, תחומי העניין והבחירות שלך.'
    : 'نبني لك مسارًا أوضح انطلاقًا من قدراتك واهتماماتك واختياراتك.';

  const passwordRequirements = [
    {
      key: 'length',
      label: isHebrew ? 'לפחות 10 תווים' : '10 أحرف على الأقل',
      isMet: formData.password.length >= 10,
    },
    {
      key: 'upper',
      label: isHebrew ? 'אות גדולה אחת באנגלית (A-Z)' : 'حرف كبير واحد بالإنجليزية (A-Z)',
      isMet: /[A-Z]/.test(formData.password),
    },
    {
      key: 'lower',
      label: isHebrew ? 'אות קטנה אחת באנגלית (a-z)' : 'حرف صغير واحد بالإنجليزية (a-z)',
      isMet: /[a-z]/.test(formData.password),
    },
    {
      key: 'number',
      label: isHebrew ? 'מספר אחד לפחות (0-9)' : 'رقم واحد على الأقل (0-9)',
      isMet: /[0-9]/.test(formData.password),
    },
    {
      key: 'special',
      label: isHebrew ? 'תו מיוחד אחד לפחות' : 'رمز خاص واحد على الأقل',
      isMet: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/~`]/.test(formData.password),
    },
    {
      key: 'noSpaces',
      label: isHebrew ? 'ללא רווחים' : 'بدون مسافات',
      isMet: !/\s/.test(formData.password),
    },
  ];

  useEffect(() => {
    let mounted = true;

    const loadSchools = async () => {
      try {
        setSchoolsLoading(true);
        setSchoolsError('');

        let { data, error } = await supabase
          .from('schools')
          .select('id, name_ar, name_he, city_ar, city_he, is_active')
          .eq('is_active', true)
          .order('name_ar');

        if (error) {
          const fallbackQuery = await supabase
            .from('schools')
            .select('id, name_ar, name_he, city_ar, city_he')
            .order('name_ar');

          data = fallbackQuery.data;
          error = fallbackQuery.error;
        }

        if (!mounted) return;

        if (error) {
          console.error('loadSchools failed:', error?.message || error);
        }

        const seen = new Set();
        const mappedSchools = [];

        for (const school of data || []) {
          const schoolNameAr = normalizeSchoolName(school.name_ar);
          const schoolNameHe = normalizeSchoolName(school.name_he);
          const cityNameAr = normalizeSchoolName(school.city_ar);
          const cityNameHe = normalizeSchoolName(school.city_he);

          const schoolName = normalizeSchoolName(
            (isHebrew ? schoolNameHe : schoolNameAr) || schoolNameAr || schoolNameHe
          );
          const cityName = normalizeSchoolName(
            (isHebrew ? cityNameHe : cityNameAr) || cityNameAr || cityNameHe
          );

          if (!schoolName) continue;

          const dedupeKey = `${schoolNameAr || schoolNameHe}::${cityNameAr || cityNameHe}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          const option = buildSchoolOption({
            id: school.id,
            name: schoolName,
            city: cityName,
          });

          if (option) {
            mappedSchools.push({
              ...option,
              schoolName: schoolNameAr || schoolNameHe || schoolName,
            });
          }
        }

        if (mappedSchools.length > 0) {
          setSchoolItems(mappedSchools);
          setSchoolsError('');
          return;
        }

        setSchoolItems([]);
        setSchoolsError(schoolFallbackNotice);
      } catch (error) {
        if (!mounted) return;
        setSchoolItems([]);
        setSchoolsError(schoolFallbackNotice);
      } finally {
        if (mounted) setSchoolsLoading(false);
      }
    };

    loadSchools();

    return () => {
      mounted = false;
    };
  }, [reloadSchoolsToken, isHebrew, i18n?.language]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    const studentIdValidation = validateStudentId(formData.studentId);
    if (!studentIdValidation.isValid) {
      newErrors.studentId = studentIdValidation.error;
    } else if (studentIdValidation.normalizedId !== formData.studentId) {
      setFormData((prev) => ({ ...prev, studentId: studentIdValidation.normalizedId }));
    }

    const firstNameValidation = validateName(formData.firstName, t('auth.signup.firstName'));
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.error;
    }

    const lastNameValidation = validateName(formData.lastName, t('auth.signup.lastName'));
    if (!lastNameValidation.isValid) {
      newErrors.lastName = lastNameValidation.error;
    }

    const namesLanguageMatch = validateNamesLanguageMatch(formData.firstName, formData.lastName);
    if (!namesLanguageMatch.isValid) {
      newErrors.firstName = namesLanguageMatch.error;
      newErrors.lastName = namesLanguageMatch.error;
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    const phoneValidation = validatePhone(formData.phone);
    if (!phoneValidation.isValid) {
      newErrors.phone = phoneValidation.error;
    }

    const birthdayValidation = validateBirthday(formData.birthday);
    if (!birthdayValidation.isValid) {
      newErrors.birthday = birthdayValidation.error;
    }

    const schoolValidation = validateSchool(formData.schoolId);
    if (!schoolValidation.isValid) {
      newErrors.schoolName = schoolItems.length
        ? schoolValidation.error
        : schoolFallbackNotice;
    }

    const gradeValidation = validateGrade(formData.grade);
    if (!gradeValidation.isValid) {
      newErrors.grade = gradeValidation.error;
    }

    if (!formData.classSection) {
      newErrors.classSection = isHebrew ? 'יש לבחור כיתה/שכבה' : 'يجب اختيار الشعبة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    setStep3Submitted(true);
    const newErrors = {};

    const firstUnmetPasswordRule = passwordRequirements.find((rule) => !rule.isMet);
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = firstUnmetPasswordRule?.label || passwordValidation.error;
    }

    const passwordMatchValidation = validatePasswordMatch(
      formData.password,
      formData.confirmPassword
    );
    if (!passwordMatchValidation.isValid) {
      newErrors.confirmPassword = passwordMatchValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep3Submitted(false);
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      if (step === 3) setStep3Submitted(false);
      setErrors({});
    }
  };

  const handleSignup = async () => {
    if (!validateStep3()) return;

    setLoading(true);

    const studentInfo = {
      studentId: normalizeIsraeliId(formData.studentId),
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formatPhone(formData.phone),
      birthday: formData.birthday,
      schoolName: formData.schoolName,
      schoolId: formData.schoolId,
      grade: parseInt(formData.grade, 10),
      classSection: formData.classSection,
    };

    const { error } = await signUp(formData.email, formData.password, studentInfo);
    setLoading(false);

    if (error) {
      let errorMessage = t('auth.signup.errors.generic');

      if (error.message.includes('already registered')) {
        errorMessage = t('auth.signup.errors.emailExists');
      } else if (error.message.includes('Password')) {
        errorMessage = t('auth.signup.errors.weakPassword');
      }

      Alert.alert(t('common.error'), errorMessage);
      return;
    }

    navigateTo('login');
    setTimeout(() => {
      Alert.alert(t('auth.signup.success.title'), t('auth.signup.success.message'));
    }, 500);
  };

  const gradeItems = [
    { label: isHebrew ? 'כיתה ט׳' : 'الصف التاسع', value: '9' },
    { label: isHebrew ? 'כיתה י׳' : 'الصف العاشر', value: '10' },
    { label: isHebrew ? 'כיתה י״א' : 'الصف الحادي عشر', value: '11' },
    { label: isHebrew ? 'כיתה י״ב' : 'الصف الثاني عشر', value: '12' },
  ];
  const classSectionItems = getClassSectionOptions(isHebrew ? 'he' : 'ar').map((item) => ({
    ...item,
    label: isHebrew ? `כיתה ${item.label}` : `شعبة ${item.label}`,
  }));
  const schoolFieldError = errors.schoolName || (!schoolItems.length ? schoolsError : '');
  const isStudentIdValid = validateStudentId(formData.studentId).isValid;
  const selectedSchoolPickerValue =
    schoolItems.find((item) => item.schoolId && item.schoolId === formData.schoolId)?.value ||
    schoolItems.find((item) => !item.schoolId && item.schoolName === formData.schoolName)?.value ||
    '';

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((stepNum) => (
        <View key={stepNum} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              step >= stepNum && styles.stepCircleActive,
              step > stepNum && styles.stepCircleCompleted,
            ]}
          >
            {step > stepNum ? (
              <FontAwesome name="check" size={16} color="#fff" />
            ) : (
              <Text style={[styles.stepNumber, step >= stepNum && styles.stepNumberActive]}>
                {stepNum}
              </Text>
            )}
          </View>
          {stepNum < 3 && (
            <View style={[styles.stepLine, step > stepNum && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );

  const inlineRowStyle = [
    styles.inlineRow,
    !isTablet && styles.inlineRowStacked,
  ];

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={inlineRowStyle}>
        <CustomTextInput
          label={t('auth.signup.firstName')}
          value={formData.firstName}
          onChangeText={(text) => updateField('firstName', text)}
          placeholder="Ahmad"
          icon="user"
          error={errors.firstName}
          containerStyle={styles.inlineField}
        />

        <CustomTextInput
          label={t('auth.signup.lastName')}
          value={formData.lastName}
          onChangeText={(text) => updateField('lastName', text)}
          placeholder="Hasan"
          icon="users"
          error={errors.lastName}
          containerStyle={styles.inlineField}
        />
      </View>

      <View style={inlineRowStyle}>
        <CustomTextInput
          label={t('auth.signup.studentId')}
          value={formData.studentId}
          onChangeText={(text) => updateField('studentId', text.replace(/[^\d\s-]/g, ''))}
          placeholder="123456789"
          icon="id-card"
          keyboardType="numeric"
          maxLength={12}
          error={errors.studentId}
          containerStyle={styles.inlineField}
        />

        <CustomTextInput
          label={t('auth.signup.email')}
          value={formData.email}
          onChangeText={(text) => updateField('email', String(text || '').replace(/\s/g, ''))}
          placeholder=""
          icon="envelope"
          keyboardType="email-address"
          error={errors.email}
          containerStyle={styles.inlineField}
        />
      </View>

      <CustomButton title={t('common.next')} onPress={handleNext} icon="arrow-left" disabled={!isStudentIdValid} />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={inlineRowStyle}>
        <CustomTextInput
          label={t('auth.signup.phone')}
          value={formData.phone}
          onChangeText={(text) => updateField('phone', text)}
          placeholder="+972501234567"
          icon="phone"
          keyboardType="phone-pad"
          error={errors.phone}
          containerStyle={styles.inlineField}
        />

        <DatePicker
          label={t('auth.signup.birthday')}
          value={formData.birthday}
          onValueChange={(date) => updateField('birthday', date)}
          icon="calendar"
          error={errors.birthday}
          containerStyle={styles.inlineField}
        />
      </View>

      <View style={inlineRowStyle}>
        <CustomPicker
          label={t('auth.signup.school')}
          value={selectedSchoolPickerValue}
          onValueChange={(value) => {
            const selectedSchool = schoolItems.find((item) => item.value === value);
            setFormData((prev) => ({
              ...prev,
              schoolId: selectedSchool?.schoolId || '',
              schoolName: selectedSchool?.schoolName || '',
            }));

            if (errors.schoolName) {
              setErrors((prev) => ({ ...prev, schoolName: null }));
            }
          }}
          items={schoolItems}
          placeholder={t('auth.signup.selectSchool')}
          icon="university"
          error={schoolFieldError}
          searchable
          containerStyle={styles.inlineField}
        />

        <CustomPicker
          label={t('auth.signup.grade')}
          value={formData.grade}
          onValueChange={(value) => updateField('grade', value)}
          items={gradeItems}
          placeholder={t('auth.signup.selectGrade')}
          icon="graduation-cap"
          error={errors.grade}
          containerStyle={styles.inlineField}
        />
      </View>

      <CustomPicker
        label={isHebrew ? 'שכבה / כיתה' : 'الشعبة'}
        value={formData.classSection}
        onValueChange={(value) => updateField('classSection', value)}
        items={classSectionItems}
        placeholder={isHebrew ? 'בחר/י שכבה' : 'اختر الشعبة'}
        icon="users"
        error={errors.classSection}
      />

      {schoolsLoading && (
        <Text style={styles.helperText}>{t('common.loading') || 'Loading...'}</Text>
      )}

      {!schoolsLoading && !!schoolsError && schoolItems.length === 0 && (
        <TouchableOpacity
          style={styles.retryInlineButton}
          onPress={() => setReloadSchoolsToken((value) => value + 1)}
          activeOpacity={0.85}
        >
          <FontAwesome name="refresh" size={14} color="#27ae60" />
          <Text style={styles.retryInlineButtonText}>
            {t('common.tryAgain', { defaultValue: 'إعادة تحميل المدارس' })}
          </Text>
        </TouchableOpacity>
      )}

      {!schoolsLoading && !!schoolsError && schoolItems.length > 0 && (
        <Text style={styles.helperText}>{schoolsError}</Text>
      )}

      {!schoolsLoading && !schoolItems.length && (
        <TouchableOpacity
          style={styles.retryInlineButton}
          onPress={() => setReloadSchoolsToken((value) => value + 1)}
          activeOpacity={0.85}
        >
          <FontAwesome name="refresh" size={14} color="#27ae60" />
          <Text style={styles.retryInlineButtonText}>
            {t('common.tryAgain', { defaultValue: 'ما ظهرت مدارس، اضغط لإعادة التحميل' })}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.buttonRow}>
        <CustomButton
          title={t('common.back')}
          onPress={handleBack}
          icon="arrow-right"
          variant="outline"
          fullWidth={false}
        />
        <CustomButton
          title={t('common.next')}
          onPress={handleNext}
          icon="arrow-left"
          fullWidth={false}
        />
      </View>
    </View>
  );

  const renderPasswordRequirementIcon = (isMet) => {
    if (isMet) {
      return <FontAwesome name="check-circle" size={16} color="#16a34a" />;
    }

    if (step3Submitted) {
      return <FontAwesome name="times-circle" size={16} color="#dc2626" />;
    }

    return <View style={styles.passwordRuleDot} />;
  };

  const passwordInputStyle = isHebrew ? styles.passwordInputRtl : styles.passwordInputLtr;
  const isPasswordFullyValid = passwordRequirements.every((rule) => rule.isMet);
  const isConfirmPasswordMatching =
    formData.confirmPassword.length > 0 && formData.confirmPassword === formData.password;

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={inlineRowStyle}>
        <CustomTextInput
          label={t('auth.signup.password')}
          value={formData.password}
          onChangeText={(text) => updateField('password', text)}
          placeholder={t('auth.signup.password')}
          icon="lock"
          secureTextEntry
          error={errors.password}
          success={isPasswordFullyValid}
          containerStyle={styles.inlineField}
          inputStyle={passwordInputStyle}
        />

        <CustomTextInput
          label={t('auth.signup.confirmPassword')}
          value={formData.confirmPassword}
          onChangeText={(text) => updateField('confirmPassword', text)}
          placeholder={t('auth.signup.confirmPassword')}
          icon="lock"
          secureTextEntry
          error={errors.confirmPassword}
          success={isConfirmPasswordMatching}
          containerStyle={styles.inlineField}
          inputStyle={passwordInputStyle}
        />
      </View>

      <View style={styles.passwordRulesBox}>
        <View style={[styles.passwordRulesHeader, isHebrew && styles.passwordRulesHeaderRtl]}>
          <FontAwesome name="shield" size={18} color="#15803d" />
          <Text style={styles.passwordRulesTitle}>
            {isHebrew ? 'דרישות סיסמה חזקות' : 'شروط كلمة مرور قوية'}
          </Text>
        </View>

        {passwordRequirements.map((rule) => (
          <View key={rule.key} style={[styles.passwordRuleRow, isHebrew && styles.passwordRuleRowRtl]}>
            {renderPasswordRequirementIcon(rule.isMet)}
            <Text
              style={[
                styles.passwordRuleText,
                isHebrew && styles.passwordRuleTextRtl,
                rule.isMet && styles.passwordRuleTextMet,
                !rule.isMet && step3Submitted && styles.passwordRuleTextFailed,
              ]}
            >
              {rule.label}
            </Text>
          </View>
        ))}

        {!!errors.password && (
          <Text style={[styles.passwordRulesErrorText, isHebrew && styles.passwordRuleTextRtl]}>{errors.password}</Text>
        )}
      </View>

      <View style={styles.buttonRow}>
        <CustomButton
          title={t('common.back')}
          onPress={handleBack}
          icon="arrow-right"
          variant="outline"
          fullWidth={false}
        />
        <CustomButton
          title={t('auth.signup.createAccount')}
          onPress={handleSignup}
          icon="check"
          loading={loading}
          fullWidth={false}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={['#edf9f0', '#ffffff', '#f5fcf7']}
          style={styles.pageBackdrop}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.authShell, isWideLayout && styles.authShellWide]}>
            <LinearGradient
              colors={['#1f8f50', '#27ae60', '#59d38a']}
              style={[styles.heroPanel, isWideLayout ? styles.heroPanelWide : styles.heroPanelStacked]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.heroGlowCorner, isHebrew && styles.heroGlowCornerRtl]} />

              <View style={[styles.brandChip, isHebrew && styles.brandChipRtl]}>
                <FontAwesome name="leaf" size={14} color="#27ae60" />
                <Text style={styles.brandChipText}>i3dad / إعداد</Text>
              </View>

              <View style={[styles.heroTopBlock, isHebrew && styles.heroTopBlockRtl]}>
                <View style={[styles.logoContainer, isHebrew && styles.logoContainerRtl]}>
                  <FontAwesome name="user-plus" size={50} color="#fff" />
                </View>
                <Text style={[styles.title, isHebrew && styles.heroTextRtl]}>{t('auth.signup.title')}</Text>
                <Text style={[styles.subtitle, isHebrew && styles.heroTextRtl]}>{t('auth.signup.subtitle')}</Text>
              </View>

              <View style={styles.heroCard}>
                <Text style={[styles.promoTitle, isHebrew && styles.heroTextRtl]}>{promoTitle}</Text>
                <Text style={[styles.promoSubtitle, isHebrew && styles.heroTextRtl]}>{promoSubtitle}</Text>

                <View style={[styles.promoList, isHebrew && styles.promoListRtl]}>
                  {promoPoints.map((point) => (
                    <View key={point} style={[styles.promoItem, isHebrew && styles.promoItemRtl]}>
                      <View style={styles.promoCheck}>
                        <FontAwesome name="check" size={10} color="#fff" />
                      </View>
                      <Text style={[styles.promoItemText, isHebrew && styles.heroTextRtl]}>{point}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.insightCard, isHebrew && styles.insightCardRtl]}>
                <View style={[styles.insightHeader, isHebrew && styles.insightHeaderRtl]}>
                  <View style={styles.insightArrow}>
                    <FontAwesome name="arrow-left" size={12} color="#1f8f50" />
                  </View>
                  <View style={styles.insightArrowMuted}>
                    <FontAwesome name="arrow-right" size={12} color="#ffffff" />
                  </View>
                </View>

                <Text style={[styles.insightTitle, isHebrew && styles.heroTextRtl]}>{insightTitle}</Text>
                <Text style={[styles.insightText, isHebrew && styles.heroTextRtl]}>{insightText}</Text>

                <View style={[styles.insightFooter, isHebrew && styles.insightFooterRtl]}>
                  <View style={[styles.avatarCluster, isHebrew && styles.avatarClusterRtl]}>
                    <View style={[styles.avatarDot, styles.avatarDotOne]} />
                    <View style={[styles.avatarDot, styles.avatarDotTwo]} />
                    <View style={[styles.avatarDot, styles.avatarDotThree]} />
                  </View>
                  <Text style={[styles.insightFooterText, isHebrew && styles.heroTextRtl]}>
                    {isHebrew ? 'מלווה אותך מהצעד הראשון' : 'يرافقك من أول خطوة'}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            <View style={[styles.formContainer, isWideLayout ? styles.formContainerWide : styles.formContainerStacked]}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>
                  {step === 1
                    ? t('auth.signup.personalInfo')
                    : step === 2
                      ? t('auth.signup.contactInfo')
                      : t('auth.signup.accountInfo')}
                </Text>
                <Text style={styles.formLead}>
                  {step === 1
                    ? (isHebrew
                      ? 'מלא/י את הפרטים הראשונים כדי להתחיל נכון.'
                      : 'أدخل البيانات الأساسية لبدء حسابك بشكل صحيح.')
                    : step === 2
                      ? t('auth.signup.contactDescription')
                      : t('auth.signup.passwordDescription')}
                </Text>
              </View>

              <View style={styles.stepWrap}>{renderStepIndicator()}</View>

              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>{t('auth.signup.haveAccount')} </Text>
                <TouchableOpacity onPress={() => navigateTo('login')}>
                  <Text style={styles.loginLink}>{t('auth.signup.loginLink')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.backButton} onPress={() => navigateTo('home')}>
                <FontAwesome name="arrow-right" size={16} color="#64748b" />
                <Text style={styles.backButtonText}>{t('auth.signup.backToHome')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  pageBackdrop: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
  },
  authShell: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },
  authShellWide: {
    flexDirection: 'row-reverse',
    minHeight: 780,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9efe0',
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  heroPanel: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroPanelWide: {
    flex: 0.84,
    padding: 32,
    justifyContent: 'space-between',
  },
  heroPanelStacked: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 18,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -70,
    left: -70,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.10)',
    bottom: -40,
    right: -20,
  },
  brandChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  brandChipText: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: '900',
  },
  brandChipRtl: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  heroTopBlock: {
    alignItems: 'flex-start',
  },
  heroTopBlockRtl: {
    alignItems: 'flex-end',
  },
  heroGlowCorner: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    top: -92,
    left: -78,
  },
  heroGlowCornerRtl: {
    left: undefined,
    right: -78,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
    position: 'absolute',
    top: 42,
    left: 56,
  },
  logoContainerRtl: {
    alignSelf: 'flex-end',
    left: undefined,
    right: -14,
    top: -78,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.94,
    textAlign: 'left',
    lineHeight: 24,
  },
  heroTextRtl: {
    textAlign: 'right',
  },
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  insightCard: {
    alignSelf: 'flex-start',
    width: '82%',
    maxWidth: 330,
    backgroundColor: '#ffffff',
    borderRadius: 26,
    padding: 18,
    marginTop: 18,
    shadowColor: '#0f5132',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 6,
  },
  insightCardRtl: {
    alignSelf: 'flex-end',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  insightHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  insightArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ecfdf3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightArrowMuted: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1f8f50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#19352a',
    textAlign: 'left',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 16.5,
    lineHeight: 21,
    color: '#597265',
    textAlign: 'left',
  },
  insightFooter: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightFooterRtl: {
    flexDirection: 'row-reverse',
  },
  avatarCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarClusterRtl: {
    flexDirection: 'row-reverse',
  },
  avatarDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ffffff',
    marginLeft: -6,
  },
  avatarDotOne: {
    backgroundColor: '#9ae6b4',
  },
  avatarDotTwo: {
    backgroundColor: '#68d391',
  },
  avatarDotThree: {
    backgroundColor: '#2f855a',
  },
  insightFooterText: {
    color: '#1f8f50',
    fontSize: 17.5,
    fontWeight: '800',
    textAlign: 'left',
  },
  promoTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'left',
    marginBottom: 12,
  },
  promoSubtitle: {
    fontSize: 17,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'left',
  },
  promoList: {
    marginTop: 18,
    gap: 12,
    alignItems: 'flex-start',
  },
  promoListRtl: {
    width: '100%',
    alignItems: 'stretch',
  },
  promoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  promoItemRtl: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignSelf: 'stretch',
  },
  promoCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoItemText: {
    color: '#fff',
    fontSize: 16.5,
    fontWeight: '700',
    textAlign: 'left',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 24,
  },
  formContainerWide: {
    flex: 1.16,
    padding: 38,
    justifyContent: 'center',
  },
  formContainerStacked: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e1f0e6',
    shadowColor: '#14532d',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  formHeader: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1d3557',
    textAlign: 'right',
  },
  formLead: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: '#5f7268',
    textAlign: 'right',
  },
  stepWrap: {
    marginBottom: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#27ae60',
  },
  stepCircleCompleted: {
    backgroundColor: '#27ae60',
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLine: {
    width: 44,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 6,
  },
  stepLineActive: {
    backgroundColor: '#27ae60',
  },
  stepContent: {
    marginBottom: 24,
  },
  helperText: {
    marginTop: -8,
    marginBottom: 12,
    color: '#64748b',
    fontSize: 16,
    textAlign: 'right',
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  inlineRowStacked: {
    flexDirection: 'column',
  },
  inlineField: {
    flex: 1,
  },
  retryInlineButton: {
    marginTop: -4,
    marginBottom: 12,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  retryInlineButtonText: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  passwordRulesBox: {
    backgroundColor: '#f6fff8',
    borderWidth: 1,
    borderColor: '#b7e4c7',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  passwordRulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    justifyContent: 'flex-end',
  },
  passwordRulesHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  passwordRulesTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#166534',
    textAlign: 'right',
  },
  passwordRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 10,
  },
  passwordRuleRowRtl: {
    flexDirection: 'row-reverse',
  },
  passwordRuleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  passwordRuleText: {
    fontSize: 16.5,
    color: '#64748b',
    textAlign: 'right',
  },
  passwordRuleTextRtl: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  passwordRuleTextMet: {
    color: '#166534',
    fontWeight: '700',
  },
  passwordRuleTextFailed: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  passwordRulesErrorText: {
    marginTop: 8,
    fontSize: 16,
    color: '#b91c1c',
    textAlign: 'right',
    fontWeight: '700',
  },
  passwordInputRtl: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  passwordInputLtr: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  loginText: {
    color: '#64748b',
    fontSize: 16,
  },
  loginLink: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
});
