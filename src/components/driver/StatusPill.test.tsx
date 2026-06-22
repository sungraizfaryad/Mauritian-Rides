import { render, screen } from '@/test-utils/render';
import { StatusPill } from './StatusPill';

const cases = [
  ['missing',  'Missing'],
  ['pending',  'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
] as const;

it.each(cases)('StatusPill %s shows label', (variant, label) => {
  render(<StatusPill variant={variant} testID="pill" />);
  expect(screen.getByTestId('pill')).toBeTruthy();
  expect(screen.getByText(label)).toBeTruthy();
});
