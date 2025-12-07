import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from './CustomButton';

export default function DatePicker({
  label,
  value,
  onValueChange,
  error,
  icon,
  placeholder = 'اختر التاريخ',
  minAge = 14,  // Minimum age allowed
  maxAge = 20,  // Maximum age allowed
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : new Date());
  const [dateError, setDateError] = useState('');

  // Calculate min and max dates based on age restrictions
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
    if (!date) return placeholder;
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Function to calculate age from date
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

  // Validate date against age restrictions
  const validateDate = (date) => {
    const age = calculateAge(date);
    if (age < minAge) {
      setDateError(`يجب أن يكون العمر ${minAge} سنة على الأقل`);
      return false;
    } else if (age > maxAge) {
      setDateError(`يجب أن يكون العمر ${maxAge} سنة على الأكثر`);
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

  const changeYear = (increment) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(newDate.getFullYear() + increment);
    
    // Check if the new year is within allowed range
    const minDate = getMinDate();
    const maxDate = getMaxDate();
    
    if (newDate > maxDate) {
      setSelectedDate(maxDate);
      setDateError(`يجب أن يكون العمر ${minAge} سنة على الأقل`);
    } else if (newDate < minDate) {
      setSelectedDate(minDate);
      setDateError(`يجب أن يكون العمر ${maxAge} سنة على الأكثر`);
    } else {
      setSelectedDate(newDate);
      validateDate(newDate);
    }
  };

  const changeMonth = (increment) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + increment);
    
    // Check if the new date is within allowed range
    const minDate = getMinDate();
    const maxDate = getMaxDate();
    
    if (newDate > maxDate) {
      setSelectedDate(maxDate);
      setDateError(`يجب أن يكون العمر ${minAge} سنة على الأقل`);
    } else if (newDate < minDate) {
      setSelectedDate(minDate);
      setDateError(`يجب أن يكون العمر ${maxAge} سنة على الأكثر`);
    } else {
      setSelectedDate(newDate);
      validateDate(newDate);
    }
  };

  const changeDay = (increment) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + increment);
    
    // Check if the new date is within allowed range
    const minDate = getMinDate();
    const maxDate = getMaxDate();
    
    if (newDate > maxDate) {
      setSelectedDate(maxDate);
      setDateError(`يجب أن يكون العمر ${minAge} سنة على الأقل`);
    } else if (newDate < minDate) {
      setSelectedDate(minDate);
      setDateError(`يجب أن يكون العمر ${maxAge} سنة على الأكثر`);
    } else {
      setSelectedDate(newDate);
      validateDate(newDate);
    }
  };

  // Show age range in placeholder when no date is selected
  const getPlaceholderText = () => {
    if (value) return formatDate(value);
    return `${placeholder} (${minAge}-${maxAge} سنة)`;
  };

  // Initialize validation when component mounts or value changes
  useEffect(() => {
    if (value) {
      validateDate(new Date(value));
    }
  }, [value]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.dateButton,
          (error || dateError) && styles.dateButtonError,
        ]}
        onPress={() => {
          // Reset to current value or valid default when opening modal
          if (value) {
            setSelectedDate(new Date(value));
            validateDate(new Date(value));
          } else {
            // Set to middle of allowed range as default
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
        <Text style={[
          styles.dateText,
          !value && styles.placeholderText,
        ]}>
          {getPlaceholderText()}
        </Text>
        <FontAwesome
          name="calendar"
          size={16}
          color="#94A3B8"
          style={styles.calendarIcon}
        />
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
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <FontAwesome name="times" size={24} color="#2c3e50" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {label || 'اختر التاريخ'} ({minAge}-{maxAge} سنة)
              </Text>
            </View>

            {/* Age Range Info */}
            <View style={styles.ageRangeContainer}>
              <Text style={styles.ageRangeText}>
                يجب أن يكون العمر بين {minAge} و {maxAge} سنة
              </Text>
            </View>

            <View style={styles.datePickerContainer}>
              {/* Year Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>السنة</Text>
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => changeYear(1)}
                >
                  <FontAwesome name="chevron-up" size={20} color="#27ae60" />
                </TouchableOpacity>
                <View style={styles.valueContainer}>
                  <Text style={styles.valueText}>{selectedDate.getFullYear()}</Text>
                </View>
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => changeYear(-1)}
                >
                  <FontAwesome name="chevron-down" size={20} color="#27ae60" />
                </TouchableOpacity>
              </View>

              {/* Month Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>الشهر</Text>
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => changeMonth(1)}
                >
                  <FontAwesome name="chevron-up" size={20} color="#27ae60" />
                </TouchableOpacity>
                <View style={styles.valueContainer}>
                  <Text style={styles.valueText}>
                    {(selectedDate.getMonth() + 1).toString().padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => changeMonth(-1)}
                >
                  <FontAwesome name="chevron-down" size={20} color="#27ae60" />
                </TouchableOpacity>
              </View>

              {/* Day Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>اليوم</Text>
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => changeDay(1)}
                >
                  <FontAwesome name="chevron-up" size={20} color="#27ae60" />
                </TouchableOpacity>
                <View style={styles.valueContainer}>
                  <Text style={styles.valueText}>
                    {selectedDate.getDate().toString().padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => changeDay(-1)}
                >
                  <FontAwesome name="chevron-down" size={20} color="#27ae60" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Age Display */}
            <View style={styles.ageContainer}>
              <View style={styles.ageDisplay}>
                <Text style={styles.ageLabel}>العمر الحالي:</Text>
                <Text style={[
                  styles.ageValue,
                  dateError ? styles.ageError : styles.ageValid
                ]}>
                  {calculateAge(selectedDate)} سنة
                </Text>
              </View>
            </View>

            <View style={styles.selectedDateDisplay}>
              <Text style={styles.selectedDateText}>
                التاريخ المختار: {formatDate(selectedDate)}
              </Text>
            </View>

            {/* Error Message in Modal */}
            {dateError && (
              <View style={styles.modalErrorContainer}>
                <FontAwesome name="exclamation-triangle" size={16} color="#e74c3c" />
                <Text style={styles.modalErrorText}>{dateError}</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <CustomButton
                title="تأكيد"
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
