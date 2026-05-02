import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const exportCards = [
  { key: 'school-pdf', title: 'School PDF', subtitle: 'Complete school-level summary for the principal.' },
  { key: 'class-pdf', title: 'Class PDF', subtitle: 'Export one class with key strengths and gaps.' },
  { key: 'excel', title: 'Excel Export', subtitle: 'Structured table for students, majors, and completion.' },
  { key: 'major-report', title: 'Major Report', subtitle: 'Group students by best-fit specialization.' },
];

export default function ExportReportsScreen({ navigateTo }) {
  const { i18n } = useTranslation();
  const isHebrew = String(i18n.language || '').toLowerCase().startsWith('he');
  const copy = isHebrew
    ? {
        title: 'ייצוא דוחות',
        subtitle: 'הכינו סיכומי בית ספר, כיתה ומסלולי התמחות להורדה או להצגה.',
        export: 'ייצוא',
      }
    : {
        title: 'تصدير التقارير',
        subtitle: 'جهّز تقارير المدرسة، الصفوف، والتخصصات للعرض أو التنزيل.',
        export: 'تصدير',
      };
  const handleExport = (title) => {
    Alert.alert('Export queued', `${title} can be connected next to PDF/Excel generation.`);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo?.('adminDashboard')}>
          <FontAwesome name="arrow-left" size={16} color="#1d4ed8" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>
      </View>

      {exportCards.map((card) => (
        <View key={card.key} style={styles.card}>
          <View style={styles.cardLead}>
            <View style={styles.iconWrap}>
              <FontAwesome name="file-text" size={18} color="#1d4ed8" />
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleExport(card.title)}>
            <Text style={styles.actionBtnText}>{copy.export}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 6, color: '#475569', lineHeight: 20, fontWeight: '700' },
  card: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cardLead: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1 },
  cardTitle: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  cardSubtitle: { marginTop: 4, color: '#64748b', fontWeight: '700', lineHeight: 18 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
  },
  actionBtnText: { color: '#fff', fontWeight: '900' },
});
