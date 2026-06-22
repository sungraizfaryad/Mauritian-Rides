jest.mock('@/lib/maps/RideMap');
jest.mock('@/lib/observability/analytics', () => ({
  track: jest.fn(),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));
jest.mock('@/lib/observability/sentry', () => ({
  Sentry: { captureException: jest.fn(), init: jest.fn(), captureMessage: jest.fn() },
}));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
jest.mock('@/features/bookings/useBookingStatus', () => ({
  useBookingStatus: () => ({ data: undefined }),
}));

import { render, screen } from '@/test-utils/render';
import GuestBook from './book';

describe('Guest booking screen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders step 1 with booking-screen testID', () => {
    render(<GuestBook />);
    expect(screen.getByTestId('booking-screen')).toBeTruthy();
  });

  it('shows the continue button disabled when no locations set', () => {
    render(<GuestBook />);
    const btn = screen.getByTestId('booking-continue');
    expect(btn).toBeTruthy();
    expect(btn.props.accessibilityState?.disabled).toBeTruthy();
  });
});
