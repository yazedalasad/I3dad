const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const qaDir = path.join(rootDir, 'qa');

function readQaFile(fileName) {
  return fs.readFileSync(path.join(qaDir, fileName), 'utf8');
}

describe('QA documentation artifacts', () => {
  test('keeps the presentation QA files in the project', () => {
    [
      'ADVANCED_QA_REPORT.md',
      'QA_TEST_MATRIX.md',
      'E2E_SCENARIOS.md',
      'DEMO_CHECKLIST.md',
    ].forEach((fileName) => {
      expect(fs.existsSync(path.join(qaDir, fileName))).toBe(true);
    });
  });

  test('covers the requested QA categories in the test matrix', () => {
    const matrix = readQaFile('QA_TEST_MATRIX.md');
    [
      'Integration Testing',
      'Environment Testing',
      'System Testing',
      'End-to-End Testing',
      'Regression Testing',
      'Deployment Testing',
      'Smoke Testing',
      'Sanity Testing',
      'Functional Testing',
      'Authentication Testing',
      'Authorization Testing',
      'Supabase RLS Testing',
      'Database Testing',
      'UI/UX Testing',
      'Localization Testing',
      'Accessibility Testing',
      'Security Testing',
      'Performance Testing',
      'Error Handling Testing',
      'Data Quality Testing',
      'Compatibility Testing',
      'Acceptance Testing',
      'Documentation Testing',
      'Code Quality Testing',
    ].forEach((category) => {
      expect(matrix).toContain(category);
    });
  });

  test('documents the core demo flows', () => {
    const scenarios = readQaFile('E2E_SCENARIOS.md');
    [
      'Student Full Assessment Flow',
      'Student Only Plays Games',
      'Principal Invitation And Dashboard',
      'Admin Full Platform Management',
      'Game Save And Recommendation Update',
      'Language And Direction',
    ].forEach((scenario) => {
      expect(scenarios).toContain(scenario);
    });
  });
});
