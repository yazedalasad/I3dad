import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

function swapItems(items, fromIdx, toIdx) {
  if (fromIdx === toIdx) return items;
  const next = [...items];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

function getItemLabel(item, index, isArabic) {
  return (isArabic ? item?.ar : item?.he) ?? item?.en ?? `Item ${index + 1}`;
}

export default function RankingQuestionList({ items = [], onOrderChange, isArabic = true }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);

  const helperText = isArabic
    ? 'اختر بندًا ثم اختر مكانًا للتبديل'
    : 'בחר/י פריט ואז בחר/י מיקום להחלפה';

  const applyOrder = useCallback(
    (fromIdx, toIdx) => {
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= items.length || toIdx >= items.length) return;
      onOrderChange?.(swapItems(items, fromIdx, toIdx));
    },
    [items, onOrderChange]
  );

  const endDrag = useCallback(() => {
    setDragIndex(null);
  }, []);

  const handleRowPress = (index) => {
    if (dragIndex !== null) {
      if (dragIndex !== index) applyOrder(dragIndex, index);
      setDragIndex(null);
      setSelectedIndex(null);
      return;
    }

    if (selectedIndex === null) {
      setSelectedIndex(index);
      return;
    }
    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }
    applyOrder(selectedIndex, index);
    setSelectedIndex(null);
  };

  const handleGripPointerDown = (index) => {
    setDragIndex(index);
    setSelectedIndex(index);
  };

  const handleGripPointerEnter = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    applyOrder(dragIndex, index);
    setDragIndex(index);
  };

  if (!items.length) {
    return (
      <Text style={styles.empty}>
        {isArabic ? 'لا توجد عناصر للترتيب.' : 'אין פריטים לסידור.'}
      </Text>
    );
  }

  return (
    <View
      style={styles.wrap}
      onPointerUp={Platform.OS === 'web' ? endDrag : undefined}
      onPointerLeave={Platform.OS === 'web' ? endDrag : undefined}
    >
      <Text style={styles.helper}>{helperText}</Text>

      <View style={styles.list}>
        {items.map((item, index) => {
          const label = getItemLabel(item, index, isArabic);
          const isSelected = selectedIndex === index;
          const isDragging = dragIndex === index;

          return (
            <Pressable
              key={String(item?.id ?? index)}
              onPress={() => handleRowPress(index)}
              onPointerEnter={Platform.OS === 'web' ? () => handleGripPointerEnter(index) : undefined}
              style={({ pressed, hovered }) => [
                styles.row,
                isSelected && styles.rowSelected,
                isDragging && styles.rowDragging,
                (pressed || hovered) && !isSelected ? styles.rowPressed : null,
              ]}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{index + 1}</Text>
              </View>

              <Text style={styles.label} numberOfLines={2}>
                {label}
              </Text>

              <Pressable
                onPressIn={() => handleGripPointerDown(index)}
                onPress={(event) => event.stopPropagation?.()}
                style={({ pressed }) => [styles.grip, pressed && styles.gripPressed]}
                accessibilityLabel={isArabic ? 'سحب لإعادة الترتيب' : 'גרור לשינוי סדר'}
              >
                <Ionicons name="swap-vertical" size={20} color={isSelected ? '#1E4FBF' : '#64748B'} />
              </Pressable>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 10 },
  helper: {
    color: '#52678F',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  list: { gap: 10 },
  empty: {
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    minHeight: 62,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5ECFF',
    backgroundColor: '#FFFFFF',
  },
  rowSelected: {
    borderColor: '#2455D6',
    borderWidth: 2,
    backgroundColor: '#F3F7FF',
    shadowColor: '#2455D6',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowDragging: {
    borderColor: '#1E4FBF',
    backgroundColor: '#EAF0FF',
  },
  rowPressed: { borderColor: '#C9D8FF' },
  badge: {
    minWidth: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EAF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: { color: '#1E4FBF', fontWeight: '900', fontSize: 16 },
  label: {
    flex: 1,
    minWidth: 0,
    fontWeight: '800',
    color: '#102A68',
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  grip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5ECFF',
  },
  gripPressed: { backgroundColor: '#EAF0FF', borderColor: '#C9D8FF' },
});
