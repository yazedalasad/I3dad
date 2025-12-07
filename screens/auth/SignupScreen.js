import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/Form/CustomButton';
import CustomPicker from '../../components/Form/CustomPicker';
import CustomTextInput from '../../components/Form/CustomTextInput';
import DatePicker from '../../components/Form/DatePicker';
import { useAuth } from '../../contexts/AuthContext';
import { israeliSchools } from '../../data/israeliSchools';
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
  validateStudentId
} from '../../utils/validation';

export default function SignupScreen({ navigateTo }) {
  const { signUp } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthday: '',
    schoolName: '',
    grade: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validateStep1 = () => {
  const newErrors = {};

  const studentIdValidation = validateStudentId(formData.studentId);
  if (!studentIdValidation.isValid) {
    newErrors.studentId = studentIdValidation.error;
  }

  const firstNameValidation = validateName(formData.firstName, t('auth.signup.firstName'));
  if (!firstNameValidation.isValid) {
    newErrors.firstName = firstNameValidation.error;
  }

  const lastNameValidation = validateName(formData.lastName, t('auth.signup.lastName'));
  if (!lastNameValidation.isValid) {
    newErrors.lastName = lastNameValidation.error;
  }

  // NEW: Check that both names use the same language
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

    const schoolValidation = validateSchool(formData.schoolName);
    if (!schoolValidation.isValid) {
      newErrors.schoolName = schoolValidation.error;
    }

    const gradeValidation = validateGrade(formData.grade);
    if (!gradeValidation.isValid) {
      newErrors.grade = gradeValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
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
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    }
  };

  const handleSignup = async () => {
  if (!validateStep3()) {
    return;
  }

  setLoading(true);

  const studentInfo = {
    studentId: formData.studentId,
    firstName: formData.firstName,
    lastName: formData.lastName,
    phone: formatPhone(formData.phone),
    birthday: formData.birthday,
    schoolName: formData.schoolName,
    grade: parseInt(formData.grade),
  };

  const { data, error } = await signUp(formData.email, formData.password, studentInfo);
  setLoading(false);

  if (error) {
    let errorMessage = t('auth.signup.errors.generic');

    if (error.message.includes('already registered')) {
      errorMessage = t('auth.signup.errors.emailExists');
    } else if (error.message.includes('Password')) {
      errorMessage = t('auth.signup.errors.weakPassword');
    }

    Alert.alert(t('common.error'), errorMessage);
  } else {
    
    navigateTo('login');
    
    // Show success message after a brief delay
    setTimeout(() => {
      Alert.alert(
        t('auth.signup.success.title'),
        t('auth.signup.success.message')
      );
    }, 500);
  }
};

  const schoolItems = israeliSchools.map((school) => ({
    label: school.name,
    value: school.name,
  }));

  const gradeItems = [
    { label: 'الصف التاسع', value: '9' },
    { label: 'الصف العاشر', value: '10' },
    { label: 'الصف الحادي عشر', value: '11' },
    { label: 'الصف الثاني عشر', value: '12' },
  ];

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
              <Text
                style={[
                  styles.stepNumber,
                  step >= stepNum && styles.stepNumberActive,
                ]}
              >
                {stepNum}
              </Text>
            )}
          </View>
          {stepNum < 3 && (
            <View
              style={[
                styles.stepLine,
                step > stepNum && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t('auth.signup.personalInfo')}</Text>
      <Text style={styles.stepDescription}>
        {t('auth.signup.subtitle')}
      </Text>

      <CustomTextInput
        label={t('auth.signup.studentId')}
        value={formData.studentId}
        onChangeText={(text) => updateField('studentId', text)}
        placeholder="123456789"
        icon="id-card"
        keyboardType="numeric"
        maxLength={9}
        error={errors.studentId}
      />

      <CustomTextInput
        label={t('auth.signup.firstName')}
        value={formData.firstName}
        onChangeText={(text) => updateField('firstName', text)}
        placeholder="אחמד"
        icon="user"
        error={errors.firstName}
      />

      <CustomTextInput
        label={t('auth.signup.lastName')}
        value={formData.lastName}
        onChangeText={(text) => updateField('lastName', text)}
        placeholder="חסן"
        icon="users"
        error={errors.lastName}
      />

      <CustomTextInput
        label={t('auth.signup.email')}
        value={formData.email}
        onChangeText={(text) => updateField('email', text)}
        placeholder="example@gmail.com"
        icon="envelope"
        keyboardType="email-address"
        error={errors.email}
      />

      <CustomButton
        title={t('common.next')}
        onPress={handleNext}
        icon="arrow-left"
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t('auth.signup.contactInfo')}</Text>
      <Text style={styles.stepDescription}>
        {t('auth.signup.contactDescription')}
      </Text>

      <CustomTextInput
        label={t('auth.signup.phone')}
        value={formData.phone}
        onChangeText={(text) => updateField('phone', text)}
        placeholder="+972501234567"
        icon="phone"
        keyboardType="phone-pad"
        error={errors.phone}
      />

      <DatePicker
        label={t('auth.signup.birthday')}
        value={formData.birthday}
        onValueChange={(date) => updateField('birthday', date)}
        icon="calendar"
        error={errors.birthday}
      />

      <CustomPicker
        label={t('auth.signup.school')}
        value={formData.schoolName}
        onValueChange={(value) => updateField('schoolName', value)}
        items={schoolItems}
        placeholder={t('auth.signup.selectSchool')}
        icon="university"
        error={errors.schoolName}
        searchable
      />

      <CustomPicker
        label={t('auth.signup.grade')}
        value={formData.grade}
        onValueChange={(value) => updateField('grade', value)}
        items={gradeItems}
        placeholder={t('auth.signup.selectGrade')}
        icon="graduation-cap"
        error={errors.grade}
      />

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

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t('auth.signup.accountInfo')}</Text>
      <Text style={styles.stepDescription}>
        {t('auth.signup.passwordDescription')}
      </Text>

      <CustomTextInput
        label={t('auth.signup.password')}
        value={formData.password}
        onChangeText={(text) => updateField('password', text)}
        placeholder={t('auth.signup.password')}
        icon="lock"
        secureTextEntry
        error={errors.password}
      />

      <CustomTextInput
        label={t('auth.signup.confirmPassword')}
        value={formData.confirmPassword}
        onChangeText={(text) => updateField('confirmPassword', text)}
        placeholder={t('auth.signup.confirmPassword')}
        icon="lock"
        secureTextEntry
        error={errors.confirmPassword}
      />

      <View style={styles.infoBox}>
        <FontAwesome name="info-circle" size={20} color="#3498db" />
        <Text style={styles.infoText}>
          {t('auth.resetPassword.info')}
        </Text>
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#27ae60', '#2ecc71']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.logoContainer}>
            <FontAwesome name="user-plus" size={50} color="#fff" />
          </View>
          <Text style={styles.title}>{t('auth.signup.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.signup.subtitle')}</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          {renderStepIndicator()}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{t('auth.signup.haveAccount')} </Text>
            <TouchableOpacity onPress={() => navigateTo('login')}>
              <Text style={styles.loginLink}>{t('auth.signup.loginLink')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigateTo('home')}
          >
            <FontAwesome name="arrow-right" size={16} color="#64748b" />
            <Text style={styles.backButtonText}>{t('auth.signup.backToHome')}</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#27ae60',
  },
  stepContent: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'right',
  },
  stepDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#3498db',
    textAlign: 'right',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  loginText: {
    color: '#64748b',
    fontSize: 16,
  },
  loginLink: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 14,
  },
});
