import { FontAwesome } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
    Image,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ActivityDetailsModal({
  visible,
  activity,
  onClose,
  onToggleRegister,
}) {
  const safeActivity = activity || null;

  const priceLabel = useMemo(() => {
    if (!safeActivity) return '';
    return Number(safeActivity.price) === 0 ? 'Free' : `${safeActivity.price}₪`;
  }, [safeActivity]);

  if (!safeActivity) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={onClose} />
      </Modal>
    );
  }

  const btnText = safeActivity.isRegistered ? 'Unregister' : 'Register';
  const btnIcon = safeActivity.isRegistered ? 'times' : 'calendar-plus-o';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Stop closing when tapping the card */}
        <Pressable style={styles.modal} onPress={() => {}}>
          <Image source={{ uri: safeActivity.image }} style={styles.modalImage} />

          <View style={styles.content}>
            <Text style={styles.title}>{safeActivity.title_ar}</Text>

            <Text style={styles.desc}>{safeActivity.description_ar}</Text>

            <View style={styles.row}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>
                  👥 {safeActivity.registered}/{safeActivity.capacity}
                </Text>
              </View>

              <View style={[styles.pill, styles.pricePill]}>
                <Text style={[styles.pillText, styles.priceText]}>{priceLabel}</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.actionBtn,
                safeActivity.isRegistered && styles.actionBtnActive,
              ]}
              onPress={() => onToggleRegister?.(safeActivity)}
            >
              <FontAwesome name={btnIcon} size={16} color="#fff" />
              <Text style={styles.actionText}>{btnText}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.9}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 22,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 18px 60px rgba(0,0,0,0.35)' }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.28,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 18 },
          elevation: 12,
        }),
  },
  modalImage: {
    width: '100%',
    height: 240,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
    color: '#0f172a',
    textAlign: 'right',
  },
  desc: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 14,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
    alignItems: 'center',
  },
  pillText: {
    fontWeight: '900',
    color: '#0f172a',
  },
  pricePill: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  priceText: {
    color: '#2563eb',
  },
  actionBtn: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#3498db',
  },
  actionBtnActive: {
    backgroundColor: '#e74c3c',
  },
  actionText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  closeBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontWeight: '900',
  },
});
