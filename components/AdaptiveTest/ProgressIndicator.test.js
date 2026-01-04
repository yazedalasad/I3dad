// components/AdaptiveTest/ProgressIndicator.test.js
import { render } from '@testing-library/react-native';
import ProgressIndicator from './ProgressIndicator';

/* =========================================================
   i18n mock – REQUIRED (component reads i18n.language)
========================================================= */
globalThis.__TEST_LANG__ = 'ar';

jest.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({
    // return key so component uses its fallback strings
    t: (key) => key,
    i18n: {
      get language() {
        return globalThis.__TEST_LANG__;
      },
      changeLanguage: jest.fn(),
    },
  }),
}));

/* =========================================================
   IRT mock
========================================================= */
jest.mock('../../utils/irt/irtCalculations', () => ({
  thetaToPercentage: jest.fn(() => 60),
}));

/* =========================================================
   Icons mock
========================================================= */
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    FontAwesome: ({ name }) => <Text>{name}</Text>,
  };
});

describe('ProgressIndicator', () => {
  beforeEach(() => {
    globalThis.__TEST_LANG__ = 'ar';
    jest.clearAllMocks();
  });

  /* -------------------------------------------------------
     SUBJECT PROVIDED
  -------------------------------------------------------- */
  test('renders subject name, progress numbers, and ability percent', () => {
    const { getByText } = render(
      <ProgressIndicator
        current={3}
        total={10}
        subjectName="Math"
        correctCount={2}
        incorrectCount={1}
        skippedCount={0}
      />
    );

    expect(getByText('Math')).toBeTruthy();
    expect(getByText('3/10')).toBeTruthy();
    expect(getByText('60%')).toBeTruthy();
  });

  /* -------------------------------------------------------
     SUBJECT MISSING (DEFAULT TITLE)
  -------------------------------------------------------- */
  test('renders Arabic default title when subjectName is missing', () => {
    const { getByText } = render(<ProgressIndicator />);

    // Because language is Arabic and t(key) === key,
    // the fallback title is used:
    //   "التقدّم"
    expect(getByText('التقدّم')).toBeTruthy();
  });

  /* -------------------------------------------------------
     HEBREW MODE
  -------------------------------------------------------- */
  test('renders Hebrew default title when language is he', () => {
    globalThis.__TEST_LANG__ = 'he';

    const { getByText } = render(<ProgressIndicator />);

    expect(getByText('התקדמות')).toBeTruthy();
  });
});
