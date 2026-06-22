const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn() },
  useSegments: () => [],
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { render, screen, fireEvent } from '@/test-utils/render';
import { AppHeader } from './AppHeader';
import { useAuthStore } from '@/lib/auth/store';

beforeEach(() => {
  mockPush.mockClear();
  useAuthStore.setState({ session: null });
});

describe('AppHeader', () => {
  it('renders logo text', () => {
    render(<AppHeader />);
    expect(screen.getByText('Mauritian Rides')).toBeTruthy();
  });

  it('shows user icon button', () => {
    render(<AppHeader />);
    expect(screen.getByTestId('header-user')).toBeTruthy();
  });

  it('hides bell when not logged in', () => {
    render(<AppHeader />);
    expect(screen.queryByTestId('header-bell')).toBeNull();
  });

  it('shows bell when logged in', () => {
    useAuthStore.setState({
      session: { userId: 1, persona: 'rider', displayName: 'Test', locale: 'en' },
    });
    render(<AppHeader />);
    expect(screen.getByTestId('header-bell')).toBeTruthy();
  });

  it('guest user icon → login', () => {
    render(<AppHeader />);
    fireEvent.press(screen.getByTestId('header-user'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('rider user icon → rider account', () => {
    useAuthStore.setState({
      session: { userId: 1, persona: 'rider', displayName: 'Rider', locale: 'en' },
    });
    render(<AppHeader />);
    fireEvent.press(screen.getByTestId('header-user'));
    expect(mockPush).toHaveBeenCalledWith('/(rider)/account');
  });

  it('driver user icon → driver account', () => {
    useAuthStore.setState({
      session: { userId: 2, persona: 'driver', displayName: 'Driver', locale: 'en' },
    });
    render(<AppHeader />);
    fireEvent.press(screen.getByTestId('header-user'));
    expect(mockPush).toHaveBeenCalledWith('/(driver)/account');
  });

  it('bell tap → notifications', () => {
    useAuthStore.setState({
      session: { userId: 1, persona: 'rider', displayName: 'R', locale: 'en' },
    });
    render(<AppHeader />);
    fireEvent.press(screen.getByTestId('header-bell'));
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });
});
