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
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...a: unknown[]) => mockReplace(...a) } }));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { useBookingDraftStore } from '@/lib/stores/bookingDraft';
import RiderHome from './index';

describe('RiderHome booking form', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    useBookingDraftStore.getState().clear();
  });

  it('blocks confirm until pickup and dropoff are set', async () => {
    render(<RiderHome />);
    fireEvent.press(screen.getByTestId('booking-confirm'));
    await waitFor(() => expect(screen.getByText('Choose a pickup point.')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('creates a booking and navigates to the tracker', async () => {
    render(<RiderHome />);
    fireEvent.press(screen.getByTestId('booking-open-picker'));
    fireEvent.press(screen.getByTestId('ride-map-press'));
    fireEvent.press(screen.getByTestId('pickup-confirm'));
    fireEvent.changeText(screen.getByTestId('booking-dropoff'), 'Grand Baie');
    fireEvent.press(screen.getByTestId('booking-confirm'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(String(mockReplace.mock.calls[0][0])).toContain('/(rider)/bookings/MR-');
  });
});
