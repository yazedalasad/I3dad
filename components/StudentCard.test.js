import { fireEvent, render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import StudentCard from './StudentCard';

// Make Animated.spring safe in Jest
beforeAll(() => {
  jest.spyOn(Animated, 'spring').mockImplementation(() => ({
    start: jest.fn(),
  }));
});

afterAll(() => {
  Animated.spring.mockRestore?.();
});

describe('StudentCard', () => {
  const student = {
    name: 'Ali',
    degree: 'CS',
    story: 'Success story text',
    job: 'Developer',
  };

  // ✅ Positive 1
  it('renders student info (name + job)', () => {
    const { getByText } = render(<StudentCard student={student} />);
    expect(getByText('Ali')).toBeTruthy();
    expect(getByText('Developer')).toBeTruthy();
  });

  // ✅ Positive 2
  it('triggers animations on touch start/end', () => {
    const { getByText } = render(<StudentCard student={student} />);

    // touch events are attached to the Animated.View, but firing on child text works in practice
    fireEvent(getByText('Ali'), 'touchStart');
    fireEvent(getByText('Ali'), 'touchEnd');

    expect(Animated.spring).toHaveBeenCalled();
  });

  // ❌ Negative 1
  it('throws if student prop is missing', () => {
    expect(() => render(<StudentCard />)).toThrow();
  });

  // ❌ Negative 2
  it('does not render name/job when fields are missing', () => {
    const { queryByText } = render(
      <StudentCard student={{ name: '', degree: '', story: '', job: '' }} />
    );

    expect(queryByText('Ali')).toBeNull();
    expect(queryByText('Developer')).toBeNull();
  });
});
