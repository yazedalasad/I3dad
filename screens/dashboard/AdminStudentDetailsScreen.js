import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  AdminCard,
  AdminShell,
  AdminTable,
  ChartCard,
  ErrorState,
  LoadingState,
  StatCard,
} from '../../components/Admin/AdminLayout';
import { adminColors } from '../../components/Admin/adminTheme';
import { useAdminTranslator } from '../../components/Admin/adminTranslations';
import { getAdminStudentDetails } from '../../services/adminPanelService';

export default function AdminStudentDetailsScreen({ navigateTo, route }) {
  const tr = useAdminTranslator();
  const studentId = route?.params?.studentId;
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    getAdminStudentDetails(studentId)
      .then((data) => {
        if (!mounted) return;
        setDetails(data);
        setError(data.error?.message || null);
      })
      .catch((err) => mounted && setError(err?.message || 'تعذر تحميل الطالب'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [studentId]);

  const student = details?.student;
  const name = student?.full_name || `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || 'طالب';
  const abilityChart = (details?.abilities || []).slice(0, 8).map((row, index) => ({
    label: row.subject_id || `قدرة ${index + 1}`,
    value: Math.round(Number(row.ability_estimate || row.mastery_level || 0) * 10) || index + 3,
  }));

  return (
    <AdminShell
      activeKey="students"
      title="تفاصيل الطالب"
      subtitle="معلومات الطالب، نتائجه، قدراته، وتوصيات النظام"
      navigateTo={navigateTo}
      primaryAction={
        <TouchableOpacity style={styles.backButton} onPress={() => navigateTo?.('adminStudents')}>
          <FontAwesome name="arrow-right" size={14} color="#fff" />
          <Text style={styles.backText}>{tr('رجوع للطلاب')}</Text>
        </TouchableOpacity>
      }
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <>
          <View style={styles.statsGrid}>
            <StatCard icon="user" label="اسم الطالب" value={name} tone={adminColors.primary2} />
            <StatCard icon="building" label="المدرسة" value={student?.school_name || '-'} tone={adminColors.success} />
            <StatCard icon="graduation-cap" label="الصف والشعبة" value={`${student?.grade || '-'} / ${student?.class_section || '-'}`} tone={adminColors.warning} />
            <StatCard icon="check-circle" label="عدد الاختبارات" value={details?.summary?.tests || 0} tone="#7C3AED" />
            <StatCard icon="line-chart" label="متوسط النتائج" value={details?.summary?.averageScore ? `${Math.round(details.summary.averageScore)}%` : '-'} tone="#0891B2" />
          </View>

          <View style={styles.twoCols}>
            <AdminCard title="معلومات الطالب الأساسية">
              <Info label="البريد الإلكتروني" value={student?.email} />
              <Info label="رقم الهوية" value={student?.identity_number} />
              <Info label="الهاتف" value={student?.phone} />
              <Info label="تاريخ الميلاد" value={student?.birthday} />
              <Info label="اللغة المفضلة" value={student?.preferred_language || student?.language} />
            </AdminCard>
            <ChartCard title="Radar Chart للقدرات (تمثيل أولي)" data={abilityChart} tone={adminColors.primary2} />
          </View>

          <AdminCard title="آخر جلسات الاختبار">
            <AdminTable
              columns={[
                { key: 'id', label: 'الجلسة', width: 240 },
                { key: 'session_type', label: 'النوع', width: 140 },
                { key: 'started_at', label: 'البداية', width: 170 },
                { key: 'completed_at', label: 'النهاية', width: 170 },
                { key: 'questions_answered', label: 'الأسئلة', width: 110 },
                { key: 'final_score', label: 'النتيجة', width: 110 },
                { key: 'status', label: 'الحالة', width: 130 },
              ]}
              rows={details?.sessions || []}
              emptyText="لا توجد جلسات اختبار لهذا الطالب"
            />
          </AdminCard>

          <AdminCard title="توصيات النظام وسجل النشاط" subtitle="TODO: ربط تفصيلي مع recommendations وaudit_logs عند تثبيت الجداول">
            {(details?.recommendations || []).length ? (
              (details.recommendations || []).map((item, index) => (
                <Info key={item.id || index} label={`توصية ${index + 1}`} value={item.recommendation_text || item.major_key || JSON.stringify(item)} />
              ))
            ) : (
              <Text style={styles.emptyText}>{tr('لا توجد توصيات محفوظة بعد.')}</Text>
            )}
          </AdminCard>
        </>
      )}
    </AdminShell>
  );
}

function Info({ label, value }) {
  const tr = useAdminTranslator();
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoValue}>{value || '-'}</Text>
      <Text style={styles.infoLabel}>{tr(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: { height: 42, borderRadius: 14, backgroundColor: adminColors.primary2, paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  backText: { color: '#fff', fontWeight: '900' },
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  twoCols: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 14 },
  infoRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: adminColors.border, alignItems: 'flex-end' },
  infoLabel: { color: adminColors.muted, fontSize: 17, fontWeight: '800', textAlign: 'right' },
  infoValue: { color: adminColors.text, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  emptyText: { color: adminColors.muted, fontWeight: '800', textAlign: 'right' },
});
