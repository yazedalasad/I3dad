import i18n from '../i18n';
import { isValidIsraeliId, normalizeIsraeliId } from '../src/utils/israeliId';

const isHebrew = () => String(i18n?.language || '').toLowerCase().startsWith('he');
const isArabic = () => String(i18n?.language || '').toLowerCase().startsWith('ar');

const text = {
  requiredEmail: () => (isHebrew() ? 'האימייל הוא שדה חובה' : 'البريد الإلكتروني مطلوب'),
  invalidEmail: () =>
    isHebrew()
      ? 'האימייל חייב להיות חשבון Gmail (@gmail.com)'
      : 'يجب أن يكون البريد الإلكتروني من Gmail (@gmail.com)',
  requiredPhone: () => (isHebrew() ? 'מספר הטלפון הוא שדה חובה' : 'رقم الهاتف مطلوب'),
  invalidPhone: () =>
    isHebrew()
      ? 'מספר הטלפון אינו תקין. יש להזין מספר טלפון ישראלי תקין'
      : 'رقم الهاتف غير صحيح. يجب أن يكون رقم هاتف إسرائيلي صحيح',
  requiredId: () => (isHebrew() ? 'מספר הזהות הוא שדה חובה' : 'رقم الهوية مطلوب'),
  invalidId: () =>
    isHebrew()
      ? 'מספר הזהות חייב להכיל 9 ספרות'
      : 'رقم الهوية يجب أن يتكون من 9 أرقام',
  invalidIsraeliId: () =>
    isHebrew()
      ? 'מספר תעודת הזהות אינו תקין'
      : isArabic()
        ? 'رقم الهوية غير صحيح'
        : 'Invalid Israeli ID number',
  requiredField: (fieldName) =>
    isHebrew() ? `${fieldName} הוא שדה חובה` : `${fieldName} مطلوب`,
  minNameLength: (fieldName) =>
    isHebrew()
      ? `${fieldName} חייב להכיל לפחות 2 תווים`
      : `${fieldName} يجب أن يحتوي على حرفين على الأقل`,
  invalidNameChars: (fieldName) =>
    isHebrew()
      ? `${fieldName} חייב להכיל אותיות בערבית, עברית או אנגלית בלבד`
      : `${fieldName} يجب أن يحتوي على أحرف عربية أو عبرية أو إنجليزية فقط`,
  languageMismatchArabicHebrew: () =>
    isHebrew()
      ? 'השם הפרטי בערבית ושם המשפחה בעברית. יש להשתמש באותה שפה בשני השמות'
      : 'الاسم الأول بالعربية والاسم الأخير بالعبرية. يجب استخدام نفس اللغة للاسمين',
  languageMismatchHebrewArabic: () =>
    isHebrew()
      ? 'השם הפרטי בעברית ושם המשפחה בערבית. יש להשתמש באותה שפה בשני השמות'
      : 'الاسم الأول بالعبرية والاسم الأخير بالعربية. يجب استخدام نفس اللغة للاسمين',
  languageMismatchFirstEnglish: () =>
    isHebrew()
      ? 'השם הפרטי באנגלית ושם המשפחה בשפה אחרת. יש להשתמש באותה שפה בשני השמות'
      : 'الاسم الأول بالإنجليزية والاسم الأخير بلغة أخرى. يجب استخدام نفس اللغة للاسمين',
  languageMismatchLastEnglish: () =>
    isHebrew()
      ? 'שם המשפחה באנגלית והשם הפרטי בשפה אחרת. יש להשתמש באותה שפה בשני השמות'
      : 'الاسم الأخير بالإنجليزية والاسم الأول بلغة أخرى. يجب استخدام نفس اللغة للاسمين',
  languageMismatchGeneric: () =>
    isHebrew()
      ? 'השם הפרטי ושם המשפחה חייבים להיות באותה שפה (ערבית, עברית או אנגלית)'
      : 'يجب أن يكون الاسم الأول والأخير بنفس اللغة (عربية، عبرية، أو إنجليزية)',
  requiredPassword: () => (isHebrew() ? 'הסיסמה היא שדה חובה' : 'كلمة المرور مطلوبة'),
  passwordLength: () =>
    isHebrew()
      ? 'הסיסמה חייבת להכיל לפחות 10 תווים'
      : 'كلمة المرور يجب أن تكون 10 أحرف على الأقل',
  passwordNoSpaces: () =>
    isHebrew() ? 'הסיסמה לא יכולה להכיל רווחים' : 'كلمة المرور لا يمكن أن تحتوي على مسافات',
  passwordUpper: () =>
    isHebrew()
      ? 'הסיסמה חייבת להכיל לפחות אות גדולה אחת (A-Z)'
      : 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)',
  passwordLower: () =>
    isHebrew()
      ? 'הסיסמה חייבת להכיל לפחות אות קטנה אחת (a-z)'
      : 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)',
  passwordNumber: () =>
    isHebrew()
      ? 'הסיסמה חייבת להכיל לפחות מספר אחד (0-9)'
      : 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)',
  passwordSpecial: () =>
    isHebrew()
      ? 'הסיסמה חייבת להכיל לפחות תו מיוחד אחד (!@#$%^&*)'
      : 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*)',
  strengthWeak: () => (isHebrew() ? 'חלשה' : 'ضعيفة'),
  strengthMedium: () => (isHebrew() ? 'בינונית' : 'متوسطة'),
  strengthGood: () => (isHebrew() ? 'טובה' : 'جيدة'),
  strengthStrong: () => (isHebrew() ? 'חזקה מאוד' : 'قوية جدًا'),
  requiredBirthday: () => (isHebrew() ? 'תאריך הלידה הוא שדה חובה' : 'تاريخ الميلاد مطلوب'),
  invalidBirthdayAge: () =>
    isHebrew()
      ? 'הגיל שלך חייב להיות בין 14 ל-20'
      : 'يجب أن يكون عمرك بين 14 و 20 سنة',
  requiredGrade: () => (isHebrew() ? 'הכיתה היא שדה חובה' : 'الصف الدراسي مطلوب'),
  invalidGrade: () =>
    isHebrew()
      ? 'הכיתה חייבת להיות בין 9 ל-12'
      : 'الصف الدراسي يجب أن يكون بين 9 و 12',
  requiredSchool: () => (isHebrew() ? 'בית הספר הוא שדה חובה' : 'المدرسة مطلوبة'),
  passwordsNotMatch: () =>
    isHebrew() ? 'הסיסמאות אינן תואמות' : 'كلمات المرور غير متطابقة',
};

