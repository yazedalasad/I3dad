import { render } from '@testing-library/react-native';
import FeatureCard from './FeatureCard';

describe('FeatureCard', () => {
  const feature = {
    icon: 'star',
    title: 'Test Title',
    description: 'Test Description',
  };

  // ✅ Positive
  it('renders title and description', () => {
    const { getByText } = render(<FeatureCard feature={feature} />);
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Description')).toBeTruthy();
  });

  // ✅ Positive
  it('renders icon', () => {
    const { getByText } = render(<FeatureCard feature={feature} />);
    expect(getByText('icon:star')).toBeTruthy();
  });

  // ❌ Negative
  it('throws error when feature is missing', () => {
    expect(() => render(<FeatureCard />)).toThrow();
  });

  // ❌ Negative
  it('handles empty feature fields', () => {
    const { queryByText } = render(
      <FeatureCard feature={{ icon: '', title: '', description: '' }} />
    );
    expect(queryByText('Test Title')).toBeNull();
    expect(queryByText('Test Description')).toBeNull();
  });
});
