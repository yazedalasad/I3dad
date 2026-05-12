import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const LANG_OPTIONS = [
  { code: 'ar', label: 'AR' },
  { code: 'he', label: 'HE' },
];

function normalizeLanguage(lang) {
  const value = String(lang || '').toLowerCase();
  return value.startsWith('he') ? 'he' : 'ar';
}

export default function FloatingLanguageSwitcher({ inline = false }) {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(normalizeLanguage(i18n.language));
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setCurrentLang(normalizeLanguage(i18n.language));
  }, [i18n.language]);

  const orderedOptions = useMemo(() => {
    const activeOption = LANG_OPTIONS.find((option) => option.code === currentLang);
    const inactiveOptions = LANG_OPTIONS.filter((option) => option.code !== currentLang);
    return activeOption ? [activeOption, ...inactiveOptions] : LANG_OPTIONS;
  }, [currentLang]);

  const changeLanguage = async (lang) => {
    const normalizedLang = normalizeLanguage(lang);

    try {
      await i18n.changeLanguage(normalizedLang);
      setCurrentLang(normalizedLang);

      const isRTL = normalizedLang === 'ar' || normalizedLang === 'he';
      if (I18nManager.isRTL !== isRTL) {
        I18nManager.forceRTL(isRTL);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsExpanded(false);
    }
  };

  return (
    <View style={[styles.wrapper, inline && styles.wrapperInline]} pointerEvents="box-none">
      <View style={[styles.container, inline && styles.containerInline]}>
        <View style={styles.segmentedControl}>
          {(isExpanded ? orderedOptions : orderedOptions.slice(0, 1)).map((option) => {
            const isActive = currentLang === option.code;
            const isCurrentOnlyButton = !isExpanded && isActive;

            return (
              <TouchableOpacity
                key={option.code}
                accessibilityRole="button"
                accessibilityLabel={
                  isCurrentOnlyButton
                    ? `Current language ${option.label}`
                    : `Switch language to ${option.label}`
                }
                testID={`floating-language-${option.code}`}
                style={[styles.segmentButton, isActive && styles.activeSegmentButton]}
                onPress={() => {
                  if (isCurrentOnlyButton) {
                    i18n.changeLanguage(normalizeLanguage(option.code)).catch((error) => {
                      console.error('Error changing language:', error);
                    });
                    setIsExpanded(true);
                    return;
                  }

                  changeLanguage(option.code);
                }}
              >
                <Text style={[styles.segmentText, isActive && styles.activeSegmentText]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.badgeIcon} testID="floating-language-indicator" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: Platform.select({ web: 8, default: 36 }),
    left: 0,
    zIndex: 9999,
  },
  wrapperInline: {
    position: 'relative',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  container: {
    padding: 4,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.9)',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  containerInline: {
    borderRadius: 18,
  },
  badgeIcon: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#1f9d62',
    borderWidth: 2,
    borderColor: '#cdeedc',
  },
  segmentedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: 14,
    backgroundColor: '#e8eef5',
    gap: 4,
  },
  segmentButton: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 11,
  },
  activeSegmentButton: {
    backgroundColor: '#1f9d62',
    shadowColor: '#1f9d62',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#51657a',
    letterSpacing: 0.6,
  },
  activeSegmentText: {
    color: '#ffffff',
  },
});