export const validateEmail = (email) => {
  if (!email) return { isValid: false, error: text.requiredEmail() };
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) return { isValid: false, error: text.invalidEmail() };
  return { isValid: true, error: null };
};

export const validatePhone = (phone) => {
  if (!phone) return { isValid: false, error: text.requiredPhone() };
  const cleanPhone = phone.replace(/[\s-]/g, '');
  const phoneRegex = /^(\+972|972|0)(5[0-9]|[2-4]|[8-9])[0-9]{7}$/;
  if (!phoneRegex.test(cleanPhone)) return { isValid: false, error: text.invalidPhone() };
  return { isValid: true, error: null };
};

export const formatPhone = (phone) => {
  const cleanPhone = phone.replace(/[\s-]/g, '');
  if (cleanPhone.startsWith('0')) return `+972${cleanPhone.substring(1)}`;
  if (cleanPhone.startsWith('972')) return `+${cleanPhone}`;
  if (cleanPhone.startsWith('+972')) return cleanPhone;
  return phone;
};

export const validateStudentId = (id) => {
  const digitsOnly = String(id || '').replace(/\D/g, '');
  if (!digitsOnly) return { isValid: false, error: text.requiredId() };
  if (digitsOnly.length > 9) return { isValid: false, error: text.invalidId() };
  const normalizedId = normalizeIsraeliId(id);
  if (!/^[0-9]{9}$/.test(normalizedId)) return { isValid: false, error: text.invalidId() };
  if (!isValidIsraeliId(normalizedId)) return { isValid: false, error: text.invalidIsraeliId() };
  return { isValid: true, error: null, normalizedId };
};

export const validateName = (name, fieldName = isHebrew() ? 'שם' : 'الاسم') => {
  if (!name || name.trim().length === 0) return { isValid: false, error: text.requiredField(fieldName) };
  if (name.trim().length < 2) return { isValid: false, error: text.minNameLength(fieldName) };
  const nameRegex = /^[\u0600-\u06FF\u0590-\u05FFa-zA-Z\s]+$/;
  if (!nameRegex.test(name)) return { isValid: false, error: text.invalidNameChars(fieldName) };
  return { isValid: true, error: null };
};

