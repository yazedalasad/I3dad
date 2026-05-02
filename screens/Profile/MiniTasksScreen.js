import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { findMajorByName, localizeField, miniTaskCatalog } from '../../data/majorCatalog';

export default function MiniTasksScreen({ navigateTo, route = { params: {} } }) {
  const { i18n } = useTranslation();
  const isRtl = ['ar', 'he'].some((lang) => String(i18n.language || '').toLowerCase().startsWith(lang));
  const isHebrew = String(i18n.language || '').toLowerCase().startsWith('he');
  const majorName = route?.params?.majorName || 'Selected Major';
  const matchedMajor = findMajorByName(majorName);
  const taskKey = route?.params?.majorKey || matchedMajor?.miniTaskKey || 'computer_science';
  const task = miniTaskCatalog[taskKey] || miniTaskCatalog.computer_science;
  const copy = isHebrew
    ? {
        title: 'משימת טעימה',
        reflect: 'מחשבה אחרי ההתנסות',
        q1: '1. האם נהניתם מהתחום הזה?',
        q2: '2. האם זה הרגיש טבעי או מלחיץ?',
        q3: '3. האם תרצו פעילות עמוקה יותר בתחום הזה?',
        continue: 'המשך לדוח הסופי',
      }
    : {
        title: 'مهمة تجريبية',
        reflect: 'فكّر بعد التجربة',
        q1: '1. هل استمتعت بهذا المجال؟',
        q2: '2. هل شعرت أنه مناسب لك أم مرهق؟',
        q3: '3. هل تريد نشاطًا أعمق في هذا المجال؟',
        continue: 'المتابعة إلى التقرير النهائي',
      };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={[styles.header, isRtl && styles.headerRtl]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo?.('recommendations')}>
          <FontAwesome name={isRtl ? 'arrow-right' : 'arrow-left'} size={16} color="#1d4ed8" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, isRtl && styles.rtlText]}>{copy.title}</Text>
          <Text style={[styles.subtitle, isRtl && styles.rtlText]}>{majorName}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, isRtl && styles.rtlText]}>
          {localizeField(task.title, i18n.language)}
        </Text>
        <Text style={[styles.prompt, isRtl && styles.rtlText]}>
          {localizeField(task.prompt, i18n.language)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, isRtl && styles.rtlText]}>{copy.reflect}</Text>
        <Text style={[styles.prompt, isRtl && styles.rtlText]}>{copy.q1}</Text>
        <Text style={[styles.prompt, isRtl && styles.rtlText]}>{copy.q2}</Text>
        <Text style={[styles.prompt, isRtl && styles.rtlText]}>{copy.q3}</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigateTo?.('finalReport')}
      >
        <Text style={styles.primaryBtnText}>{copy.continue}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  headerRtl: { flexDirection: 'row-reverse' },
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
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  prompt: { marginTop: 10, color: '#334155', lineHeight: 22, fontWeight: '700' },
  primaryBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  rtlText: { textAlign: 'right' },
});
