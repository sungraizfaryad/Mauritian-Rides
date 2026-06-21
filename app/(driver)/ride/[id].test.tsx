jest.mock('@/lib/maps/RideMap');
jest.mock('@/lib/location/rideShare', () => ({
  startSharing: jest.fn(async () => ({ status: 'ok' })),
  stopSharing: jest.fn(async () => undefined),
  isSharing: jest.fn(async () => false),
  RIDE_SHARE_TASK: 'DRIVER_LOCATION_TASK',
}));

// Mock useCancelBooking so we can assert mutateAsync is called on location denial.
// The mock name starts with 'mock' per the factory-closure naming rule.
const mockCancelMutateAsync = jest.fn(async () => ({ status: 'cancelled' }));
jest.mock('@/features/driver/useCancelBooking', () => ({
  useCancelBooking: () => ({ mutateAsync: mockCancelMutateAsync, isPending: false }),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
  useLocalSearchParams: () => ({ id: '101' }),
}));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { mockAcceptScenario } from '@/mocks/handlers';
import { startSharing, stopSharing } from '@/lib/location/rideShare';
import RideDetail from './[id]';

describe('RideDetail', () => {
  afterEach(() => {
    mockAcceptScenario.mode = '200';
    mockReplace.mockClear();
    mockCancelMutateAsync.mockClear();
    (startSharing as jest.Mock).mockClear();
    (stopSharing as jest.Mock).mockClear();
  });

  it('renders the accept button and pickup marker', async () => {
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    expect(screen.getByTestId('marker-pickup')).toBeTruthy();
  });

  it('shows accept-btn-spinner immediately after press', async () => {
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-btn'));
    expect(screen.getByTestId('accept-btn-spinner')).toBeTruthy();
  });

  it('calls startSharing with the ride id after a successful accept', async () => {
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-btn'));
    await waitFor(() => expect(startSharing).toHaveBeenCalledWith(101));
  });

  it('shows the live-share banner after successful accept and startSharing:ok', async () => {
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-btn'));
    await waitFor(() => expect(screen.getByTestId('live-share-banner')).toBeTruthy());
  });

  it('shows cap-reached error banner on 402 and does not call startSharing', async () => {
    mockAcceptScenario.mode = '402';
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-btn'));
    await waitFor(() => expect(screen.getByTestId('accept-error')).toBeTruthy());
    expect(startSharing).not.toHaveBeenCalled();
  });

  it('shows race-lost error banner on 409', async () => {
    mockAcceptScenario.mode = '409';
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-btn'));
    await waitFor(() => expect(screen.getByTestId('accept-error')).toBeTruthy());
  });

  it('calls cancel.mutateAsync and shows location-denied error when startSharing returns denied', async () => {
    // Spec §7: "if declined the app cancels the accept and shows an explanation."
    // Asserts BOTH the cancel call AND the error banner — a regression dropping the
    // cancel.mutateAsync() call will be caught even if the banner still renders.
    (startSharing as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    render(<RideDetail />);
    await waitFor(() => expect(screen.getByTestId('accept-btn')).toBeTruthy());
    fireEvent.press(screen.getByTestId('accept-btn'));
    await waitFor(() => expect(mockCancelMutateAsync).toHaveBeenCalledWith({ bookingId: 101 }));
    expect(stopSharing).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('accept-error')).toBeTruthy());
  });
});
