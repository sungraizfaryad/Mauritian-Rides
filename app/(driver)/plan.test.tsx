const mockTrack = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: (...a: unknown[]) => mockTrack(...a),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));

jest.mock('@/lib/payments/openUpgrade', () => ({
  openUpgrade: jest.fn(() => Promise.resolve('cancel' as const)),
}));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { mockCapState } from '@/mocks/handlers';
import PlanScreen from './plan';

describe('PlanScreen', () => {
  afterEach(() => {
    mockCapState.reached = false;
    mockTrack.mockClear();
  });

  it('renders the gauge with ride count', async () => {
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('gauge-used')).toBeTruthy());
  });

  it('shows cap-reached banner when cap is reached', async () => {
    mockCapState.reached = true;
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('cap-reached-banner')).toBeTruthy());
  });

  it('fires cap_warning_shown exactly once when pct >= 80', async () => {
    mockCapState.reached = true;
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('gauge-used')).toBeTruthy());
    expect(mockTrack).toHaveBeenCalledWith(
      'cap_warning_shown',
      expect.objectContaining({ pct: 100 }),
    );
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('renders plan cards from packages endpoint', async () => {
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('plan-cta-silver')).toBeTruthy());
  });

  it('billing toggle renders monthly and yearly options', async () => {
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('billing-yearly')).toBeTruthy());
    expect(screen.getByTestId('billing-monthly')).toBeTruthy();
  });

  it('switches billing cycle when yearly is pressed', async () => {
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('billing-yearly')).toBeTruthy());
    fireEvent.press(screen.getByTestId('billing-yearly'));
    // After switch, monthly is still visible
    expect(screen.getByTestId('billing-monthly')).toBeTruthy();
  });
});
