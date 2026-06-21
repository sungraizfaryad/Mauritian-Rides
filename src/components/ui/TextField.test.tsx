import { render, screen, fireEvent } from '@testing-library/react-native';
import { TextField } from './TextField';

describe('TextField', () => {
  it('renders label and value', () => {
    render(<TextField label="Email" value="a@b.com" onChangeText={() => {}} />);
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByDisplayValue('a@b.com')).toBeTruthy();
  });

  it('fires onChangeText', () => {
    const onChangeText = jest.fn();
    render(<TextField label="Email" value="" onChangeText={onChangeText} testID="email" />);
    fireEvent.changeText(screen.getByTestId('email'), 'new@x.com');
    expect(onChangeText).toHaveBeenCalledWith('new@x.com');
  });

  it('shows an error message when provided', () => {
    render(<TextField label="Email" value="" onChangeText={() => {}} error="Required" />);
    expect(screen.getByText('Required')).toBeTruthy();
  });
});
