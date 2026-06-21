import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Screen } from './Screen';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('Screen', () => {
  it('renders children', () => {
    render(
      <Screen>
        <Text>hello screen</Text>
      </Screen>,
    );
    expect(screen.getByText('hello screen')).toBeTruthy();
  });

  it('exposes a testID', () => {
    render(
      <Screen testID="login-screen">
        <Text>x</Text>
      </Screen>,
    );
    expect(screen.getByTestId('login-screen')).toBeTruthy();
  });
});
