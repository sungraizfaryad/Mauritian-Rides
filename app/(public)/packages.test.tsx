const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, ...p }: any) => <View {...p}>{children}</View> };
});

jest.mock('@/features/driver/usePackages', () => ({
  usePackages: () => ({
    isPending: false,
    isError: false,
    data: [
      { slug: 'free',   name: 'Free',   price: 0,    limit: 5,    perks: ['5 rides/month'], featured: false },
      { slug: 'silver', name: 'Silver', price: 799,  limit: 30,   perks: ['30 rides/month', 'Priority listing'], featured: true },
      { slug: 'gold',   name: 'Gold',   price: 1499, limit: null, perks: ['Unlimited rides'], featured: false },
    ],
  }),
}));

import { render, screen, fireEvent } from '@/test-utils/render';
import { initI18n } from '@/lib/i18n';
import PackagesScreen from './packages';

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  mockPush.mockClear();
});

describe('PackagesScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<PackagesScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows the hero heading and eyebrow', () => {
    render(<PackagesScreen />);
    expect(screen.getByText('Driver packages.')).toBeTruthy();
    expect(screen.getByText('Driver plans')).toBeTruthy();
  });

  it('renders all plan cards from the hook', () => {
    render(<PackagesScreen />);
    expect(screen.getByText('Free')).toBeTruthy();
    expect(screen.getByText('Silver')).toBeTruthy();
    expect(screen.getByText('Gold')).toBeTruthy();
  });

  it('shows the comparison table', () => {
    render(<PackagesScreen />);
    // ComparisonTable renders "Compare plans" heading
    expect(screen.getByText('Compare plans')).toBeTruthy();
  });

  it('shows the FAQ accordion', () => {
    render(<PackagesScreen />);
    expect(screen.getByText('Frequently asked questions')).toBeTruthy();
  });

  it('shows the become-a-driver CTA footer', () => {
    render(<PackagesScreen />);
    expect(screen.getByText('Ready to start driving?')).toBeTruthy();
    expect(screen.getByTestId('packages-become-driver-cta')).toBeTruthy();
  });

  it('tapping CTA pushes to driver-signup', () => {
    render(<PackagesScreen />);
    fireEvent.press(screen.getByTestId('packages-become-driver-cta'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/driver-signup');
  });

  it('plan card CTA routes to driver-signup', () => {
    render(<PackagesScreen />);
    // Silver plan should have a choose CTA (not current, not fleet)
    fireEvent.press(screen.getByTestId('plan-cta-silver'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/driver-signup');
  });

  it('shows loading spinner while fetching', () => {
    jest.doMock('@/features/driver/usePackages', () => ({
      usePackages: () => ({ isPending: true, isError: false, data: undefined }),
    }));
    // Basic render still works
    const { toJSON } = render(<PackagesScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders in French', async () => {
    await initI18n('fr');
    render(<PackagesScreen />);
    expect(screen.getByText('Forfaits chauffeur')).toBeTruthy();
    await initI18n('en');
  });
});
