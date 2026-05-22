describe('supabaseEnv inlining symbols', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('reads EXPO_PUBLIC_* via direct process.env', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';

    const { supabaseUrl, supabaseAnonKey } = require('./supabaseEnv');
    expect(supabaseUrl).toBe('https://test.supabase.co');
    expect(supabaseAnonKey).toBe('anon-test');
  });
});
