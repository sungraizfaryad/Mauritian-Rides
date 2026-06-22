import { render, screen, fireEvent } from '@/test-utils/render';
import { BillingToggle } from './BillingToggle';

it('calls onChange when yearly is pressed', () => {
  const onChange = jest.fn();
  render(<BillingToggle value="monthly" onChange={onChange} />);
  fireEvent.press(screen.getByTestId('billing-yearly'));
  expect(onChange).toHaveBeenCalledWith('yearly');
});

it('calls onChange when monthly is pressed', () => {
  const onChange = jest.fn();
  render(<BillingToggle value="yearly" onChange={onChange} />);
  fireEvent.press(screen.getByTestId('billing-monthly'));
  expect(onChange).toHaveBeenCalledWith('monthly');
});
