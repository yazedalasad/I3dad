import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  CLASS_SECTION_DEFAULT,
  getClassSectionLabel,
  getClassSectionOptions,
  normalizeClassSection,
} from '../../utils/classSections';
import { isValidIsraeliId, normalizeIsraeliId } from '../../src/utils/israeliId';

const gradeOptions = ['9', '10', '11', '12'];
const genderOptions = ['male', 'female'];
const AVATAR_BUCKET = 'avatars';
const AVATAR_COLUMN = 'avatar_url';
const hasIsraeliIdDigits = (value) => String(value || '').replace(/\D/g, '').length > 0;

export default function EditStudentProfileScreen({ navigateTo }) {
  const { i18n } = useTranslation();
  const { studentData, updateStudentData, user, refreshUserData } = useAuth();

  const isArabic = String(i18n?.language || '').toLowerCase().startsWith('ar');
  const isHebrew = String(i18n?.language || '').toLowerCase().startsWith('he');

  const copy = isHebrew
    ? {
        title: 'עריכת פרופיל',
        profilePhoto: 'תמונת פרופיל',
        webPhotoHint: 'בחר/י תמונה מהמחשב',
        mobilePhotoHint: 'בחר/י תמונה מהטלפון',
        uploading: 'מעלה...',
        change: 'שינוי',
        account: 'חשבון',
        email: 'אימייל',
        studentId: 'תעודת זהות',
        details: 'הפרטים שלך',
        firstName: 'שם פרטי',
        lastName: 'שם משפחה',
        phone: 'טלפון',
        school: 'בית ספר',
        selectSchool: 'בחר/י בית ספר',
        grade: 'כיתה',
        birthday: 'תאריך לידה (YYYY-MM-DD)',
        gender: 'מגדר',
        male: 'זכר',
        female: 'נקבה',
        fixTitle: 'יש לתקן את הנתונים',
        fixMessage: 'נא למלא את כל השדות הנדרשים בצורה תקינה.',
        error: 'שגיאה',
        saved: 'נשמר',
        savedMessage: 'הפרופיל עודכן בהצלחה.',
        save: 'שמירת שינויים',
        saving: 'שומר...',
      }
    : isArabic
      ? {
          title: 'تعديل الحساب',
          profilePhoto: 'صورة الحساب',
          webPhotoHint: 'اختر صورة من الكمبيوتر',
          mobilePhotoHint: 'اختر صورة من الهاتف',
          uploading: 'جارٍ الرفع...',
          change: 'تغيير',
          account: 'الحساب',
          email: 'البريد الإلكتروني',
          studentId: 'رقم الهوية',
          details: 'بياناتك',
          firstName: 'الاسم الأول',
          lastName: 'اسم العائلة',
          phone: 'الهاتف',
          school: 'المدرسة',
          selectSchool: 'اختر المدرسة',
          grade: 'الصف',
          birthday: 'تاريخ الميلاد (YYYY-MM-DD)',
          gender: 'الجنس',
          male: 'ذكر',
          female: 'أنثى',
          fixTitle: 'صحح البيانات',
          fixMessage: 'يرجى تعبئة كل الحقول المطلوبة بشكل صحيح.',
          error: 'خطأ',
          saved: 'تم الحفظ',
          savedMessage: 'تم تحديث الحساب بنجاح.',
          save: 'حفظ التغييرات',
          saving: 'جارٍ الحفظ...',
        }
      : {
          title: 'Edit Profile',
          profilePhoto: 'Profile photo',
          webPhotoHint: 'Choose an image from your computer',
          mobilePhotoHint: 'Choose an image from your phone',
          uploading: 'Uploading...',
          change: 'Change',
          account: 'Account',
          email: 'Email',
          studentId: 'Student ID',
          details: 'Your details',
          firstName: 'First name',
          lastName: 'Last name',
          phone: 'Phone',
          school: 'School',
          selectSchool: 'Select school',
          grade: 'Grade',
          birthday: 'Birth date (YYYY-MM-DD)',
          gender: 'Gender',
          male: 'Male',
          female: 'Female',
          fixTitle: 'Fix your data',
          fixMessage: 'Please fill all required fields correctly.',
          error: 'Error',
          saved: 'Saved',
          savedMessage: 'Your profile was updated successfully.',
          save: 'Save changes',
          saving: 'Saving...',
        };
  const invalidIsraeliIdMessage = isHebrew
    ? 'מספר תעודת הזהות אינו תקין'
    : isArabic
      ? 'رقم الهوية غير صحيح'
      : 'Invalid Israeli ID number';

  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState([]);
  const [showSchools, setShowSchools] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    first_name: '',
    last_name: '',
    phone: '',
    school_name: '',
    grade: '',
    class_section: CLASS_SECTION_DEFAULT,
    birthday: '',
    gender: '',
  });

  useEffect(() => {
    if (user?.id) {
      refreshUserData?.(user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!studentData) return;

    const url =
      (studentData?.[AVATAR_COLUMN] ||
        studentData?.avatar_url ||
        studentData?.image_url ||
        studentData?.profile_image_url ||
        '')?.toString() || '';

    setAvatarUrl(url);
    setForm((prev) => ({
      ...prev,
      student_id: prev.student_id || (studentData?.student_id || studentData?.identity_number || ''),
      first_name: prev.first_name || (studentData?.first_name || ''),
      last_name: prev.last_name || (studentData?.last_name || ''),
      phone: prev.phone || (studentData?.phone || ''),
      school_name: prev.school_name || (studentData?.school_name || ''),
      grade: prev.grade || (studentData?.grade ? String(studentData.grade) : ''),
      class_section:
        prev.class_section ||
        normalizeClassSection(studentData?.class_section || studentData?.classSection),
      birthday: prev.birthday || (studentData?.birthday || ''),
      gender: prev.gender || (studentData?.gender || ''),
    }));
  }, [studentData]);

  useEffect(() => {
    const metadata = user?.user_metadata || {};
    const fullName = String(metadata.full_name || metadata.name || '').trim();
    const [firstName = '', ...lastParts] = fullName.split(/\s+/).filter(Boolean);
    const lastName = lastParts.join(' ');

    setForm((prev) => ({
      ...prev,
      first_name: prev.first_name || metadata.first_name || firstName || '',
      student_id: prev.student_id || metadata.student_id || metadata.studentId || '',
      last_name: prev.last_name || metadata.last_name || lastName || '',
      phone: prev.phone || metadata.phone || '',
    }));
  }, [user?.user_metadata]);

  useEffect(() => {
    const loadSchools = async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('name_ar')
        .eq('is_active', true)
        .order('name_ar');

      if (!error && data) setSchools(data.map((school) => school.name_ar));
    };

    loadSchools();
  }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isValidDate = (value) => {
    if (!value || typeof value !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  };

  const resolved = useMemo(
    () => ({
      first_name: (form.first_name.trim() || studentData?.first_name || '').trim(),
      student_id: normalizeIsraeliId(form.student_id || studentData?.student_id || studentData?.identity_number || ''),
      last_name: (form.last_name.trim() || studentData?.last_name || '').trim(),
      phone: (form.phone.trim() || studentData?.phone || '').trim(),
      school_name: (form.school_name || studentData?.school_name || '').trim(),
      grade: String(form.grade || studentData?.grade || '').trim(),
      class_section: normalizeClassSection(form.class_section || studentData?.class_section),
      birthday: String(form.birthday || studentData?.birthday || '').trim(),
      gender: String(form.gender || studentData?.gender || '').trim().toLowerCase(),
    }),
    [form, studentData]
  );

  const canSave = useMemo(
    () =>
      resolved.first_name.length > 0 &&
      hasIsraeliIdDigits(form.student_id || studentData?.student_id || studentData?.identity_number) &&
      isValidIsraeliId(resolved.student_id) &&
      resolved.last_name.length > 0 &&
      resolved.school_name.length > 0 &&
      gradeOptions.includes(String(resolved.grade)) &&
      !!resolved.class_section &&
      isValidDate(resolved.birthday) &&
      genderOptions.includes(String(resolved.gender)),
    [form.student_id, resolved, studentData?.identity_number, studentData?.student_id]
  );

  const uploadAvatar = async ({ uri, file }) => {
    const userId = user?.id || studentData?.user_id || 'unknown';

    let body;
    let contentType = 'image/jpeg';
    let ext = 'jpg';

    if (Platform.OS === 'web') {
      if (!file) throw new Error('No file selected');
      contentType = file.type || 'image/jpeg';
      if (contentType.includes('png')) ext = 'png';
      else if (contentType.includes('webp')) ext = 'webp';
      body = file;
    } else {
      if (!uri) throw new Error('No image uri');
      const response = await fetch(uri);
      const blob = await response.blob();
      contentType = blob.type || 'image/jpeg';
      if (contentType.includes('png')) ext = 'png';
      else if (contentType.includes('webp')) ext = 'webp';
      const arrayBuffer = await blob.arrayBuffer();
      body = new Uint8Array(arrayBuffer);
    }

    const path = `students/${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, body, { upsert: true, contentType });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('No public URL returned.');

    const { error: saveError } = await updateStudentData({ [AVATAR_COLUMN]: publicUrl });
    if (saveError) throw saveError;

    setAvatarUrl(publicUrl);
    return publicUrl;
  };

  const pickAvatarMobile = async () => {
    const ImagePicker = await import('expo-image-picker');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(copy.error, copy.mobilePhotoHint);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    await uploadAvatar({ uri: asset.uri });
  };

  const pickAvatarWeb = async () => {
    if (typeof document === 'undefined') return;

    await new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        try {
          const file = input.files?.[0];
          if (file) await uploadAvatar({ file });
        } finally {
          resolve();
        }
      };
      input.click();
    });
  };

  const handlePickAvatar = async () => {
    try {
      setAvatarUploading(true);
      if (Platform.OS === 'web') await pickAvatarWeb();
      else await pickAvatarMobile();
    } catch (e) {
      Alert.alert(copy.error, e?.message || copy.error);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert(copy.fixTitle, copy.fixMessage);
      return;
    }

    setSaving(true);

    const updates = {
      first_name: resolved.first_name,
      student_id: resolved.student_id,
      last_name: resolved.last_name,
      phone: resolved.phone,
      school_name: resolved.school_name,
      grade: parseInt(resolved.grade, 10),
      class_section: normalizeClassSection(resolved.class_section),
      birthday: resolved.birthday,
      gender: resolved.gender,
      ...(avatarUrl ? { [AVATAR_COLUMN]: avatarUrl } : {}),
    };

    const { error } = await updateStudentData(updates);
    setSaving(false);

    if (error) {
      Alert.alert(copy.error, error.message || copy.error);
      return;
    }

    Alert.alert(copy.saved, copy.savedMessage);
    navigateTo('profile');
  };

  const Field = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    autoCapitalize = 'none',
    error,
  }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        style={[styles.input, styles.inputText]}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo('profile')}>
              <FontAwesome name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>{copy.title}</Text>
            <View style={{ width: 42 }} />
          </View>

          <View style={styles.avatarCard}>
            <View style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <FontAwesome name="user" size={26} color="#27ae60" />
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.avatarTitle}>{copy.profilePhoto}</Text>
              <Text style={styles.avatarHint}>
                {Platform.OS === 'web' ? copy.webPhotoHint : copy.mobilePhotoHint}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.avatarBtn, avatarUploading && { opacity: 0.6 }]}
              onPress={handlePickAvatar}
              disabled={avatarUploading}
              activeOpacity={0.9}
            >
              <FontAwesome name="camera" size={16} color="#0F172A" />
              <Text style={styles.avatarBtnText}>
                {avatarUploading ? copy.uploading : copy.change}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{copy.account}</Text>

            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>{copy.email}</Text>
              <Text style={styles.readOnlyValue}>{user?.email || '-'}</Text>
            </View>

            <Field
              label={copy.studentId}
              value={form.student_id}
              onChangeText={(v) => setField('student_id', v.replace(/[^\d\s-]/g, ''))}
              placeholder={studentData?.student_id || '123456789'}
              keyboardType="number-pad"
              error={hasIsraeliIdDigits(form.student_id) && !isValidIsraeliId(form.student_id) ? invalidIsraeliIdMessage : ''}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{copy.details}</Text>

            <Field
              label={copy.firstName}
              value={form.first_name}
              onChangeText={(v) => setField('first_name', v)}
              placeholder={studentData?.first_name || copy.firstName}
              autoCapitalize="words"
            />
            <Field
              label={copy.lastName}
              value={form.last_name}
              onChangeText={(v) => setField('last_name', v)}
              placeholder={studentData?.last_name || copy.lastName}
              autoCapitalize="words"
            />
            <Field
              label={copy.phone}
              value={form.phone}
              onChangeText={(v) => setField('phone', v)}
              placeholder={studentData?.phone || copy.phone}
              keyboardType="phone-pad"
            />

            <View style={styles.field}>
              <Text style={styles.label}>{copy.school}</Text>
              <TouchableOpacity
                style={[styles.input, styles.selectInput]}
                onPress={() => setShowSchools(!showSchools)}
                activeOpacity={0.9}
              >
                <Text style={{ color: resolved.school_name ? '#fff' : '#64748b' }}>
                  {resolved.school_name || copy.selectSchool}
                </Text>
              </TouchableOpacity>

              {showSchools && (
                <View style={styles.dropdown}>
                  {schools.map((school) => (
                    <TouchableOpacity
                      key={school}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setField('school_name', school);
                        setShowSchools(false);
                      }}
                    >
                      <Text style={styles.dropdownText}>{school}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{copy.grade}</Text>
              <View style={styles.gradeRow}>
                {gradeOptions.map((grade) => {
                  const active = String(resolved.grade) === grade;
                  return (
                    <TouchableOpacity
                      key={grade}
                      onPress={() => setField('grade', grade)}
                      style={[styles.gradeChip, active && styles.gradeChipActive]}
                    >
                      <Text style={[styles.gradeChipText, active && styles.gradeChipTextActive]}>
                        {grade}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{isHebrew ? 'שכבה' : isArabic ? 'الشعبة' : 'Class section'}</Text>
              <View style={styles.gradeRow}>
                {getClassSectionOptions(isHebrew ? 'he' : isArabic ? 'ar' : 'en').map((section) => {
                  const active = normalizeClassSection(resolved.class_section) === section.value;
                  return (
                    <TouchableOpacity
                      key={section.value}
                      onPress={() => setField('class_section', section.value)}
                      style={[styles.gradeChip, active && styles.gradeChipActive]}
                    >
                      <Text style={[styles.gradeChipText, active && styles.gradeChipTextActive]}>
                        {getClassSectionLabel(section.value, isHebrew ? 'he' : isArabic ? 'ar' : 'en')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{copy.gender}</Text>
              <View style={styles.gradeRow}>
                {genderOptions.map((gender) => {
                  const active = String(resolved.gender) === gender;
                  return (
                    <TouchableOpacity
                      key={gender}
                      onPress={() => setField('gender', gender)}
                      style={[styles.gradeChip, active && styles.gradeChipActive]}
                    >
                      <Text style={[styles.gradeChipText, active && styles.gradeChipTextActive]}>
                        {gender === 'male' ? copy.male : copy.female}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Field
              label={copy.birthday}
              value={form.birthday}
              onChangeText={(v) => setField('birthday', v)}
              placeholder={studentData?.birthday || '2007-05-19'}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave || saving}
          >
            <FontAwesome name="save" size={18} color="#0F172A" />
            <Text style={styles.saveText}>{saving ? copy.saving : copy.save}</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, paddingTop: 60 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '900' },
  avatarCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(39,174,96,0.35)',
    backgroundColor: '#0b1223',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarTitle: { color: '#fff', fontWeight: '900' },
  avatarHint: { color: '#94A3B8', fontWeight: '700', marginTop: 2, fontSize: 12 },
  avatarBtn: {
    backgroundColor: '#27ae60',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarBtnText: { color: '#0F172A', fontWeight: '900' },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '900', marginBottom: 12 },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  readOnlyLabel: { color: '#94A3B8', fontWeight: '700' },
  readOnlyValue: { color: '#fff', fontWeight: '800' },
  field: { marginBottom: 12 },
  label: { color: '#94A3B8', fontSize: 12, fontWeight: '800', marginBottom: 8 },
  input: {
    backgroundColor: '#0b1223',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputText: {
    color: '#fff',
    fontWeight: '700',
  },
  errorText: {
    marginTop: 6,
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  selectInput: {
    justifyContent: 'center',
  },
  dropdown: {
    backgroundColor: '#0b1223',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  dropdownText: {
    color: '#fff',
    fontWeight: '700',
  },
  gradeRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  gradeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0b1223',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  gradeChipActive: { backgroundColor: 'rgba(39,174,96,0.2)' },
  gradeChipText: { color: '#E2E8F0', fontWeight: '800' },
  gradeChipTextActive: { color: '#27ae60' },
  saveBtn: {
    backgroundColor: '#27ae60',
    borderRadius: 18,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 15,
  },
});
