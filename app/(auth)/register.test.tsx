import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { initI18n } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth/store';
import Register from './register';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
  Link: ({ children }: { children: React.ReactNode }) => children,
  useLocalSearchParams: () => ({}),
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
  mockReplace.mockClear();
  useAuthStore.getState().clearSession();
});

describe('Register screen', () => {
  it('renders the create-account title and role options', () => {
    render(<Register />);
    expect(screen.getByTestId('role-rider')).toBeTruthy();
    expect(screen.getByTestId('role-driver')).toBeTruthy();
  });

  it('registers a driver and routes to the driver shell', async () => {
    render(<Register />);
    fireEvent.press(screen.getByTestId('role-driver'));
    fireEvent.changeText(screen.getByTestId('register-name'), 'New Driver');
    fireEvent.changeText(screen.getByTestId('register-email'), 'driver@x.com');
    fireEvent.changeText(screen.getByTestId('register-password'), 'secret12');
    fireEvent.press(screen.getByTestId('register-submit'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(driver)/feed'));
  });
});
