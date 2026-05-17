import fs from 'fs';
import path from 'path';

const gamesDir = path.resolve(__dirname);

function collectJsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJsFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

describe('game student id safety', () => {
  test('does not fall back to a fake demo student id', () => {
    const offenders = collectJsFiles(gamesDir)
      .filter((filePath) => !filePath.endsWith('studentIdSafety.test.js'))
      .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('demo-student-id'));

    expect(offenders.map((filePath) => path.relative(gamesDir, filePath))).toEqual([]);
  });
});
