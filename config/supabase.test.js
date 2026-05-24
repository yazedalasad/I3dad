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
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('hasSupabaseConfig true when EXPO_PUBLIC_* are set', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://env-project.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'env-anon-key';

    let mod;
    jest.isolateModules(() => {
      mod = require('./supabase');
    });

    expect(mod.hasSupabaseConfig).toBe(true);
    expect(mod.supabaseConfigError).toBeNull();
    expect(mod.supabase).toBeTruthy();
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://env-project.supabase.co',
      'env-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: expect.any(Boolean),
        }),
      })
    );
  });

  test('dev fallback client without EXPO_PUBLIC_* in development', () => {
    let mod;
    jest.isolateModules(() => {
      mod = require('./supabase');
    });

    expect(mod.hasSupabaseConfig).toBe(false);
    expect(mod.supabaseConfigError).not.toBeNull();
    expect(mod.supabase).toBeTruthy();
    expect(mockCreateClient).toHaveBeenCalled();
  });

  test('production without env: no client and setup error', () => {
    process.env.NODE_ENV = 'production';

    let mod;
    jest.isolateModules(() => {
      mod = require('./supabase');
    });

    expect(mod.hasSupabaseConfig).toBe(false);
    expect(mod.supabase).toBeNull();
    expect(mod.supabaseConfigError?.missing).toEqual(
      expect.arrayContaining(['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'])
    );
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
