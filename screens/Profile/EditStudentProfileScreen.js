import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
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

export default function EditStudentProfileScreen({ navigateTo }) {
  const { studentData, updateStudentData, user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [schools, setSchools] = useState([]);
  const [showSchools, setShowSchools] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    school_name: '',
    grade: '',
    birthday: '',
  });

  // Load student data
  useEffect(() => {
    if (!studentData) return;
    setForm({
      first_name: studentData.first_name || '',
      last_name: studentData.last_name || '',
      phone: studentData.phone || '',
      school_name: studentData.school_name || '',
      grade: studentData.grade ? String(studentData.grade) : '',
      birthday: studentData.birthday || '',
    });
  }, [studentData]);

  // Load schools (Arabic only)
  useEffect(() => {
    const loadSchools = async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('name_ar')
        .eq('is_active', true)
        .order('name_ar');

      if (!error && data) {
        setSchools(data.map((s) => s.name_ar));
      }
    };

    loadSchools();
  }, []);

  const canSave = useMemo(() => {
    return (
      form.first_name.trim().length > 0 &&
      form.last_name.trim().length > 0 &&
      form.school_name.trim().length > 0 &&
      gradeOptions.includes(String(form.grade)) &&
      isValidDate(form.birthday)
    );
  }, [form]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function isValidDate(v) {
    if (!v || typeof v !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v);
    return !isNaN(d.getTime());
  }

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
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      school_name: form.school_name.trim(), // Arabic name only
      grade: parseInt(form.grade, 10),
      birthday: form.birthday,
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

  const Field = ({ label, value, onChangeText, placeholder, keyboardType = 'default' }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        style={styles.input}
        keyboardType={keyboardType}
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo('profile')}>
              <FontAwesome name="arrow-left" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Edit Profile</Text>
            <View style={{ width: 42 }} />
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

            <Field label="First name" value={form.first_name} onChangeText={(v) => setField('first_name', v)} />
            <Field label="Last name" value={form.last_name} onChangeText={(v) => setField('last_name', v)} />
            <Field label="Phone" value={form.phone} onChangeText={(v) => setField('phone', v)} keyboardType="phone-pad" />

            {/* School selector */}
            <View style={styles.field}>
              <Text style={styles.label}>School (Arabic)</Text>

              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowSchools(!showSchools)}
                activeOpacity={0.9}
              >
                <Text style={{ color: form.school_name ? '#fff' : '#64748b' }}>
                  {form.school_name || 'Select school'}
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
                  const active = String(form.grade) === g;
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
              placeholder="2007-05-19"
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

  dropdown: {
    backgroundColor: '#0b1223',
    borderRadius: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
