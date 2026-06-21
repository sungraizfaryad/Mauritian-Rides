const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a) },
  useLocalSearchParams: () => ({ status: 'success', order_id: '42' }),
}));

import { render, screen, waitFor, act } from '@/test-utils/render';
import PaymentReturn from './payment-return';

describe('PaymentReturn', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReplace.mockClear();
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
});
