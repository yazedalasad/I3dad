const mockCreateClient = jest.fn(() => ({ mocked: true }));

jest.mock('@supabase/supabase-js', () => ({
  __esModule: true,
  createClient: (...args) => mockCreateClient(...args),
}));

describe('supabase client configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockCreateClient.mockClear();
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('prefers Expo public environment variables when provided', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://env-project.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'env-anon-key';

    jest.isolateModules(() => {
      require('./supabase');
    });

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://env-project.supabase.co',
      'env-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        }),
      })
    );
  });

  test('keeps a fallback client config for existing local setups', () => {
    jest.isolateModules(() => {
      require('./supabase');
    });

    const [url, anonKey] = mockCreateClient.mock.calls[0];
    expect(url).toMatch(/^https:\/\/.+\.supabase\.co$/);
    expect(anonKey).toEqual(expect.any(String));
    expect(anonKey.length).toBeGreaterThan(20);
  });
});
