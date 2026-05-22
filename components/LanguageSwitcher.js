import { useTranslation } from 'react-i18next';
import { I18nManager, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    
    // Check if RTL needs to change
    const isRTL = lang === 'ar' || lang === 'he';
    if (I18nManager.isRTL !== isRTL) {
      // Note: Changing RTL requires app restart
      console.log('RTL change requires app restart');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          i18n.language === 'ar' && styles.activeButton
        ]}
        onPress={() => changeLanguage('ar')}
      >
        <Text style={styles.flag}>🇵🇸</Text>
        <Text style={[
          styles.buttonText,
          i18n.language === 'ar' && styles.activeButtonText
        ]}>
          العربية
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          i18n.language === 'he' && styles.activeButton
        ]}
        onPress={() => changeLanguage('he')}
      >
        <Text style={styles.flag}>🇮🇱</Text>
        <Text style={[
          styles.buttonText,
          i18n.language === 'he' && styles.activeButtonText
        ]}>
          עברית
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeButton: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  flag: {
    fontSize: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  activeButtonText: {
    color: '#fff',
  },
});
