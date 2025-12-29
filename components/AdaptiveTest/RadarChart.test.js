import { render } from '@testing-library/react-native';
import RadarChart from './RadarChart';

describe('RadarChart', () => {
  test('renders empty state when no data provided', () => {
    const { getByText } = render(<RadarChart />);
    expect(getByText('لا توجد بيانات كافية لعرض الرسم.')).toBeTruthy();
  });

  test('renders chart when abilities exist', () => {
    const abilities = [
      { ability_score: 80, subjects: { name_ar: 'رياضيات' } },
      { ability_score: 60, subjects: { name_ar: 'لغة عربية' } },
    ];

    const { getByText } = render(<RadarChart abilities={abilities} />);

    expect(getByText('خريطة القدرات حسب المواد')).toBeTruthy();
    expect(getByText('رياضيات')).toBeTruthy();
    expect(getByText('80%')).toBeTruthy();
  });
});
