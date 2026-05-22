import { FontAwesome } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

export default function CustomPicker({
  label,
  labelKey, // ✅ NEW: i18n key for label (optional)
  labelParams, // ✅ NEW: params for label (optional)

  value,
  onValueChange,
  items,

  placeholder,
  placeholderKey = 'picker.placeholder', // ✅ NEW: default key
  placeholderParams, // ✅ NEW: params (optional)

  error,
  icon,
  searchable = false,
  containerStyle,

  modalTitle,
  modalTitleKey = 'picker.titleFallback', // ✅ NEW: default key
  modalTitleParams, // ✅ NEW: params (optional)
}) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();

  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isHebrew = String(i18n?.language || '').toLowerCase().startsWith('he');
  const searchPlaceholder = isHebrew ? 'חיפוש...' : 'بحث...';
  const noResultsText = isHebrew ? 'אין תוצאות מתאימות' : 'لا توجد نتائج مطابقة';

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
        ? t(placeholderKey, { ...placeholderParams, defaultValue: 'בחר/י...' })
        : 'בחר/י...';

  const resolvedModalTitle =
    typeof modalTitle === 'string' && modalTitle.length > 0
      ? modalTitle
      : modalTitleKey
        ? t(modalTitleKey, { ...modalTitleParams, defaultValue: 'בחר/י' })
        : 'בחר/י';

  const selectedItem = items.find((item) => item.value === value);
  const displayText = selectedItem ? selectedItem.label : resolvedPlaceholder;
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!searchable || !normalizedQuery) return items;

    return [...items]
      .map((item) => {
        const labelText = String(item.label || '');
        const normalizedLabel = labelText.toLowerCase();
        const startsWithMatch = normalizedLabel.startsWith(normalizedQuery);
        const includesMatch = normalizedLabel.includes(normalizedQuery);

        if (!startsWithMatch && !includesMatch) return null;

        return {
          item,
          labelText,
          priority: startsWithMatch ? 0 : 1,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.labelText.localeCompare(b.labelText);
      })
      .map(({ item }) => item);
  }, [items, normalizedQuery, searchable]);

  const isCompactLayout = width >= 720;

  const handleSelect = (itemValue) => {
    onValueChange(itemValue);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {(resolvedLabel || label) ? (
        <Text style={styles.label}>{resolvedLabel || label}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.pickerButton, error && styles.pickerButtonError]}
        onPress={() => {
          setSearchQuery('');
          setModalVisible(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={displayText}
      >
        {icon && (
          <FontAwesome
            name={icon}
            size={20}
            color={error ? '#e74c3c' : '#94A3B8'}
            style={styles.icon}
          />
        )}

        <Text style={[styles.pickerText, !selectedItem && styles.placeholderText]}>
          {displayText}
        </Text>

        <FontAwesome name="chevron-down" size={16} color="#94A3B8" style={styles.chevron} />
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={14} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable
            style={[
              styles.modalContent,
              isCompactLayout ? styles.modalContentCompact : styles.modalContentSheet,
              searchable ? styles.modalContentSearchable : styles.modalContentSimple,
            ]}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <FontAwesome name="times" size={24} color="#2c3e50" />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {resolvedLabel || resolvedModalTitle}
              </Text>
            </View>

            {searchable && (
              <View style={styles.searchWrap}>
                <FontAwesome name="search" size={16} color="#94A3B8" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t('picker.search', { defaultValue: searchPlaceholder })}
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
            )}

            <ScrollView style={styles.itemsList}>
              {filteredItems.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.item, value === item.value && styles.itemSelected]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={[styles.itemText, value === item.value && styles.itemTextSelected]}>
                    {item.label}
                  </Text>

                  {value === item.value && <FontAwesome name="check" size={18} color="#27ae60" />}
                </TouchableOpacity>
              ))}

              {filteredItems.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {t('picker.noResults', { defaultValue: noResultsText })}
                  </Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
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
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  pickerButtonError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fef2f2',
  },
  icon: {
    marginLeft: 8,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'right',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  chevron: {
    marginRight: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#dbe7f3',
    paddingBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 10,
  },
  modalContentCompact: {
    maxWidth: 560,
  },
  modalContentSheet: {
    alignSelf: 'stretch',
    marginTop: 'auto',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '68%',
  },
  modalContentSearchable: {
    maxHeight: 460,
  },
  modalContentSimple: {
    maxHeight: 320,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },
  closeButton: {
    padding: 4,
  },
  itemsList: {
    flex: 1,
    maxHeight: 300,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'right',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemSelected: {
    backgroundColor: '#f0fdf4',
  },
  itemText: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'right',
    flex: 1,
  },
  itemTextSelected: {
    color: '#27ae60',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 17,
    fontWeight: '600',
  },
});
