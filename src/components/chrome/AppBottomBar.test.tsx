const mockPush = jest.fn();
let mockSegments: string[] = [];

jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a) },
  useSegments: () => mockSegments,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { render, screen, fireEvent } from '@/test-utils/render';
import { AppBottomBar } from './AppBottomBar';

beforeEach(() => {
  mockPush.mockClear();
  mockSegments = [];
});

describe('AppBottomBar', () => {
  it('renders all four tabs', () => {
    render(<AppBottomBar />);
    expect(screen.getByTestId('bottom-bar-home')).toBeTruthy();
    expect(screen.getByTestId('bottom-bar-book')).toBeTruthy();
    expect(screen.getByTestId('bottom-bar-blog')).toBeTruthy();
    expect(screen.getByTestId('bottom-bar-contact')).toBeTruthy();
  });

  it('home tab navigates to (public)', () => {
    render(<AppBottomBar />);
    fireEvent.press(screen.getByTestId('bottom-bar-home'));
    expect(mockPush).toHaveBeenCalledWith('/(public)');
  });

  it('book tab navigates to book screen', () => {
    render(<AppBottomBar />);
    fireEvent.press(screen.getByTestId('bottom-bar-book'));
    expect(mockPush).toHaveBeenCalledWith('/(public)/rides/book');
  });

  it('blog tab navigates to blog', () => {
    render(<AppBottomBar />);
    fireEvent.press(screen.getByTestId('bottom-bar-blog'));
    expect(mockPush).toHaveBeenCalledWith('/(public)/blog');
  });

  it('contact tab navigates to contact', () => {
    render(<AppBottomBar />);
    fireEvent.press(screen.getByTestId('bottom-bar-contact'));
    expect(mockPush).toHaveBeenCalledWith('/(public)/contact');
  });

  it('has no Plans tab', () => {
    render(<AppBottomBar />);
    expect(screen.queryByTestId('bottom-bar-packages')).toBeNull();
  });
});
