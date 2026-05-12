import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ArabicPoetPuzzleHomeScreen from './ArabicPoetPuzzleHomeScreen';
import { getCompletedArabicPoetPuzzleLevels } from '../services/levelProgressService';
import { getStudentGameSessions } from '../../shared/services/gameSessionService';

jest.mock('../services/levelProgressService', () => ({
  getCompletedArabicPoetPuzzleLevels: jest.fn(),
}));

jest.mock('../../shared/services/gameSessionService', () => ({
  getStudentGameSessions: jest.fn(),
}));

describe('ArabicPoetPuzzleHomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCompletedArabicPoetPuzzleLevels.mockResolvedValue([]);
    getStudentGameSessions.mockResolvedValue([]);
  });

  test('POSITIVE: renders word treasures home and level one', async () => {
    const { findByText } = render(<ArabicPoetPuzzleHomeScreen navigation={{}} studentId="student-1" />);

    expect(await findByText('كنوز الألفاظ')).toBeTruthy();
    expect(await findByText(/المستوى الأول/)).toBeTruthy();
  });

  test('POSITIVE: opens the first unlocked level', async () => {
    const navigation = { navigate: jest.fn() };
    const { findByText } = render(<ArabicPoetPuzzleHomeScreen navigation={navigation} studentId="student-1" />);

    fireEvent.press(await findByText('ابدأ المستوى 1'));

    expect(navigation.navigate).toHaveBeenCalledWith('ArabicPoetPuzzleLevel', {
      levelId: 'arabic_poet_puzzle_level_1',
      studentId: 'student-1',
    });
  });

  test('NEGATIVE: keeps later levels locked until previous level is complete', async () => {
    const navigation = { navigate: jest.fn() };
    const { findByText } = render(<ArabicPoetPuzzleHomeScreen navigation={navigation} studentId="student-1" />);

    fireEvent.press(await findByText('المستوى 2 مقفل'));

    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  test('NEGATIVE: falls back to no completed levels when progress loading fails', async () => {
    getCompletedArabicPoetPuzzleLevels.mockRejectedValueOnce(new Error('storage failed'));
    getStudentGameSessions.mockRejectedValueOnce(new Error('sessions failed'));
    const navigation = { navigate: jest.fn() };
    const { findByText } = render(<ArabicPoetPuzzleHomeScreen navigation={navigation} studentId="student-1" />);

    await waitFor(() => {
      expect(getCompletedArabicPoetPuzzleLevels).toHaveBeenCalledWith('student-1');
    });

    fireEvent.press(await findByText('المستوى 2 مقفل'));

    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
