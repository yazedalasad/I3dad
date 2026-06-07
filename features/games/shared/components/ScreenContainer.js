import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FLOATING_NAV_BOTTOM_INSET } from '../../../../navigation/floatingNavConfig';

export default function ScreenContainer({
  children,
  style,
  scroll = false,
  contentContainerStyle,
  withFloatingNavInset = true,
}) {
  const bottomInset = withFloatingNavInset ? FLOATING_NAV_BOTTOM_INSET : 0;

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        bottomInset > 0 && { paddingBottom: bottomInset + 20 },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={[styles.flex, style]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.container, bottomInset > 0 && { paddingBottom: bottomInset }, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 0,
  },
});
