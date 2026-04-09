import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from './CustomButton';

export default function DatePicker({
  label,
  labelKey, // ✅ NEW (optional)
  labelParams, // ✅ NEW (optional)

  value,
  onValueChange,
  error,
  icon,

  placeholder,
  placeholderKey = 'datePicker.placeholder', // ✅ NEW default key
  placeholderParams, // ✅ NEW (optional)

  minAge = 14, // Minimum age allowed
  maxAge = 20, // Maximum age allowed
}) {
  const { t } = useTranslation();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : new Date());
  const [dateError, setDateError] = useState('');

  const resolvedLabel =
    typeof label === 'string' && label.length > 0
      ? label
      : labelKey
        ? t(labelKey, labelParams)
        : '';

  const resolvedPlaceholder =
    typeof placeholder === 'string' && placeholder.length > 0
      ? placeholder
      : placeholderKey
        ? t(placeholderKey, { ...placeholderParams, defaultValue: 'בחר/י תאריך' })
        : 'בחר/י תאריך';

  const getMinDate = () => {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setFullYear(today.getFullYear() - maxAge);
    return minDate;
  };

  const getMaxDate = () => {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setFullYear(today.getFullYear() - minAge);
    return maxDate;
  };

  const formatDate = (date) => {
    if (!date) return resolvedPlaceholder;
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const calculateAge = (date) => {
    const today = new Date();
    const birthDate = new Date(date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const validateDate = (date) => {
    const age = calculateAge(date);

    if (age < minAge) {
      setDateError(t('datePicker.validation.minAge', { min: minAge, defaultValue: `הגיל חייב להיות לפחות ${minAge} שנים` }));
      return false;
    } else if (age > maxAge) {
      setDateError(t('datePicker.validation.maxAge', { max: maxAge, defaultValue: `הגיל חייב להיות לכל היותר ${maxAge} שנים` }));
      return false;
    }

    setDateError('');
    return true;
  };

  const handleConfirm = () => {
    if (validateDate(selectedDate)) {
      onValueChange(selectedDate.toISOString());
      setModalVisible(false);
    }
  };

  const clampToRange = (newDate) => {
    const minDate = getMinDate();
    const maxDate = getMaxDate();

    if (newDate > maxDate) {
      setSelectedDate(maxDate);
      setDateError(t('datePicker.validation.minAge', { min: minAge, defaultValue: `הגיל חייב להיות לפחות ${minAge} שנים` }));
      return;
    }

    if (newDate < minDate) {
      setSelectedDate(minDate);
      setDateError(t('datePicker.validation.maxAge', { max: maxAge, defaultValue: `הגיל חייב להיות לכל היותר ${maxAge} שנים` }));
      return;
    }

    setSelectedDate(newDate);
    validateDate(newDate);
  };

  const changeYear = (increment) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(newDate.getFullYear() + increment);
    clampToRange(newDate);
  };

  const changeMonth = (increment) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + increment);
    clampToRange(newDate);
  };

  const changeDay = (increment) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + increment);
    clampToRange(newDate);
  };

  const getPlaceholderText = () => {
    if (value) return formatDate(value);

    const suffix = t('datePicker.ageRangeSuffix', {
      min: minAge,
      max: maxAge,
      defaultValue: `(${minAge}-${maxAge} שנים)`,
    });

    return `${resolvedPlaceholder} ${suffix}`;
  };

  useEffect(() => {
    if (value) {
      validateDate(new Date(value));
    }
  }, [value]);

  return (
    <View style={styles.container}>
      {(resolvedLabel || label) ? <Text style={styles.label}>{resolvedLabel || label}</Text> : null}

      <TouchableOpacity
        style={[styles.dateButton, (error || dateError) && styles.dateButtonError]}
        onPress={() => {
          if (value) {
            const d = new Date(value);
            setSelectedDate(d);
            validateDate(d);
          } else {
            const today = new Date();
            const defaultDate = new Date(today);
            defaultDate.setFullYear(today.getFullYear() - Math.floor((minAge + maxAge) / 2));
            setSelectedDate(defaultDate);
            validateDate(defaultDate);
          }
          setModalVisible(true);
        }}
      >
        {icon && (
          <FontAwesome
            name={icon}
            size={20}
            color={(error || dateError) ? '#e74c3c' : '#94A3B8'}
            style={styles.icon}
          />
        )}

        <Text style={[styles.dateText, !value && styles.placeholderText]}>{getPlaceholderText()}</Text>

        <FontAwesome name="calendar" size={16} color="#94A3B8" style={styles.calendarIcon} />
      </TouchableOpacity>

      {(error || dateError) && (
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={14} color="#e74c3c" />
          <Text style={styles.errorText}>{error || dateError}</Text>
        </View>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <FontAwesome name="times" size={24} color="#2c3e50" />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {(resolvedLabel || t('datePicker.modalTitleFallback', { defaultValue: 'בחר/י תאריך' }))}{' '}
                {t('datePicker.ageRangeSuffix', { min: minAge, max: maxAge, defaultValue: `(${minAge}-${maxAge} שנים)` })}
              </Text>
            </View>

            <View style={styles.ageRangeContainer}>
              <Text style={styles.ageRangeText}>
                {t('datePicker.ageRangeInfo', {
                  min: minAge,
                  max: maxAge,
                  defaultValue: `הגיל חייב להיות בין ${minAge} ל-${maxAge} שנים`,
                })}
              </Text>
            </View>

            <View style={styles.datePickerContainer}>
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>
                  {t('datePicker.labels.year', { defaultValue: 'שנה' })}
                </Text>
                <TouchableOpacity style={styles.arrowButton} onPress={() => changeYear(1)}>
                  <FontAwesome name="chevron-up" size={20} color="#27ae60" />
                </TouchableOpacity>
                <View style={styles.valueContainer}>
                  <Text style={styles.valueText}>{selectedDate.getFullYear()}</Text>
                </View>
                <TouchableOpacity style={styles.arrowButton} onPress={() => changeYear(-1)}>
                  <FontAwesome name="chevron-down" size={20} color="#27ae60" />
                </TouchableOpacity>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>
                  {t('datePicker.labels.month', { defaultValue: 'חודש' })}
                </Text>
                <TouchableOpacity style={styles.arrowButton} onPress={() => changeMonth(1)}>
                  <FontAwesome name="chevron-up" size={20} color="#27ae60" />
                </TouchableOpacity>
                <View style={styles.valueContainer}>
                  <Text style={styles.valueText}>
                    {(selectedDate.getMonth() + 1).toString().padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity style={styles.arrowButton} onPress={() => changeMonth(-1)}>
                  <FontAwesome name="chevron-down" size={20} color="#27ae60" />
                </TouchableOpacity>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>
                  {t('datePicker.labels.day', { defaultValue: 'יום' })}
                </Text>
                <TouchableOpacity style={styles.arrowButton} onPress={() => changeDay(1)}>
                  <FontAwesome name="chevron-up" size={20} color="#27ae60" />
                </TouchableOpacity>
                <View style={styles.valueContainer}>
                  <Text style={styles.valueText}>{selectedDate.getDate().toString().padStart(2, '0')}</Text>
                </View>
                <TouchableOpacity style={styles.arrowButton} onPress={() => changeDay(-1)}>
                  <FontAwesome name="chevron-down" size={20} color="#27ae60" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.ageContainer}>
              <View style={styles.ageDisplay}>
                <Text style={styles.ageLabel}>
                  {t('datePicker.labels.currentAge', { defaultValue: 'הגיל הנוכחי:' })}
                </Text>

                <Text style={[styles.ageValue, dateError ? styles.ageError : styles.ageValid]}>
                  {calculateAge(selectedDate)}{' '}
                  {t('datePicker.units.years', { defaultValue: 'שנים' })}
                </Text>
              </View>
            </View>

            <View style={styles.selectedDateDisplay}>
              <Text style={styles.selectedDateText}>
                {t('datePicker.labels.selectedDate', { defaultValue: 'התאריך שנבחר:' })}{' '}
                {formatDate(selectedDate)}
              </Text>
            </View>

            {dateError && (
              <View style={styles.modalErrorContainer}>
                <FontAwesome name="exclamation-triangle" size={16} color="#e74c3c" />
                <Text style={styles.modalErrorText}>{dateError}</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <CustomButton
                titleKey="datePicker.actions.confirm"
                title="אישור"
                onPress={handleConfirm}
                icon="check"
                disabled={!!dateError}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'right',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  dateButtonError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fef2f2',
  },
  icon: {
    marginLeft: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'right',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  calendarIcon: {
    marginRight: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },
  closeButton: {
    padding: 4,
  },
  ageRangeContainer: {
    backgroundColor: '#f0f9ff',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  ageRangeText: {
    fontSize: 14,
    color: '#0369a1',
    textAlign: 'center',
    fontWeight: '600',
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  pickerColumn: {
    alignItems: 'center',
    gap: 12,
  },
  columnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  arrowButton: {
    padding: 8,
  },
  valueContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  valueText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#27ae60',
  },
  ageContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  ageDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  ageLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  ageValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  ageValid: {
    color: '#27ae60',
  },
  ageError: {
    color: '#e74c3c',
  },
  selectedDateDisplay: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedDateText: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
    fontWeight: '600',
  },
  modalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  modalErrorText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '600',
  },
  modalButtons: {
    paddingHorizontal: 20,
  },
});
