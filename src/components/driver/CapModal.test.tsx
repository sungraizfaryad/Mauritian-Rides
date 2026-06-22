import { Linking } from 'react-native';
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
import { render, screen, fireEvent } from '@/test-utils/render';
import { CapModal } from './CapModal';
import type { Package } from '@/features/driver/usePackages';

const mockPackages: Package[] = [
  { slug: 'free',   name: 'Free',   price: 0,    limit: 5,    perks: ['5 rides/month'] },
  { slug: 'silver', name: 'Silver', price: 500,  limit: 30,   perks: ['30 rides/month'], featured: true },
  { slug: 'gold',   name: 'Gold',   price: 1200, limit: null, perks: ['Unlimited'] },
  { slug: 'fleet',  name: 'Fleet',  price: 0,    limit: null, perks: ['Custom'] },
];

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  packages: mockPackages,
  currentPlan: 'free',
  resetAt: '2026-07-01T00:00:00.000Z',
  onUpgrade: jest.fn(),
};

describe('CapModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all package cards', () => {
    render(<CapModal {...baseProps} />);
    expect(screen.getByText('Silver')).toBeTruthy();
    expect(screen.getByText('Gold')).toBeTruthy();
    expect(screen.getByText('Fleet')).toBeTruthy();
  });

  it('calls onUpgrade with slug when a non-fleet plan is picked', () => {
    render(<CapModal {...baseProps} />);
    fireEvent.press(screen.getByTestId('cap-modal-pick-silver'));
    expect(baseProps.onUpgrade).toHaveBeenCalledWith('silver');
  });

  it('calls Linking.openURL with fleet mailto for the fleet CTA', () => {
    render(<CapModal {...baseProps} />);
    fireEvent.press(screen.getByTestId('cap-modal-pick-fleet'));
    expect(Linking.openURL).toHaveBeenCalledWith('mailto:fleet@mauritianrides.com');
    expect(baseProps.onUpgrade).not.toHaveBeenCalled();
  });

  it('calls onClose when wait button is pressed', () => {
    render(<CapModal {...baseProps} />);
    fireEvent.press(screen.getByTestId('cap-modal-wait'));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not show the current plan CTA', () => {
    render(<CapModal {...baseProps} currentPlan="silver" />);
    expect(screen.queryByTestId('cap-modal-pick-silver')).toBeNull();
  });
});
