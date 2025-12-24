// File: screens/Profile/EditStudentProfileScreen.js
// ✅ Works on App (iOS/Android) + ✅ Web
// ✅ Fixes Supabase Storage 400 by uploading bytes (Uint8Array) on mobile instead of RN Blob
// ✅ Old data shown as placeholders (so you can change only one field)
// ✅ Uploads to Supabase Storage bucket "avatars" and saves URL to students.avatar_url
//
// IMPORTANT (one-time):
// 1) Create bucket: Storage -> avatars
// 2) Add policies for storage.objects (insert/select) for bucket_id='avatars'
// 3) Install image picker (mobile): npx expo install expo-image-picker

import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
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

const gradeOptions = ['9', '10', '11', '12'];

const AVATAR_BUCKET = 'avatars';
const AVATAR_COLUMN = 'avatar_url';

export default function EditStudentProfileScreen({ navigateTo }) {
  const { studentData, updateStudentData, user } = useAuth();

  const [saving, setSaving] = useState(false);

  const [schools, setSchools] = useState([]);
  const [showSchools, setShowSchools] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Keep inputs empty => old values shown as placeholders
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    school_name: '',
    grade: '',
    birthday: '',
  });

  // Load student data for avatar + defaults for selectors
  useEffect(() => {
    if (!studentData) return;

    const url =
      (studentData?.[AVATAR_COLUMN] ||
        studentData?.avatar_url ||
        studentData?.image_url ||
        studentData?.profile_image_url ||
        '')?.toString() || '';

    setAvatarUrl(url);

    // defaults for school/grade/birthday if user hasn't picked them yet
    setForm((prev) => ({
      ...prev,
      school_name: prev.school_name || (studentData?.school_name || ''),
      grade: prev.grade || (studentData?.grade ? String(studentData.grade) : ''),
      birthday: prev.birthday || (studentData?.birthday || ''),
    }));
  }, [studentData]);

  // Load schools (Arabic only)
  useEffect(() => {
    const loadSchools = async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('name_ar')
        .eq('is_active', true)
        .order('name_ar');

      if (!error && data) setSchools(data.map((s) => s.name_ar));
    };

    loadSchools();
  }, []);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function isValidDate(v) {
    if (!v || typeof v !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v);
    return !isNaN(d.getTime());
  }

  // Final values = typed value OR old value
  const resolved = useMemo(() => {
    return {
      first_name: (form.first_name.trim() || studentData?.first_name || '').trim(),
      last_name: (form.last_name.trim() || studentData?.last_name || '').trim(),
      phone: (form.phone.trim() || studentData?.phone || '').trim(),
      school_name: (form.school_name || studentData?.school_name || '').trim(),
      grade: String(form.grade || studentData?.grade || '').trim(),
      birthday: String(form.birthday || studentData?.birthday || '').trim(),
    };
  }, [form, studentData]);

  const canSave = useMemo(() => {
    return (
      resolved.first_name.length > 0 &&
      resolved.last_name.length > 0 &&
      resolved.school_name.length > 0 &&
      gradeOptions.includes(String(resolved.grade)) &&
      isValidDate(resolved.birthday)
    );
  }, [resolved]);

  // ---------------------- AVATAR UPLOAD (FIXED) ----------------------
  // Web: upload File directly
  // Mobile: fetch(uri) -> blob -> arrayBuffer -> Uint8Array (avoids Supabase 400)
  const uploadAvatar = async ({ uri, file }) => {
    const userId = user?.id || studentData?.user_id || 'unknown';

    let body;
    let contentType = 'image/jpeg';
    let ext = 'jpg';

    if (Platform.OS === 'web') {
      if (!file) throw new Error('No file selected');
      contentType = file.type || 'image/jpeg';

      // figure ext from mime
      if (contentType.includes('png')) ext = 'png';
      else if (contentType.includes('webp')) ext = 'webp';
      else ext = 'jpg';

      body = file; // ✅ File is supported on web
    } else {
      if (!uri) throw new Error('No image uri');

      const resp = await fetch(uri);
      const blob = await resp.blob();
      contentType = blob.type || 'image/jpeg';

      if (contentType.includes('png')) ext = 'png';
      else if (contentType.includes('webp')) ext = 'webp';
      else ext = 'jpg';

      const ab = await blob.arrayBuffer();
      body = new Uint8Array(ab); // ✅ This avoids the 400 error on mobile
    }

    const path = `students/${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, body, { upsert: true, contentType });

    if (uploadError) {
      // Very common if Storage RLS policy is missing
      throw uploadError;
    }

    // If bucket is PUBLIC:
    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const publicUrl = data?.publicUrl;

    if (!publicUrl) {
      throw new Error('No public URL returned (bucket might be private).');
    }

    // Save in DB
    const { error: saveError } = await updateStudentData({ [AVATAR_COLUMN]: publicUrl });
    if (saveError) throw saveError;

    setAvatarUrl(publicUrl);
    return publicUrl;
  };

  const pickAvatarMobile = async () => {
    // dynamic import so web build never breaks
    const ImagePicker = await import('expo-image-picker');

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access.');
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
    Alert.alert('Success', 'Profile image updated');
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
          if (!file) return resolve();

          await uploadAvatar({ file });
          Alert.alert('Success', 'Profile image updated');
          resolve();
        } catch (e) {
          Alert.alert('Upload failed', e?.message || 'Upload failed');
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
      Alert.alert(
        'Upload failed',
        e?.message ||
          'Upload failed. If this keeps happening, your Storage policy may be missing.'
      );
      // optional debug:
      // console.log('UPLOAD ERROR', e);
    } finally {
      setAvatarUploading(false);
    }
  };

  // ---------------------- SAVE PROFILE ----------------------
  const handleSave = async () => {
    if (!canSave) {
      Alert.alert(
        'Fix your data',
        'Please fill all required fields correctly (Birthday must be YYYY-MM-DD).'
      );
      return;
    }

    setSaving(true);

    const updates = {
      first_name: resolved.first_name,
      last_name: resolved.last_name,
      phone: resolved.phone,
      school_name: resolved.school_name,
      grade: parseInt(resolved.grade, 10),
      birthday: resolved.birthday,
      ...(avatarUrl ? { [AVATAR_COLUMN]: avatarUrl } : {}),
    };

    const { error } = await updateStudentData(updates);
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
      return;
    }

    Alert.alert('Saved', 'Your profile was updated successfully!');
    navigateTo('profile');
  };

  const Field = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    autoCapitalize = 'none',
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
    </View>
  );

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo('profile')}>
              <FontAwesome name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Edit Profile</Text>
            <View style={{ width: 42 }} />
          </View>

          {/* Avatar editor */}
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
              <Text style={styles.avatarTitle}>Profile photo</Text>
              <Text style={styles.avatarHint}>
                {Platform.OS === 'web'
                  ? 'Choose an image from your computer'
                  : 'Choose an image from your phone'}
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
                {avatarUploading ? 'Uploading...' : 'Change'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Account */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account</Text>

            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>Email</Text>
              <Text style={styles.readOnlyValue}>{user?.email || '—'}</Text>
            </View>

            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>Student ID</Text>
              <Text style={styles.readOnlyValue}>{studentData?.student_id || '—'}</Text>
            </View>
          </View>

          {/* Editable */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your details</Text>

            <Field
              label="First name"
              value={form.first_name}
              onChangeText={(v) => setField('first_name', v)}
              placeholder={studentData?.first_name || 'First name'}
              autoCapitalize="words"
            />
            <Field
              label="Last name"
              value={form.last_name}
              onChangeText={(v) => setField('last_name', v)}
              placeholder={studentData?.last_name || 'Last name'}
              autoCapitalize="words"
            />
            <Field
              label="Phone"
              value={form.phone}
              onChangeText={(v) => setField('phone', v)}
              placeholder={studentData?.phone || 'Phone'}
              keyboardType="phone-pad"
            />

            {/* School selector */}
            <View style={styles.field}>
              <Text style={styles.label}>School (Arabic)</Text>

              <TouchableOpacity
                style={[styles.input, styles.selectInput]}
                onPress={() => setShowSchools(!showSchools)}
                activeOpacity={0.9}
              >
                <Text style={{ color: resolved.school_name ? '#fff' : '#64748b' }}>
                  {resolved.school_name || 'Select school'}
                </Text>
              </TouchableOpacity>

              {showSchools && (
                <View style={styles.dropdown}>
                  {schools.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setField('school_name', s);
                        setShowSchools(false);
                      }}
                    >
                      <Text style={styles.dropdownText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Grade */}
            <View style={styles.field}>
              <Text style={styles.label}>Grade (9–12)</Text>
              <View style={styles.gradeRow}>
                {gradeOptions.map((g) => {
                  const active = String(resolved.grade) === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setField('grade', g)}
                      style={[styles.gradeChip, active && styles.gradeChipActive]}
                    >
                      <Text style={[styles.gradeChipText, active && styles.gradeChipTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Field
              label="Birth date (YYYY-MM-DD)"
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
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save changes'}</Text>
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
  inputText: { color: '#fff', fontWeight: '800' },
  selectInput: { justifyContent: 'center' },

  dropdown: {
    backgroundColor: '#0b1223',
    borderRadius: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: 260,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownText: { color: '#fff', fontWeight: '700' },

  gradeRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  gradeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0b1223',
  },
  gradeChipActive: { backgroundColor: 'rgba(39,174,96,0.2)' },
  gradeChipText: { color: '#E2E8F0', fontWeight: '800' },
  gradeChipTextActive: { color: '#27ae60' },

  saveBtn: {
    backgroundColor: '#27ae60',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveText: { color: '#0F172A', fontWeight: '900' },
});
