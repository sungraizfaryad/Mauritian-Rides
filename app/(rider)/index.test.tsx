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
jest.mock('@/lib/maps/RideMap');
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock('@/features/bookings/useBookingStatus', () => ({
  useBookingStatus: () => ({ data: undefined }),
}));

import { render, screen } from '@/test-utils/render';
import RiderHome from './index';

describe('RiderHome', () => {
  it('renders the booking screen', () => {
    render(<RiderHome />);
    expect(screen.getByTestId('booking-screen')).toBeTruthy();
  });

  it('shows the continue button on step 1', () => {
    render(<RiderHome />);
    expect(screen.getByTestId('booking-continue')).toBeTruthy();
  });
});
