require('@testing-library/jest-native/extend-expect');
require('react-native-gesture-handler/jestSetup');

// Silence Animated warning in tests
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

const makeSub = () => ({ remove: jest.fn() });

/* ------------------------------------------------------------------
   AppState / Keyboard / BackHandler
------------------------------------------------------------------ */
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  __esModule: true,
  default: {
    currentState: 'active',
    addEventListener: jest.fn(() => makeSub()),
    removeEventListener: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Components/Keyboard/Keyboard', () => ({
  __esModule: true,
  default: {
    addListener: jest.fn(() => makeSub()),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    dismiss: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Utilities/BackHandler', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => makeSub()),
    removeEventListener: jest.fn(),
    exitApp: jest.fn(),
  },
}));

/* ------------------------------------------------------------------
   ✅ FIX Dimensions (this is the important part)
   The real module exports DEFAULT = Dimensions object.
------------------------------------------------------------------ */
jest.mock('react-native/Libraries/Utilities/Dimensions', () => {
  const actual = jest.requireActual('react-native/Libraries/Utilities/Dimensions');

  const mockedDefault = {
    ...(actual?.default ?? actual),
    get: jest.fn(() => ({
      width: 390,
      height: 844,
      scale: 2,
      fontScale: 2,
    })),
    addEventListener: jest.fn(() => makeSub()),
    removeEventListener: jest.fn(),
  };

  return {
    __esModule: true,
    default: mockedDefault,
  };
});

/* ------------------------------------------------------------------
   expo-linear-gradient mock
------------------------------------------------------------------ */
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props) => React.createElement(View, props, props.children),
  };
});

/* ------------------------------------------------------------------
   vector-icons mock
------------------------------------------------------------------ */
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name }) => React.createElement(Text, null, `icon:${name}`);

  return {
    FontAwesome: Icon,
    Ionicons: Icon,
    MaterialIcons: Icon,
    MaterialCommunityIcons: Icon,
  };
});

/* ------------------------------------------------------------------
   i18n mock
------------------------------------------------------------------ */
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (fallback ?? key),
  }),
}));

/* ------------------------------------------------------------------
   ✅ TurboModule "SettingsManager" crash in Jest
------------------------------------------------------------------ */
jest.mock('react-native/Libraries/Settings/NativeSettingsManager', () => ({
  __esModule: true,
  default: {
    getConstants: () => ({ settings: {} }),
  },
}));

/* ------------------------------------------------------------------
   Silence & satisfy NativeEventEmitter warnings/crashes
------------------------------------------------------------------ */
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return function NativeEventEmitter() {
    return {
      addListener: jest.fn(() => makeSub()),
      removeAllListeners: jest.fn(),
      removeSubscription: jest.fn(),
      removeListeners: jest.fn(),
      listenerCount: jest.fn(),
    };
  };
});

/* ------------------------------------------------------------------
   Optional: stop noisy RN warnings during tests
------------------------------------------------------------------ */
jest.spyOn(console, 'warn').mockImplementation(() => {});
