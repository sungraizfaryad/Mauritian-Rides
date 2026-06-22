const mockTrack = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: (...a: unknown[]) => mockTrack(...a),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));
jest.mock('@/lib/observability/sentry', () => ({
  Sentry: { captureException: jest.fn(), captureMessage: jest.fn(), init: jest.fn() },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a) },
}));

import { render, screen, waitFor, fireEvent } from '@/test-utils/render';
import { mockFeedState } from '@/mocks/handlers';
import DriverFeed from './feed';

describe('DriverFeed', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockTrack.mockClear();
    mockFeedState.empty = false;
    mockFeedState.driverStatus = 'active';
  });
  afterEach(() => {
    mockFeedState.empty = false;
    mockFeedState.driverStatus = 'active';
  });

  it('renders the greeting card and open ride rows', async () => {
    render(<DriverFeed />);
    await waitFor(() => expect(screen.getByTestId('feed-row-101')).toBeTruthy());
    expect(screen.getByTestId('feed-row-102')).toBeTruthy();
    expect(mockTrack).toHaveBeenCalledWith('ride_feed_viewed');
  });

  it('shows StatusBanner when driver_status is pending', async () => {
    mockFeedState.driverStatus = 'pending';
    render(<DriverFeed />);
    await waitFor(() => expect(screen.getByTestId('status-banner-pending')).toBeTruthy());
  });

  it('removes a row when Pass is pressed', async () => {
    render(<DriverFeed />);
    await waitFor(() => expect(screen.getByTestId('feed-row-101')).toBeTruthy());
    fireEvent.press(screen.getByTestId('feed-pass-101'));
    await waitFor(() => expect(screen.queryByTestId('feed-row-101')).toBeNull());
  });

  it('shows empty state when feed returns no rides', async () => {
    mockFeedState.empty = true;
    render(<DriverFeed />);
    await waitFor(() =>
      expect(screen.getByText('No open rides right now. Pull to refresh.')).toBeTruthy(),
    );
  });
});
