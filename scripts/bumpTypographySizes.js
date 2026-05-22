/**
 * Bump undersized fontSize values project-wide.
 * Run: node scripts/bumpTypographySizes.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SKIP_DIRS = new Set([
  'node_modules',
  'coverage',
  'dist',
  'web-build',
  '.expo',
  '.git',
  '.expo-web-check',
]);

const REPLACEMENTS = [
  [/fontSize:\s*10\b/g, 'fontSize: 14'],
  [/fontSize:\s*11\b/g, 'fontSize: 14'],
  [/fontSize:\s*12\b/g, 'fontSize: 16'],
  [/fontSize:\s*13\b/g, 'fontSize: 16'],
  [/fontSize:\s*14\b/g, 'fontSize: 16'],
  [/fontSize:\s*15\b/g, 'fontSize: 17'],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

let changedFiles = 0;
let totalReplacements = 0;

for (const file of walk(root)) {
  if (file.includes('bumpTypographySizes.js') || file.includes('src/theme/typography.js')) continue;
  let content = fs.readFileSync(file, 'utf8');
  let next = content;
  let fileHits = 0;
  for (const [re, replacement] of REPLACEMENTS) {
    const matches = next.match(re);
    if (matches) {
      fileHits += matches.length;
      next = next.replace(re, replacement);
    }
  }
  if (next !== content) {
    fs.writeFileSync(file, next, 'utf8');
    changedFiles += 1;
    totalReplacements += fileHits;
    console.log(`updated ${path.relative(root, file)} (${fileHits})`);
  }
}

console.log(`Done: ${changedFiles} files, ~${totalReplacements} replacements`);
