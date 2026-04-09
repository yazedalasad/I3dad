import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function CustomButton({
  title,
  titleKey, // ✅ NEW: i18n key (optional)
  titleParams, // ✅ NEW: i18n interpolation params (optional)
  onPress,
  icon,
  variant = 'primary', // primary, secondary, outline
  loading = false,
  disabled = false,
  fullWidth = true,
}) {
  const { t } = useTranslation();

  // ✅ NEW: resolve title from i18n if titleKey is provided (or fallback to title)
  const resolvedTitle =
    typeof title === 'string' && title.length > 0
      ? title
      : titleKey
        ? t(titleKey, titleParams)
        : '';

  const getButtonStyle = () => {
    if (disabled || loading) {
      return [styles.button, styles.buttonDisabled];
    }

    switch (variant) {
      case 'secondary':
        return [styles.button, styles.buttonSecondary];
      case 'outline':
        return [styles.button, styles.buttonOutline];
      default:
        return [styles.button, styles.buttonPrimary];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return [styles.buttonText, styles.buttonTextOutline];
      default:
        return styles.buttonText;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), fullWidth && styles.fullWidth]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={resolvedTitle}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          {icon && (
            <FontAwesome
              name={icon}
              size={18}
              color={variant === 'outline' ? '#27ae60' : '#fff'}
              style={styles.icon}
            />
          )}
          <Text style={getTextStyle()}>{resolvedTitle}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 50,
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },
  buttonPrimary: {
    backgroundColor: '#27ae60',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonSecondary: {
    backgroundColor: '#3498db',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextOutline: {
    color: '#27ae60',
  },
  icon: {
    marginLeft: 8,
  },
});
