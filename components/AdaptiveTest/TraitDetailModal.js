import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

function Progress({ value }) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${width}%` }]} />
    </View>
  );
}

export default function TraitDetailModal({ visible, trait, isRtl, closeLabel = 'סגור', onClose }) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(Math.max(width - 32, 280), 480);

  if (!trait) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { width: cardWidth, maxWidth: cardWidth }]}
          onPress={(event) => event?.stopPropagation?.()}
        >
          <View style={[styles.header, isRtl && styles.headerRtl]}>
            <View style={styles.headerText}>
              <Text style={[styles.title, isRtl && styles.rtlText]}>{trait.title}</Text>
              <Text style={[styles.subtitle, isRtl && styles.rtlText]}>{trait.label}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            >
              <Text style={styles.closeBtnText}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.percent}>{trait.value}%</Text>
          <Progress value={trait.value} />
          <Text style={[styles.explanation, isRtl && styles.rtlText]}>{trait.explanation}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 42, 95, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E5ECFF',
    shadowColor: '#102A68',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerRtl: { flexDirection: 'row-reverse' },
  headerText: { flex: 1 },
  title: { color: '#102A68', fontSize: 22, lineHeight: 28, fontWeight: '900' },
  subtitle: { color: '#64748B', marginTop: 4, fontSize: 16, lineHeight: 22, fontWeight: '800' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAF0FF',
    borderWidth: 1,
    borderColor: '#C9D8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: { backgroundColor: '#DCE7FF', opacity: 0.9 },
  closeBtnText: { color: '#1E4FBF', fontSize: 28, lineHeight: 30, fontWeight: '700' },
  percent: {
    marginTop: 16,
    color: '#1E4FBF',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EAF0FF',
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#1E4FBF' },
  explanation: {
    marginTop: 16,
    marginBottom: 4,
    color: '#475569',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
});
