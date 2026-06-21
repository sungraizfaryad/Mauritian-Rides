const mockTrack = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: (...a: unknown[]) => mockTrack(...a),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));

const mockReplace = jest.fn();
let mockStatus = 'success';
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
  useLocalSearchParams: () => ({ status: mockStatus, order_id: '42' }),
}));

import { render, screen, waitFor, act } from '@/test-utils/render';
import PaymentReturn from './payment-return';

describe('PaymentReturn', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReplace.mockClear();
    mockTrack.mockClear();
    mockStatus = 'success';
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the payment-return screen', () => {
    render(<PaymentReturn />);
    expect(screen.getByTestId('payment-return-screen')).toBeTruthy();
  });

  it('navigates to the driver feed after the delay', async () => {
    render(<PaymentReturn />);
    act(() => { jest.advanceTimersByTime(1500); });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(driver)/feed'));
  });

  it('fires plan_upgrade_completed when status is success', () => {
    mockStatus = 'success';
    render(<PaymentReturn />);
    expect(mockTrack).toHaveBeenCalledWith('plan_upgrade_completed');
  });

  it('does not fire plan_upgrade_completed when status is cancel', () => {
    mockStatus = 'cancel';
    render(<PaymentReturn />);
    expect(mockTrack).not.toHaveBeenCalledWith('plan_upgrade_completed');
  });
});
