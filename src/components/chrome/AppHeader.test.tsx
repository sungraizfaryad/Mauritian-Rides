const mockPush = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = false;

jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    back: jest.fn(),
    canGoBack: () => mockCanGoBack,
  },
  useRouter: () => ({ back: mockBack }),
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
  mockBack.mockClear();
  mockCanGoBack = false;
  useAuthStore.setState({ session: null });
});

describe('AppHeader', () => {
  it('renders logo text on root screens', () => {
    render(<AppHeader />);
    expect(screen.getByText('Mauritian Rides')).toBeTruthy();
  });

  it('shows user icon button', () => {
    render(<AppHeader />);
    expect(screen.getByTestId('header-user')).toBeTruthy();
  });

  it('bell always visible for guests', () => {
    render(<AppHeader />);
    expect(screen.getByTestId('header-bell')).toBeTruthy();
  });

  it('bell always visible when logged in', () => {
    useAuthStore.setState({
      session: { userId: 1, persona: 'rider', displayName: 'Test', locale: 'en' },
    });
    render(<AppHeader />);
    expect(screen.getByTestId('header-bell')).toBeTruthy();
  });

  it('shows back button on pushed screens (canGoBack=true)', () => {
    mockCanGoBack = true;
    render(<AppHeader />);
    expect(screen.getByTestId('header-back')).toBeTruthy();
    expect(screen.queryByText('Mauritian Rides')).toBeNull();
  });

  it('back button calls router.back()', () => {
    mockCanGoBack = true;
    render(<AppHeader />);
    fireEvent.press(screen.getByTestId('header-back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('no back button on root screens (canGoBack=false)', () => {
    render(<AppHeader />);
    expect(screen.queryByTestId('header-back')).toBeNull();
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
    render(<AppHeader />);
    fireEvent.press(screen.getByTestId('header-bell'));
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });
});
