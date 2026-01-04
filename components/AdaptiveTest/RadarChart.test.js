// components/AdaptiveTest/RadarChart.test.js
import { render } from '@testing-library/react-native';

/**
 * =========================================================
 * Local-only mocks (DO NOT touch jest.setup.js)
 * =========================================================
 *
 * Fixes:
 * - Jest does NOT allow jest.mock factories to access out-of-scope vars.
 * - So we use globalThis.__TEST_LANG__ (allowed, in-scope via globalThis).
 *
 * RadarChart uses:
 *   const { t: rawT, i18n } = useTranslation();
 *   i18n.language
 * so we must supply i18n.language + changeLanguage.
 */

// default language for tests
globalThis.__TEST_LANG__ = 'ar';

/* -------------------- i18n mock -------------------- */
jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    // return key so component uses its own Arabic/Hebrew fallbacks
    t: (key) => key,
    i18n: {
      get language() {
        return globalThis.__TEST_LANG__;
      },
      changeLanguage: jest.fn(() => Promise.resolve()),
    },
  }),
}));

/* -------------------- import AFTER mocks -------------------- */
import RadarChart from './RadarChart';

describe('RadarChart', () => {
  beforeEach(() => {
    globalThis.__TEST_LANG__ = 'ar';
    jest.clearAllMocks();
  });

  test('renders empty state in Arabic when no data provided', () => {
    globalThis.__TEST_LANG__ = 'ar';

    const { getByText } = render(<RadarChart />);

    // Arabic fallback empty-state string from RadarChart.js
    expect(getByText('لا توجد بيانات كافية لعرض الرسم.')).toBeTruthy();
  });

  test('renders chart (abilities mode) in Arabic with title + labels + percent', () => {
    globalThis.__TEST_LANG__ = 'ar';

    const abilities = [
      { ability_score: 80, subjects: { name_ar: 'رياضيات' } },
      { ability_score: 60, subjects: { name_ar: 'لغة عربية' } },
    ];

    const { getByText } = render(<RadarChart abilities={abilities} />);

    // Arabic fallback title
    expect(getByText('خريطة القدرات حسب المواد')).toBeTruthy();

    // labels
    expect(getByText('رياضيات')).toBeTruthy();
    expect(getByText('لغة عربية')).toBeTruthy();

    // percents
    expect(getByText('80%')).toBeTruthy();
    expect(getByText('60%')).toBeTruthy();

    // badge (Arabic): "أفضل {{n}}"
    expect(getByText('أفضل 2')).toBeTruthy();

    // legend
    expect(getByText('نقاط الأداء')).toBeTruthy();
    expect(getByText('مستويات (20–100)')).toBeTruthy();
  });

  test('renders chart (labels+values mode) in Arabic', () => {
    globalThis.__TEST_LANG__ = 'ar';

    const labels = ['Math', 'Physics', 'CS'];
    const values = [90, 55, 10];

    const { getByText } = render(<RadarChart labels={labels} values={values} />);

    expect(getByText('خريطة القدرات حسب المواد')).toBeTruthy();

    // labels appear as-is
    expect(getByText('Math')).toBeTruthy();
    expect(getByText('Physics')).toBeTruthy();
    expect(getByText('CS')).toBeTruthy();

    // percents
    expect(getByText('90%')).toBeTruthy();
    expect(getByText('55%')).toBeTruthy();
    expect(getByText('10%')).toBeTruthy();

    // badge length = 3
    expect(getByText('أفضل 3')).toBeTruthy();
  });

  test('renders empty state in Hebrew when language is he', () => {
    globalThis.__TEST_LANG__ = 'he';

    const { getByText } = render(<RadarChart />);

    // Hebrew fallback empty-state string from RadarChart.js
    expect(getByText('אין מספיק נתונים כדי להציג את התרשים.')).toBeTruthy();
  });

  test('renders chart title in Hebrew when language is he', () => {
    globalThis.__TEST_LANG__ = 'he';

    const abilities = [
      { ability_score: 70, subjects: { name_he: 'מתמטיקה', name_en: 'Math' } },
      { ability_score: 40, subjects: { name_he: 'עברית', name_en: 'Hebrew' } },
    ];

    const { getByText } = render(<RadarChart abilities={abilities} />);

    // Hebrew fallback title
    expect(getByText('מפת יכולות לפי מקצועות')).toBeTruthy();

    // Hebrew labels
    expect(getByText('מתמטיקה')).toBeTruthy();
    expect(getByText('עברית')).toBeTruthy();

    // percents
    expect(getByText('70%')).toBeTruthy();
    expect(getByText('40%')).toBeTruthy();

    // badge (Hebrew): "מובילים {{n}}"
    expect(getByText('מובילים 2')).toBeTruthy();

    // legend Hebrew fallbacks
    expect(getByText('נקודות ביצוע')).toBeTruthy();
    expect(getByText('רמות (20–100)')).toBeTruthy();
  });
});
