const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

function readProjectFile(relativePath) {
  const filePath = path.join(rootDir, ...relativePath.split('/'));
  expect(fs.existsSync(filePath)).toBe(true);
  return fs.readFileSync(filePath, 'utf8');
}

describe('security QA regressions', () => {
  test('admin-sensitive edge functions do not trust user_metadata.role', () => {
    [
      'supabase/functions/create-principal/index.ts',
      'supabase/functions/create-student/index.ts',
      'supabase/functions/update-student/index.ts',
      'supabase/functions/delete-student/index.ts',
      'supabase/functions/_shared/principalInvitation.ts',
    ].forEach((relativePath) => {
      const source = readProjectFile(relativePath);
      expect(source).not.toContain('user_metadata?.role');
      expect(source).not.toContain("user_metadata' ->> 'role'");
      expect(source).not.toContain("user_metadata'::text) ->> 'role'");
    });
  });

  test('environment example separates public and server-only Supabase keys', () => {
    const envExample = readProjectFile('.env.example');
    expect(envExample).toContain('EXPO_PUBLIC_SUPABASE_URL=');
    expect(envExample).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY=');
    expect(envExample).toContain('SUPABASE_SERVICE_ROLE_KEY=');
    expect(envExample).toContain('PROJECT_SERVICE_ROLE_KEY=');
    expect(envExample).toContain('Never expose this in frontend code');
  });

  test('README documents required setup and verification commands', () => {
    const readme = readProjectFile('README.md');
    expect(readme).toContain('npm install');
    expect(readme).toContain('npx expo start');
    expect(readme).toContain('npm test -- --runInBand');
    expect(readme).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(readme).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  });
});
