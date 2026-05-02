import { FontAwesome } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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

function normalizeLanguage(language) {
  const value = String(language || '').toLowerCase();
  if (value.startsWith('he')) return 'he';
  if (value.startsWith('ar')) return 'ar';
  return 'en';
}

function getActivityDateValue(activity, keys) {
  for (const key of keys) {
    if (activity?.[key]) return activity[key];
  }
  return null;
}

function formatActivitySchedule(activity, language) {
  const locale = normalizeLanguage(language) === 'he' ? 'he-IL' : normalizeLanguage(language) === 'ar' ? 'ar-EG' : 'en-US';
  const startDateRaw = getActivityDateValue(activity, ['start_date', 'activity_date', 'date']);
  const endDateRaw = getActivityDateValue(activity, ['end_date', 'activity_end_date', 'date_end']);
  const startTimeRaw = getActivityDateValue(activity, ['start_time', 'time_start', 'activity_time']);
  const endTimeRaw = getActivityDateValue(activity, ['end_time', 'time_end']);

  const formatDate = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(parsed);
  };

  const formatTime = (value) => {
    if (!value) return '';
    const safeValue = String(value).trim();
    const parsed = new Date(`2000-01-01T${safeValue}`);
    if (Number.isNaN(parsed.getTime())) return safeValue;
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed);
  };

  const startDate = formatDate(startDateRaw);
  const endDate = formatDate(endDateRaw);
  const startTime = formatTime(startTimeRaw);
  const endTime = formatTime(endTimeRaw);

  return {
    dayRange: startDate && endDate && startDate !== endDate ? `${startDate} - ${endDate}` : startDate || endDate || '',
    timeRange: startTime && endTime ? `${startTime} - ${endTime}` : startTime || endTime || '',
  };
}

function getLocalizedActivityField(activity, baseField, language) {
  return (
    activity?.[`${baseField}_${language}`] ||
    activity?.[`${baseField}_ar`] ||
    activity?.[`${baseField}_he`] ||
    activity?.[`${baseField}_en`] ||
    activity?.[baseField] ||
    ''
  );
}

function getActivitySchoolLabel(activity, language) {
  return (
    getLocalizedActivityField(activity, 'school_name', language) ||
    getLocalizedActivityField(activity, 'school', language) ||
    getLocalizedActivityField(activity, 'host_school', language) ||
    getLocalizedActivityField(activity, 'venue_name', language) ||
    getLocalizedActivityField(activity, 'location_name', language) ||
    getLocalizedActivityField(activity, 'location', language) ||
    ''
  );
}

const FALLBACK_TEXT = {
  'card.free': 'Free',
  'modal.register': 'Register',
  'modal.unregister': 'Unregister',
  'modal.close': 'Close',
};

export default function ActivityDetailsModal({
  visible,
  activity,
  onClose,
  onToggleRegister,
}) {
  const translation = useTranslation('activities');
  const t = (key) => {
    if (typeof translation?.t === 'function') {
      const value = translation.t(key);
      if (typeof value === 'string' && value !== key) return value;
    }
    return FALLBACK_TEXT[key] || key;
  };
  const safeActivity = activity || null;
  const language = normalizeLanguage(translation?.i18n?.language || 'ar');
  const schedule = useMemo(() => formatActivitySchedule(safeActivity, language), [safeActivity, language]);
  const schoolLabel = useMemo(() => getActivitySchoolLabel(safeActivity, language), [safeActivity, language]);

  const getLocalizedField = (baseField) => getLocalizedActivityField(safeActivity, baseField, language);

  const priceLabel = useMemo(() => {
    if (!safeActivity) return '';
    return Number(safeActivity.price) === 0 ? t('card.free') : `${safeActivity.price}₪`;
  }, [safeActivity, t]);

  if (!safeActivity) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={onClose} />
      </Modal>
    );
  }

  const btnText = safeActivity.isRegistered ? t('modal.unregister') : t('modal.register');
  const btnIcon = safeActivity.isRegistered ? 'times' : 'calendar-plus-o';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={() => {}}>
          <Image source={{ uri: safeActivity.image }} style={styles.modalImage} />

          <View style={styles.content}>
            <Text style={styles.title}>{getLocalizedField('title')}</Text>
            <Text style={styles.desc}>{getLocalizedField('description')}</Text>

            {schoolLabel ? (
              <View style={styles.schoolRow}>
                <FontAwesome name="building-o" size={13} color="#2563eb" />
                <Text style={styles.schoolText}>{schoolLabel}</Text>
              </View>
            ) : null}

            {(schedule.dayRange || schedule.timeRange) ? (
              <View style={styles.scheduleWrap}>
                {schedule.dayRange ? (
                  <View style={styles.scheduleChip}>
                    <FontAwesome name="calendar" size={12} color="#166534" />
                    <Text style={styles.scheduleText}>{schedule.dayRange}</Text>
                  </View>
                ) : null}

                {schedule.timeRange ? (
                  <View style={styles.scheduleChip}>
                    <FontAwesome name="clock-o" size={12} color="#166534" />
                    <Text style={styles.scheduleText}>{schedule.timeRange}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

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
              style={[styles.actionBtn, safeActivity.isRegistered && styles.actionBtnActive]}
              onPress={() => onToggleRegister?.(safeActivity)}
            >
              <FontAwesome name={btnIcon} size={16} color="#fff" />
              <Text style={styles.actionText}>{btnText}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.9}>
              <Text style={styles.closeText}>{t('modal.close')}</Text>
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
  schoolRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  schoolText: {
    flex: 1,
    color: '#2563eb',
    fontWeight: '900',
    fontSize: 13,
    textAlign: 'right',
  },
  scheduleWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  scheduleChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  scheduleText: {
    color: '#166534',
    fontWeight: '900',
    fontSize: 12,
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
