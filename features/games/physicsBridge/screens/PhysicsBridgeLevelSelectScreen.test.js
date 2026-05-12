import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import PhysicsBridgeLevelSelectScreen from './PhysicsBridgeLevelSelectScreen';
import { getPhysicsBridgeProgress } from '../utils/bridgeProgressStorage';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'ar' },
  }),
}));

jest.mock('../../../../i18n/index.js', () => ({
  language: 'ar',
}));

jest.mock('../utils/bridgeProgressStorage', () => ({
  getPhysicsBridgeProgress: jest.fn(),
}));

describe('PhysicsBridgeLevelSelectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    getPhysicsBridgeProgress.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('POSITIVE: renders physics bridge levels', async () => {
    const { findByText } = render(<PhysicsBridgeLevelSelectScreen studentId="student-1" />);

    expect(await findByText('المستوى 1: جسر بسيط')).toBeTruthy();
    expect(await findByText('المستوى 2: جسر فوق الوادي')).toBeTruthy();
  });

  test('POSITIVE: starts the first unlocked level', async () => {
    const navigateTo = jest.fn();
    const { findByText } = render(<PhysicsBridgeLevelSelectScreen navigateTo={navigateTo} studentId="student-1" />);

    fireEvent.press(await findByText('المستوى 1: جسر بسيط'));

    expect(navigateTo).toHaveBeenCalledWith('physicsBridgeGame', {
      levelId: 'physics_bridge_level_1',
      studentId: 'student-1',
    });
  });

  test('NEGATIVE: blocks locked levels and shows an alert', async () => {
    const navigateTo = jest.fn();
    const { findByText } = render(<PhysicsBridgeLevelSelectScreen navigateTo={navigateTo} studentId="student-1" />);

    fireEvent.press(await findByText('المستوى 2: جسر فوق الوادي'));

    expect(navigateTo).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('أنهِ المستوى السابق أولاً.');
  });

  test('NEGATIVE: treats failed progress loading as empty progress', async () => {
    getPhysicsBridgeProgress.mockRejectedValueOnce(new Error('storage failed'));
    const navigateTo = jest.fn();
    const { findByText } = render(<PhysicsBridgeLevelSelectScreen navigateTo={navigateTo} studentId="student-1" />);

    await waitFor(() => {
      expect(getPhysicsBridgeProgress).toHaveBeenCalledWith('student-1');
    });

    fireEvent.press(await findByText('المستوى 2: جسر فوق الوادي'));

    expect(navigateTo).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('أنهِ المستوى السابق أولاً.');
  });
});
