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
    mockFeedState.empty = false;
  });
  afterEach(() => { mockFeedState.empty = false; });

  it('renders the feed title and a list of open rides', async () => {
    render(<DriverFeed />);
    await waitFor(() => expect(screen.getByTestId('feed-card-101')).toBeTruthy());
    expect(screen.getByTestId('feed-card-102')).toBeTruthy();
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
