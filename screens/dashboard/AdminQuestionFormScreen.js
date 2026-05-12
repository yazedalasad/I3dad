import { useEffect, useState } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  AdminCard,
  AdminShell,
  FormInput,
  LoadingState,
} from '../../components/Admin/AdminLayout';
import { adminColors } from '../../components/Admin/adminTheme';
import { useAdminTranslator } from '../../components/Admin/adminTranslations';
import { createAdminQuestion, validateQuestionPayload } from '../../services/adminPanelService';
import { getAllSubjects } from '../../services/questionService';

const initialForm = {
  subjectId: '',
  language: 'both',
  questionAr: '',
  questionHe: '',
  optionAAr: '',
  optionAHe: '',
  optionBAr: '',
  optionBHe: '',
  optionCAr: '',
  optionCHe: '',
  optionDAr: '',
  optionDHe: '',
  correctAnswer: 'A',
  difficulty: '0',
  explanation: '',
  tags: '',
  isActive: true,
};

export default function AdminQuestionFormScreen({ navigateTo }) {
  const tr = useAdminTranslator();
  const [form, setForm] = useState(initialForm);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAllSubjects()
      .then((result) => {
        if (!mounted) return;
        const rows = result?.success ? result.subjects || [] : [];
        setSubjects(rows);
        setForm((current) => ({ ...current, subjectId: rows[0]?.id || '' }));
      })
      .finally(() => mounted && setLoadingSubjects(false));
    return () => {
      mounted = false;
    };
  }, []);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const saveQuestion = async () => {
    const payload = { ...form, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) };
    const validation = validateQuestionPayload(payload);
    if (!validation.valid) {
      Alert.alert(tr('تحقق من السؤال'), tr(validation.message));
      return;
    }
    setSaving(true);
    const result = await createAdminQuestion(payload);
    setSaving(false);
    if (!result.success) {
      Alert.alert(tr('تعذر حفظ السؤال'), result.error?.message || tr('تحقق من حقول جدول questions'));
      return;
    }
    Alert.alert(tr('تم الحفظ'), tr('تمت إضافة السؤال إلى بنك الأسئلة.'), [
      { text: tr('رجوع للبنك'), onPress: () => navigateTo?.('adminQuestions') },
    ]);
  };

  return (
    <AdminShell
      activeKey="questions"
      title="إضافة سؤال جديد"
      subtitle="Validation، Preview، ودعم العربية والعبرية"
      navigateTo={navigateTo}
      primaryAction={
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('adminQuestions')} activeOpacity={0.85}>
            <FontAwesome name="arrow-right" size={14} color={adminColors.primary} />
            <Text style={styles.backText}>{tr('رجوع للأسئلة')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={saveQuestion} disabled={saving}>
          <Text style={styles.saveText}>{tr(saving ? 'جاري الحفظ...' : 'حفظ السؤال')}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {loadingSubjects ? (
        <LoadingState label="جاري تحميل المواد..." />
      ) : (
        <View style={styles.grid}>
          <AdminCard title="بيانات السؤال" subtitle="لا يسمح بالحفظ بدون مادة، 4 خيارات، وإجابة صحيحة">
            <View style={styles.formGrid}>
              <PickerLike
                label="المادة"
                value={subjects.find((item) => item.id === form.subjectId)?.name_ar || subjects.find((item) => item.id === form.subjectId)?.name_en || 'اختر مادة'}
                options={subjects}
                onSelect={(subject) => setField('subjectId', subject.id)}
              />
              <PickerLike
                label="اللغة"
                value={form.language}
                options={[{ id: 'both', name_ar: 'both' }, { id: 'ar', name_ar: 'ar' }, { id: 'he', name_ar: 'he' }]}
                onSelect={(lang) => setField('language', lang.id)}
              />
              <FormInput label="نص السؤال بالعربية" value={form.questionAr} onChangeText={(v) => setField('questionAr', v)} multiline />
              <FormInput label="نص السؤال بالعبرية" value={form.questionHe} onChangeText={(v) => setField('questionHe', v)} multiline />
              {['A', 'B', 'C', 'D'].map((key) => (
                <View key={key} style={styles.optionBlock}>
                  <Text style={styles.optionTitle}>{tr(`الاختيار ${key}`)}</Text>
                  <FormInput label={`الخيار ${key} بالعربية`} value={form[`option${key}Ar`]} onChangeText={(v) => setField(`option${key}Ar`, v)} />
                  <FormInput label={`الخيار ${key} بالعبرية`} value={form[`option${key}He`]} onChangeText={(v) => setField(`option${key}He`, v)} />
                </View>
              ))}
              <PickerLike
                label="الإجابة الصحيحة"
                value={form.correctAnswer}
                options={['A', 'B', 'C', 'D'].map((id) => ({ id, name_ar: id }))}
                onSelect={(answer) => setField('correctAnswer', answer.id)}
              />
              <FormInput label="مستوى الصعوبة" value={form.difficulty} onChangeText={(v) => setField('difficulty', v)} keyboardType="numeric" />
              <FormInput label="شرح الإجابة اختياري" value={form.explanation} onChangeText={(v) => setField('explanation', v)} multiline />
              <FormInput label="tags مفصولة بفواصل" value={form.tags} onChangeText={(v) => setField('tags', v)} />
            </View>
          </AdminCard>

          <AdminCard title="Preview" subtitle="تجربة شكل السؤال قبل الحفظ">
            <View style={styles.preview}>
              <Text style={styles.previewQuestion}>{form.questionAr || form.questionHe || tr('نص السؤال يظهر هنا')}</Text>
              {['A', 'B', 'C', 'D'].map((key) => (
                <View key={key} style={[styles.previewOption, form.correctAnswer === key && styles.previewOptionCorrect]}>
                  <Text style={styles.previewOptionText}>{key}. {form[`option${key}Ar`] || form[`option${key}He`] || tr(`الخيار ${key}`)}</Text>
                </View>
              ))}
            </View>
          </AdminCard>
        </View>
      )}
    </AdminShell>
  );
}

