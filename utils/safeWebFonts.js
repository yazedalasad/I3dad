import { Platform } from 'react-native';

let patched = false;

/**
 * Prevent FontFaceObserver / expo-font timeouts from crashing the web app.
 * @expo/vector-icons loads icon fonts via expo-font → ExpoFontLoader (FontFaceObserver, 6s).
 */
export function installSafeWebFontLoading() {
  if (patched || Platform.OS !== 'web') return;
  patched = true;

  try {
    const { requireNativeModule } = require('expo-modules-core');
    const ExpoFontLoader = requireNativeModule('ExpoFontLoader');

    if (!ExpoFontLoader?.loadAsync || ExpoFontLoader.__i3dadSafeWebPatched) {
      return;
    }

    const originalLoadAsync = ExpoFontLoader.loadAsync.bind(ExpoFontLoader);

    ExpoFontLoader.loadAsync = function safeLoadAsync(...args) {
      return Promise.resolve(originalLoadAsync(...args)).catch((error) => {
        console.warn(
          '[fonts] Web font load failed, continuing with fallback fonts:',
          error?.message || error
        );
      });
    };

    ExpoFontLoader.__i3dadSafeWebPatched = true;
  } catch (error) {
    console.warn('[fonts] Could not patch ExpoFontLoader:', error?.message || error);
  }
}

/** Best-effort preload of icon fonts used across the app. */
export async function preloadWebIconFonts() {
  if (Platform.OS !== 'web') return;

  installSafeWebFontLoading();

  try {
    const { FontAwesome, Ionicons } = require('@expo/vector-icons');
    const tasks = [];

    if (typeof FontAwesome?.loadFont === 'function') {
      tasks.push(FontAwesome.loadFont());
    }
    if (typeof Ionicons?.loadFont === 'function') {
      tasks.push(Ionicons.loadFont());
    }

    await Promise.allSettled(tasks);
  } catch (error) {
    console.warn('[fonts] Icon font preload failed:', error?.message || error);
  }
}
