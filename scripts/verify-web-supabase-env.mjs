/**
 * Verifies EXPO_PUBLIC_SUPABASE_* were inlined into the web export bundle.
 * Usage: node scripts/verify-web-supabase-env.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before export.');
  process.exit(1);
}

const files = walk(distDir);
if (!files.length) {
  console.error('No dist/*.js found. Run: npx expo export --platform web --clear');
  process.exit(1);
}

const urlHost = url.replace(/^https?:\/\//, '').split('/')[0];
let foundUrl = false;
let foundKey = false;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes(url) || text.includes(urlHost)) foundUrl = true;
  if (text.includes(key)) foundKey = true;
}

if (foundUrl && foundKey) {
  console.log('OK: Supabase env appears inlined in dist bundle.');
  process.exit(0);
}

console.error('FAIL: Supabase env NOT found in dist bundle.');
console.error('  URL in bundle:', foundUrl);
console.error('  ANON_KEY in bundle:', foundKey);
console.error('Re-run export with production env (eas env:exec --environment production).');
process.exit(1);