function PickerLike({ label, value, options, onSelect }) {
  const tr = useAdminTranslator();
  return (
    <View style={styles.pickerWrap}>
      <Text style={styles.pickerLabel}>{tr(label)}</Text>
      <View style={styles.pickerOptions}>
        {options.slice(0, 10).map((option) => (
          <TouchableOpacity key={option.id} style={styles.pickerChip} onPress={() => onSelect(option)}>
            <Text style={styles.pickerChipText}>{option.name_ar || option.name_he || option.name_en || option.id}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.currentValue}>{tr(`الحالي: ${value}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  backButton: { height: 42, borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, backgroundColor: adminColors.softBlue, paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  backText: { color: adminColors.primary, fontWeight: '900' },
  saveButton: { height: 42, borderRadius: 14, backgroundColor: adminColors.success, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontWeight: '900' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 14 },
  formGrid: { gap: 12 },
  optionBlock: { borderRadius: 16, borderWidth: 1, borderColor: adminColors.border, padding: 12, backgroundColor: adminColors.bg, gap: 10 },
  optionTitle: { color: adminColors.text, fontWeight: '900', textAlign: 'right' },
  pickerWrap: { gap: 8 },
  pickerLabel: { color: adminColors.text, fontWeight: '900', textAlign: 'right' },
  pickerOptions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  pickerChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: adminColors.softBlue },
  pickerChipText: { color: adminColors.primary, fontWeight: '900', fontSize: 12 },
  currentValue: { color: adminColors.muted, fontWeight: '800', textAlign: 'right', fontSize: 12 },
  preview: { gap: 10 },
  previewQuestion: { color: adminColors.text, fontSize: 18, fontWeight: '900', textAlign: 'right', lineHeight: 28 },
  previewOption: { borderRadius: 14, borderWidth: 1, borderColor: adminColors.border, padding: 12, backgroundColor: '#fff' },
  previewOptionCorrect: { borderColor: adminColors.success, backgroundColor: adminColors.softGreen },
  previewOptionText: { color: adminColors.text, fontWeight: '800', textAlign: 'right' },
});
