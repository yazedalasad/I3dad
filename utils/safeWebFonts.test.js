/** @jest-environment node */

describe('safeWebFonts', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('installSafeWebFontLoading is a no-op on non-web', () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }));
    const { installSafeWebFontLoading } = require('./safeWebFonts');
    expect(() => installSafeWebFontLoading()).not.toThrow();
  });

  test('patches ExpoFontLoader.loadAsync on web to swallow rejections', async () => {
    const loadAsync = jest.fn(() => Promise.reject(new Error('6000ms timeout exceeded')));
    const ExpoFontLoader = { loadAsync };

    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
    }));
    jest.doMock('expo-modules-core', () => ({
      requireNativeModule: () => ExpoFontLoader,
    }));

    const { installSafeWebFontLoading } = require('./safeWebFonts');
    installSafeWebFontLoading();

    await expect(ExpoFontLoader.loadAsync('FontAwesome', { uri: 'x' })).resolves.toBeUndefined();
    expect(loadAsync).toHaveBeenCalled();
  });
});
