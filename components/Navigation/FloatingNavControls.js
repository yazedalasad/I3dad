import { FontAwesome } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FloatingNavControls({
  canGoBack = true,
  canGoForward = false,
  onBack,
  onForward,
  hidden = false,
  disabled = false,
  isRTL = false,
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (hidden) return null;

  const isCompact = width < 480;
  const buttonSize = isCompact ? 44 : 48;
  const iconSize = isCompact ? 18 : 20;
  const horizontalInset = isCompact ? 12 : 16;
  const bottom = Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 8) + 10;

  const backIcon = isRTL ? 'arrow-right' : 'arrow-left';
  const forwardIcon = isRTL ? 'arrow-left' : 'arrow-right';

  const backEnabled = canGoBack && !disabled;
  const forwardEnabled = canGoForward && !disabled;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Forward"
        accessibilityState={{ disabled: !forwardEnabled }}
        disabled={!forwardEnabled}
        onPress={onForward}
        style={({ pressed }) => [
          styles.button,
          styles.forwardButton,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            bottom,
            left: horizontalInset + insets.left,
          },
          !forwardEnabled && styles.buttonDisabled,
          pressed && forwardEnabled && styles.buttonPressed,
        ]}
      >
        <FontAwesome
          name={forwardIcon}
          size={iconSize}
          color={forwardEnabled ? '#15803d' : '#94a3b8'}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        accessibilityState={{ disabled: !backEnabled }}
        disabled={!backEnabled}
        onPress={onBack}
        style={({ pressed }) => [
          styles.button,
          styles.backButton,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            bottom,
            right: horizontalInset + insets.right,
          },
          !backEnabled && styles.buttonDisabled,
          pressed && backEnabled && styles.buttonPressed,
        ]}
      >
        <FontAwesome
          name={backIcon}
          size={iconSize}
          color={backEnabled ? '#15803d' : '#94a3b8'}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 900,
    elevation: 900,
  },
  button: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d7e2ef',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  backButton: {
    backgroundColor: '#ffffff',
  },
  forwardButton: {
    backgroundColor: '#f0fdf4',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: '#ecfdf5',
  },
});
