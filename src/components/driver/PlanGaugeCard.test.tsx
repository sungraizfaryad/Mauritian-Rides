import { render, screen } from '@/test-utils/render';
import { PlanGaugeCard } from './PlanGaugeCard';
import type { DriverCap } from '@/features/driver/useCap';

const base: DriverCap = {
  plan: 'silver',
  used: 15,
  limit: 30,
  cap_reached: false,
  reset_at: '2026-07-01T00:00:00.000Z',
};

it('shows ride count', () => {
  render(<PlanGaugeCard cap={base} />);
  expect(screen.getByTestId('gauge-used')).toBeTruthy();
});

it('hides gauge bar when limit is null (unlimited plan)', () => {
  render(<PlanGaugeCard cap={{ ...base, limit: null }} />);
  expect(screen.queryByTestId('gauge-bar')).toBeNull();
});

it('shows gauge bar when limit is set', () => {
  render(<PlanGaugeCard cap={base} />);
  expect(screen.getByTestId('gauge-bar')).toBeTruthy();
});
