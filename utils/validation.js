// دوال التحقق من صحة البيانات

// التحقق من البريد الإلكتروني (Gmail فقط)
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'البريد الإلكتروني مطلوب' };
  }
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'يجب أن يكون البريد الإلكتروني من Gmail (@gmail.com)' };
  }
  
  return { isValid: true, error: null };
};

// التحقق من رقم الهاتف الإسرائيلي
export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: false, error: 'رقم الهاتف مطلوب' };
  }
  
  // إزالة المسافات والشرطات
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  // التحقق من صيغة الهاتف الإسرائيلي
  // يمكن أن يبدأ بـ +972 أو 972 أو 0
  const phoneRegex = /^(\+972|972|0)(5[0-9]|[2-4]|[8-9])[0-9]{7}$/;
  
  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: 'رقم الهاتف غير صحيح. يجب أن يكون رقم هاتف إسرائيلي صحيح' };
  }
  
  return { isValid: true, error: null };
};

// تنسيق رقم الهاتف
export const formatPhone = (phone) => {
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  // تحويل إلى صيغة +972
  if (cleanPhone.startsWith('0')) {
    return '+972' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('972')) {
    return '+' + cleanPhone;
  } else if (cleanPhone.startsWith('+972')) {
    return cleanPhone;
  }
  
  return phone;
};

// التحقق من رقم الهوية
export const validateStudentId = (id) => {
  if (!id) {
    return { isValid: false, error: 'رقم الهوية مطلوب' };
  }
  
  // التحقق من أن الرقم يحتوي على 9 أرقام فقط
  const idRegex = /^[0-9]{9}$/;
  if (!idRegex.test(id)) {
    return { isValid: false, error: 'رقم الهوية يجب أن يتكون من 9 أرقام' };
  }
  
  return { isValid: true, error: null };
};

// التحقق من الاسم (يدعم العربية والعبرية والإنجليزية)
export const validateName = (name, fieldName = 'الاسم') => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: `${fieldName} مطلوب` };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: `${fieldName} يجب أن يحتوي على حرفين على الأقل` };
  }
  
  // التحقق من أن الاسم يحتوي على أحرف عربية أو عبرية أو إنجليزية فقط
  // \u0600-\u06FF = أحرف عربية
  // \u0590-\u05FF = أحرف عبرية
  // a-zA-Z = أحرف إنجليزية
  const nameRegex = /^[\u0600-\u06FF\u0590-\u05FFa-zA-Z\s]+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, error: `${fieldName} يجب أن يحتوي على أحرف عربية أو عبرية أو إنجليزية فقط` };
  }
  
  return { isValid: true, error: null };
};

// الحصول على لغة الاسم
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

// التحقق من تطابق لغة الاسم الأول والأخير
export const validateNamesLanguageMatch = (firstName, lastName) => {
  if (!firstName || !lastName) {
    return { isValid: true, error: null }; // سيتم التحقق من الفراغات في validateName
  }
  
  const firstNameLang = getNameLanguage(firstName);
  const lastNameLang = getNameLanguage(lastName);
  
  if (!firstNameLang || !lastNameLang) {
    return { isValid: true, error: null };
  }
  
  if (firstNameLang !== lastNameLang) {
    let message = '';
    if (firstNameLang === 'arabic' && lastNameLang === 'hebrew') {
      message = 'الاسم الأول بالعربية والاسم الأخير بالعبرية. يجب استخدام نفس اللغة للاسمين';
    } else if (firstNameLang === 'hebrew' && lastNameLang === 'arabic') {
      message = 'الاسم الأول بالعبرية والاسم الأخير بالعربية. يجب استخدام نفس اللغة للاسمين';
    } else if (firstNameLang === 'english') {
      message = 'الاسم الأول بالإنجليزية والاسم الأخير بلغة أخرى. يجب استخدام نفس اللغة للاسمين';
    } else if (lastNameLang === 'english') {
      message = 'الاسم الأخير بالإنجليزية والاسم الأول بلغة أخرى. يجب استخدام نفس اللغة للاسمين';
    } else {
      message = 'يجب أن يكون الاسم الأول والأخير بنفس اللغة (عربية، عبرية، أو إنجليزية)';
    }
    
    return { isValid: false, error: message };
  }
  
  return { isValid: true, error: null };
};

// التحقق من كلمة المرور القوية
export const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return {
      isValid: false,
      error: 'كلمة المرور مطلوبة',
    };
  }

  // الحد الأدنى 8 أحرف
  if (password.length < 8) {
    return {
      isValid: false,
      error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
    };
  }

  // يجب أن تحتوي على حرف كبير واحد على الأقل
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)',
    };
  }

  // يجب أن تحتوي على حرف صغير واحد على الأقل
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)',
    };
  }

  // يجب أن تحتوي على رقم واحد على الأقل
  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)',
    };
  }

  // يجب أن تحتوي على رمز خاص واحد على الأقل
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password)) {
    return {
      isValid: false,
      error: 'كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*)',
    };
  }

  return {
    isValid: true,
    error: null,
  };
};

// حساب قوة كلمة المرور (اختياري - للعرض البصري)
export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: '', color: '' };
  
  let strength = 0;
  
  // الطول
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;
  
  // أحرف كبيرة
  if (/[A-Z]/.test(password)) strength += 15;
  
  // أحرف صغيرة
  if (/[a-z]/.test(password)) strength += 15;
  
  // أرقام
  if (/[0-9]/.test(password)) strength += 15;
  
  // رموز خاصة
  if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password)) strength += 15;
  
  // مجموعات متنوعة
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password);
  const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (varietyCount === 4) strength += 20;
  else if (varietyCount === 3) strength += 10;
  
  // تحديد التصنيف
  if (strength < 40) {
    return { strength, label: 'ضعيفة', color: '#e74c3c' };
  } else if (strength < 70) {
    return { strength, label: 'متوسطة', color: '#f39c12' };
  } else if (strength < 90) {
    return { strength, label: 'جيدة', color: '#3498db' };
  } else {
    return { strength, label: 'قوية جداً', color: '#27ae60' };
  }
};

// التحقق من تاريخ الميلاد
export const validateBirthday = (birthday) => {
  if (!birthday) {
    return { isValid: false, error: 'تاريخ الميلاد مطلوب' };
  }
  
  const birthDate = new Date(birthday);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  
  // التحقق من أن العمر بين 14 و 20 سنة (طلاب الصفوف 9-12)
  if (age < 14 || age > 20) {
    return { isValid: false, error: 'يجب أن يكون عمرك بين 14 و 20 سنة' };
  }
  
  return { isValid: true, error: null };
};

// التحقق من الصف الدراسي
export const validateGrade = (grade) => {
  if (!grade) {
    return { isValid: false, error: 'الصف الدراسي مطلوب' };
  }
  
  const gradeNum = parseInt(grade);
  if (gradeNum < 9 || gradeNum > 12) {
    return { isValid: false, error: 'الصف الدراسي يجب أن يكون بين 9 و 12' };
  }
  
  return { isValid: true, error: null };
};

// التحقق من المدرسة
export const validateSchool = (school) => {
  if (!school) {
    return { isValid: false, error: 'المدرسة مطلوبة' };
  }
  
  return { isValid: true, error: null };
};

// التحقق من تطابق كلمة المرور
export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return { isValid: false, error: 'كلمات المرور غير متطابقة' };
  }
  
  return { isValid: true, error: null };
};
