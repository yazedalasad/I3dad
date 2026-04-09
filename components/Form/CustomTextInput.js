import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CustomTextInput({
  label,
  labelKey, // ✅ NEW: i18n key for label (optional)
  labelParams, // ✅ NEW: params for label (optional)

  value,
  onChangeText,

  placeholder,
  placeholderKey, // ✅ NEW: i18n key for placeholder (optional)
  placeholderParams, // ✅ NEW: params for placeholder (optional)

  error,
  icon,
  secureTextEntry,
  keyboardType = 'default',
  multiline = false,
  editable = true,
  maxLength,
}) {
  const { t } = useTranslation();

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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
        ? t(placeholderKey, placeholderParams)
        : '';

  return (
    <View style={styles.container}>
      {(resolvedLabel || label) ? <Text style={styles.label}>{resolvedLabel || label}</Text> : null}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          !editable && styles.inputContainerDisabled,
        ]}
      >
        {icon && (
          <FontAwesome
            name={icon}
            size={20}
            color={error ? '#e74c3c' : isFocused ? '#27ae60' : '#94A3B8'}
            style={styles.icon}
          />
        )}

        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            !editable && styles.inputDisabled,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={resolvedPlaceholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          textAlign="right"
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
            accessibilityRole="button"
            accessibilityLabel={t('common.togglePasswordVisibility', { defaultValue: 'הצג/הסתר סיסמה' })}
          >
            <FontAwesome
              name={isPasswordVisible ? 'eye' : 'eye-slash'}
              size={20}
              color="#94A3B8"
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={14} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputContainerFocused: {
    borderColor: '#27ae60',
    backgroundColor: '#f0fdf4',
  },
  inputContainerError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fef2f2',
  },
  inputContainerDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  icon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    paddingVertical: 12,
    textAlign: 'right',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    color: '#94A3B8',
  },
  eyeIcon: {
    padding: 8,
    marginRight: -8,
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
});
