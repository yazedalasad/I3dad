import { Platform } from 'react-native';
import { Stack } from 'expo-router';

import { installSafeWebFontLoading } from '../utils/safeWebFonts';

if (Platform.OS === 'web') {
  installSafeWebFontLoading();
}

export default function RootLayout() {  return <Stack screenOptions={{ headerShown: false }} />;
}
