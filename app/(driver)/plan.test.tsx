// app/(driver)/plan.test.tsx
import type { Plan } from '@/lib/payments/openUpgrade';

const mockOpenUpgrade = jest.fn((_plan: Plan, _qc: unknown) =>
  Promise.resolve('cancel' as const),
);
jest.mock('@/lib/payments/openUpgrade', () => ({
  openUpgrade: (plan: Plan, qc: unknown) => mockOpenUpgrade(plan, qc),
}));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { mockCapState } from '@/mocks/handlers';
import PlanScreen from './plan';

describe('PlanScreen', () => {
  afterEach(() => {
    mockCapState.reached = false;
    mockOpenUpgrade.mockClear();
  });

  it('renders the cap usage display and at least one upgrade button', async () => {
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('cap-used')).toBeTruthy());
    // On the free plan all three upgrade options are shown; silver is the cheapest.
    expect(screen.getByTestId('upgrade-btn-silver')).toBeTruthy();
  });

  it('shows cap-reached banner when mockCapState.reached is true', async () => {
    mockCapState.reached = true;
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('cap-reached-banner')).toBeTruthy());
  });

  it('calls openUpgrade with the selected plan when an upgrade button is pressed', async () => {
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('upgrade-btn-silver')).toBeTruthy());
    fireEvent.press(screen.getByTestId('upgrade-btn-silver'));
    await waitFor(() => expect(mockOpenUpgrade).toHaveBeenCalledWith('silver', expect.anything()));
  });

  it('shows the cancelled message when openUpgrade returns cancel', async () => {
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('upgrade-btn-silver')).toBeTruthy());
    fireEvent.press(screen.getByTestId('upgrade-btn-silver'));
    await waitFor(() => expect(screen.getByTestId('upgrade-msg')).toBeTruthy());
  });

  it('shows an error message when openUpgrade returns error', async () => {
    mockOpenUpgrade.mockResolvedValueOnce('error' as unknown as 'cancel');
    render(<PlanScreen />);
    await waitFor(() => expect(screen.getByTestId('upgrade-btn-silver')).toBeTruthy());
    fireEvent.press(screen.getByTestId('upgrade-btn-silver'));
    await waitFor(() => expect(screen.getByTestId('upgrade-msg')).toBeTruthy());
  });
});
