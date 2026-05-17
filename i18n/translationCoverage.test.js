import arForm from './locales/ar/components/form.json';
import heForm from './locales/he/components/form.json';
import arStudentInsightReport from './locales/ar/screens/StudentInsightReport.json';
import heStudentInsightReport from './locales/he/screens/StudentInsightReport.json';

const requiredFormKeys = [
  'picker.placeholder',
  'picker.titleFallback',
  'datePicker.placeholder',
  'datePicker.modalTitleFallback',
  'datePicker.ageRangeSuffix',
  'datePicker.validation.minAge',
  'datePicker.validation.maxAge',
];

const requiredInsightKeys = [
  'heroEyebrow',
  'heroSubtitle',
  'downloadPdf',
  'student',
  'personalitySection',
  'abilitySection',
  'interestSection',
  'pathsSection',
  'missingStudentId',
  'loadFailed',
];

function getByPath(object, keyPath) {
  return keyPath.split('.').reduce((current, key) => current?.[key], object);
}

function expectKeys(resource, keys) {
  keys.forEach((key) => {
    expect(getByPath(resource, key)).toEqual(expect.any(String));
    expect(getByPath(resource, key).trim().length).toBeGreaterThan(0);
  });
}

describe('translation coverage for shared form and report UI', () => {
  test('Arabic and Hebrew form resources contain required picker/date keys', () => {
    expectKeys(arForm, requiredFormKeys);
    expectKeys(heForm, requiredFormKeys);
  });

  test('Arabic and Hebrew student insight report resources contain required keys', () => {
    expectKeys(arStudentInsightReport, requiredInsightKeys);
    expectKeys(heStudentInsightReport, requiredInsightKeys);
  });
});
