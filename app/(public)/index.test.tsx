import { render, screen } from '@testing-library/react-native';
import PublicHome from './index';
import { initI18n } from '@/lib/i18n';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, ...p }: any) => <View {...p}>{children}</View> };
});

beforeAll(async () => {
  await initI18n('en');
});

describe('PublicHome', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<PublicHome />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows the live badge', () => {
    render(<PublicHome />);
    expect(screen.getByText('Live across Mauritius · 24/7')).toBeTruthy();
  });

  it('shows "Book a ride" hero CTA', () => {
    render(<PublicHome />);
    // There may be multiple "Book a ride" buttons (hero + CTA band).
    const buttons = screen.getAllByText('Book a ride →');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the "How it works" section heading', () => {
    render(<PublicHome />);
    expect(screen.getByText('Three taps, one ride.')).toBeTruthy();
  });

  it('shows all three step titles', () => {
    render(<PublicHome />);
    expect(screen.getByText('Pick your points')).toBeTruthy();
    expect(screen.getByText('See the fare')).toBeTruthy();
    expect(screen.getByText('Confirm & ride')).toBeTruthy();
  });

  it('shows the fare estimator section', () => {
    render(<PublicHome />);
    expect(screen.getByText('Know the price, before you ride.')).toBeTruthy();
  });

  it('shows the driver section heading', () => {
    render(<PublicHome />);
    expect(screen.getByText('Earn on your terms.')).toBeTruthy();
  });

  it('shows the package preview card', () => {
    render(<PublicHome />);
    expect(screen.getByText('Start free. Upgrade when you\'re busy.')).toBeTruthy();
  });

  it('shows the CTA band heading', () => {
    render(<PublicHome />);
    expect(screen.getByText('Ready when you are.')).toBeTruthy();
  });

  it('shows partner logos strip', () => {
    render(<PublicHome />);
    expect(screen.getByText('Beachcomber')).toBeTruthy();
    expect(screen.getByText('LUX*')).toBeTruthy();
  });

  it('shows hero stats', () => {
    render(<PublicHome />);
    // "1,240+" appears in the hero stat row and in the CTABand floating card.
    expect(screen.getAllByText('1,240+').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('4.9 ★')).toBeTruthy();
  });
});
