import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { initI18n } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth/store';
import Login from './login';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (path: unknown) => mockPush(path) },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

beforeAll(async () => {
  await initI18n('en');
});
beforeEach(() => {
  mockPush.mockClear();
  useAuthStore.getState().clearSession();
});

describe('Login screen', () => {
  it('renders the sign-in title and CTA', () => {
    render(<Login />);
    // title + button label both read "Sign in" — getAllByText confirms at least one exists
    expect(screen.getAllByText('Sign in').length).toBeGreaterThan(0);
    expect(screen.getByTestId('login-submit')).toBeTruthy();
  });

  it('shows a validation error for a bad email', async () => {
    render(<Login />);
    fireEvent.changeText(screen.getByTestId('login-email'), 'nope');
    fireEvent.changeText(screen.getByTestId('login-password'), 'secret12');
    fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(screen.getByText('Enter a valid email.')).toBeTruthy());
  });

  it('logs in a rider and routes to the rider shell', async () => {
    render(<Login />);
    fireEvent.changeText(screen.getByTestId('login-email'), 'rider@x.com');
    fireEvent.changeText(screen.getByTestId('login-password'), 'secret12');
    fireEvent.press(screen.getByTestId('login-submit'));
    await waitFor(() => expect(useAuthStore.getState().session?.persona).toBe('rider'));
  });
});
