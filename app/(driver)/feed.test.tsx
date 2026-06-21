const mockTrack = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: (...a: unknown[]) => mockTrack(...a),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
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
  });
  afterEach(() => { mockFeedState.empty = false; });

  it('renders the feed title and a list of open rides', async () => {
    render(<DriverFeed />);
    await waitFor(() => expect(screen.getByTestId('feed-card-101')).toBeTruthy());
    expect(screen.getByTestId('feed-card-102')).toBeTruthy();
    expect(mockTrack).toHaveBeenCalledWith('ride_feed_viewed');
  });

  it('navigates to the ride detail screen on card tap', async () => {
    render(<DriverFeed />);
    await waitFor(() => expect(screen.getByTestId('feed-card-101')).toBeTruthy());
    fireEvent.press(screen.getByTestId('feed-card-101'));
    expect(mockPush).toHaveBeenCalledWith('/(driver)/ride/101');
  });

  it('shows the empty state when feed returns no rides', async () => {
    mockFeedState.empty = true;
    render(<DriverFeed />);
    await waitFor(() =>
      expect(screen.getByText('No open rides right now. Pull to refresh.')).toBeTruthy(),
    );
  });
});
