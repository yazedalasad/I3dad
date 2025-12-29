import { fireEvent, render } from '@testing-library/react-native';
import ActivityDetailsModal from './ActivityDetailsModal';

const mockActivity = {
  id: '1',
  title_ar: 'ورشة برمجة',
  description_ar: 'تعلم أساسيات البرمجة',
  image: 'https://example.com/img.jpg',
  price: 0,
  registered: 5,
  capacity: 10,
  isRegistered: false,
};

describe('ActivityDetailsModal (unit/component tests)', () => {
  // ✅ Positive 1: renders nothing when activity is null
  it('renders safely when activity is null', () => {
    const { toJSON } = render(
      <ActivityDetailsModal visible={true} activity={null} />
    );
    expect(toJSON()).toBeTruthy();
  });

  // ✅ Positive 2: renders activity title and description
  it('renders activity title and description', () => {
    const { getByText } = render(
      <ActivityDetailsModal visible={true} activity={mockActivity} />
    );

    expect(getByText('ورشة برمجة')).toBeTruthy();
    expect(getByText('تعلم أساسيات البرمجة')).toBeTruthy();
  });

  // ✅ Positive 3: shows Register button when not registered
  it('shows Register button when not registered', () => {
    const { getByText } = render(
      <ActivityDetailsModal visible={true} activity={mockActivity} />
    );

    expect(getByText('Register')).toBeTruthy();
  });

  // ❌ Negative 1: clicking register does not crash when handler missing
  it('does not crash when onToggleRegister is missing', () => {
    const { getByText } = render(
      <ActivityDetailsModal visible={true} activity={mockActivity} />
    );

    expect(() => fireEvent.press(getByText('Register'))).not.toThrow();
  });

  // ❌ Negative 2: clicking close calls onClose
  it('calls onClose when Close button is pressed', () => {
    const onClose = jest.fn();

    const { getByText } = render(
      <ActivityDetailsModal
        visible={true}
        activity={mockActivity}
        onClose={onClose}
      />
    );

    fireEvent.press(getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
