import { I18nManager, Platform } from 'react-native';

/** @typedef {'normal' | 'large'} FontScaleKey */

export const FONT_SCALE_STORAGE_KEY = 'app_font_scale';

export const FONT_SCALES = {
  normal: 1,
  large: 1.1,
};

/** Minimum readable sizes — exam + RTL tuned */
export const typography = {
  tiny: 14,
  badge: 16,
  helper: 16,
  body: 18,
  bodyStrong: 19,
  cardTitle: 21,
  sectionTitle: 24,
  screenTitle: 30,
  heroTitle: 32,
  question: 26,
  answer: 22,
  button: 20,
  stat: 24,
  navLabel: 17,
  timer: 21,
  /** @deprecated use named keys above */
  xs: 14,
  sm: 16,
  bodyLarge: 19,
  heroTitleLegacy: 32,
  statNumber: 32,
};

export const lineHeights = {
  tiny: 20,
  badge: 22,
  helper: 24,
  body: 26,
  bodyStrong: 28,
  cardTitle: 28,
  sectionTitle: 32,
  screenTitle: 38,
  heroTitle: 40,
  question: 36,
  answer: 30,
  button: 28,
  stat: 32,
  navLabel: 24,
  timer: 28,
  xs: 20,
  sm: 24,
  bodyLarge: 28,
  statNumber: 38,
};

export const textColors = {
  primary: '#0B1220',
  secondary: '#1E293B',
  muted: '#334155',
  subtle: '#475569',
  inverse: '#FFFFFF',
  link: '#166534',
  danger: '#B91C1C',
  onPrimary: '#F8FAFC',
  onHero: '#EAF0FF',
  onHeroMuted: '#DDE7FF',
};

export const touchTargets = {
  buttonMinHeight: 48,
  examButtonMinHeight: 56,
  inputMinHeight: 48,
  answerOptionMinHeight: 64,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

let runtimeScale = FONT_SCALES.normal;

export function setFontScale(scaleKey = 'normal') {
  runtimeScale = FONT_SCALES[scaleKey] ?? FONT_SCALES.normal;
}

export function getFontScale() {
  return runtimeScale;
}

export function scaleSize(size) {
  return Math.round(size * runtimeScale);
}

export function font(sizeKey) {
  const base = typography[sizeKey] ?? typography.body;
  return scaleSize(base);
}

export function lh(sizeKey) {
  const base = lineHeights[sizeKey] ?? lineHeights.body;
  return Math.round(base * runtimeScale);
}

const RTL_BOLD_KEYS = new Set([
  'body',
  'bodyStrong',
  'cardTitle',
  'sectionTitle',
  'screenTitle',
  'heroTitle',
  'question',
  'answer',
  'button',
  'stat',
  'navLabel',
  'helper',
  'bodyLarge',
]);

export function textStyle(sizeKey, options = {}) {
  const isRtl = I18nManager.isRTL;
  const weight =
    options.weight ?? (isRtl && RTL_BOLD_KEYS.has(sizeKey) ? '800' : '700');

  return {
    fontSize: font(sizeKey),
    lineHeight: lh(sizeKey),
    color: options.color ?? textColors.primary,
    fontWeight: weight,
    textAlign: options.align ?? (isRtl ? 'right' : 'left'),
    writingDirection: isRtl ? 'rtl' : 'ltr',
    ...(options.extra || {}),
  };
}

export function bumpLegacyFontSize(value) {
  const map = {
    10: typography.tiny,
    11: typography.tiny,
    12: typography.helper,
    13: typography.body,
    14: typography.helper,
    15: typography.badge,
  };
  return map[value] ?? value;
}

export const webContent = {
  maxWidth: 1280,
  examMaxWidth: 1100,
  paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
};
