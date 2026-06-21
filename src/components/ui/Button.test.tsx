import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from './Button';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

describe('Button', () => {
  it('renders its label', () => {
    render(<Button label="Book a ride" onPress={() => {}} />);
    expect(screen.getByText('Book a ride')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Button label="Tap" onPress={onPress} />);
    fireEvent.press(screen.getByText('Tap'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Nope" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Nope'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress while loading and shows a busy indicator', () => {
    const onPress = jest.fn();
    render(<Button label="Wait" onPress={onPress} loading testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('btn-spinner')).toBeTruthy();
  });
});