export const getNameLanguage = (name) => {
  if (!name) return null;
  const hasArabic = /[\u0600-\u06FF]/.test(name);
  const hasHebrew = /[\u0590-\u05FF]/.test(name);
  const hasEnglish = /[a-zA-Z]/.test(name);
  if (hasArabic) return 'arabic';
  if (hasHebrew) return 'hebrew';
  if (hasEnglish) return 'english';
  return null;
};

export const validateNamesLanguageMatch = (firstName, lastName) => {
  if (!firstName || !lastName) return { isValid: true, error: null };
  const firstNameLang = getNameLanguage(firstName);
  const lastNameLang = getNameLanguage(lastName);
  if (!firstNameLang || !lastNameLang) return { isValid: true, error: null };
  if (firstNameLang !== lastNameLang) {
    if (firstNameLang === 'arabic' && lastNameLang === 'hebrew') {
      return { isValid: false, error: text.languageMismatchArabicHebrew() };
    }
    if (firstNameLang === 'hebrew' && lastNameLang === 'arabic') {
      return { isValid: false, error: text.languageMismatchHebrewArabic() };
    }
    if (firstNameLang === 'english') {
      return { isValid: false, error: text.languageMismatchFirstEnglish() };
    }
    if (lastNameLang === 'english') {
      return { isValid: false, error: text.languageMismatchLastEnglish() };
    }
    return { isValid: false, error: text.languageMismatchGeneric() };
  }
  return { isValid: true, error: null };
};

export const validatePassword = (password) => {
  if (!password || password.trim() === '') return { isValid: false, error: text.requiredPassword() };
  if (password.length < 10) return { isValid: false, error: text.passwordLength() };
  if (!/[A-Z]/.test(password)) return { isValid: false, error: text.passwordUpper() };
  if (!/[a-z]/.test(password)) return { isValid: false, error: text.passwordLower() };
  if (!/[0-9]/.test(password)) return { isValid: false, error: text.passwordNumber() };
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/~`]/.test(password)) {
    return { isValid: false, error: text.passwordSpecial() };
  }
  if (/\s/.test(password)) return { isValid: false, error: text.passwordNoSpaces() };
  return { isValid: true, error: null };
};

/** Login only — password must be present, not meet signup strength rules. */
export const validateLoginPassword = (password) => {
  if (!password || password.trim() === '') {
    return { isValid: false, error: text.requiredPassword() };
  }
  return { isValid: true, error: null };
};

export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: '', color: '' };
  let strength = 0;
  if (password.length >= 10) strength += 20;
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[a-z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/~`]/.test(password)) strength += 15;
  if (!/\s/.test(password)) strength += 15;
  const varietyCount = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/~`]/.test(password),
  ].filter(Boolean).length;
  if (varietyCount === 4) strength += 20;
  else if (varietyCount === 3) strength += 10;
  if (strength < 40) return { strength, label: text.strengthWeak(), color: '#e74c3c' };
  if (strength < 70) return { strength, label: text.strengthMedium(), color: '#f39c12' };
  if (strength < 90) return { strength, label: text.strengthGood(), color: '#3498db' };
  return { strength, label: text.strengthStrong(), color: '#27ae60' };
};

export const validateBirthday = (birthday) => {
  if (!birthday) return { isValid: false, error: text.requiredBirthday() };
  const birthDate = new Date(birthday);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  if (age < 14 || age > 20) return { isValid: false, error: text.invalidBirthdayAge() };
  return { isValid: true, error: null };
};

export const validateGrade = (grade) => {
  if (!grade) return { isValid: false, error: text.requiredGrade() };
  const gradeNum = parseInt(grade, 10);
  if (gradeNum < 9 || gradeNum > 12) return { isValid: false, error: text.invalidGrade() };
  return { isValid: true, error: null };
};

export const validateSchool = (school) => {
  if (!school) return { isValid: false, error: text.requiredSchool() };
  return { isValid: true, error: null };
};

export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) return { isValid: false, error: text.passwordsNotMatch() };
  return { isValid: true, error: null };
};
