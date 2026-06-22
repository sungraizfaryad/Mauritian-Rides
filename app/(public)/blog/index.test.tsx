import { render, screen, waitFor } from '@/test-utils/render';
import BlogArchive from './index';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, ...p }: any) => <View {...p}>{children}</View> };
});

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: (props: any) => <View testID="expo-image" {...props} /> };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

describe('BlogArchive', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<BlogArchive />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows the hero title', async () => {
    render(<BlogArchive />);
    await waitFor(() => {
      expect(screen.getByText('Mauritius Travel Blog')).toBeTruthy();
    });
  });

  it('shows the hero eyebrow', async () => {
    render(<BlogArchive />);
    await waitFor(() => {
      expect(screen.getByText('Travel guides · Transport tips · Mauritius')).toBeTruthy();
    });
  });

  it('renders bento cards from mocked WP REST', async () => {
    render(<BlogArchive />);
    await waitFor(
      () => {
        expect(screen.getByText('Best Beaches in Mauritius')).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });

  it('shows "All" category chip', async () => {
    render(<BlogArchive />);
    await waitFor(() => {
      expect(screen.getByText('All')).toBeTruthy();
    });
  });
});
