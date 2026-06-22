import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@/test-utils/render';
import ContactScreen from './contact';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: ({ children, ...p }: any) => <View {...p}>{children}</View> };
});

// Prevent MSW from seeing these requests and avoid async timing issues.
// The contact form fetch is simple enough to stub at the fetch level.
beforeAll(() => {
  jest.spyOn(global, 'fetch').mockImplementation((url) => {
    const urlStr = String(url);
    if (urlStr.includes('mr_contact_token')) {
      return Promise.resolve(new Response(JSON.stringify({ token: 'test-token' })));
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({ success: true, data: { message: 'Thanks — your message has been sent. We will be in touch shortly.' } }),
      ),
    );
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('ContactScreen', () => {
  it('renders without crashing', async () => {
    const { toJSON } = render(<ContactScreen />);
    await waitFor(() => expect(toJSON()).toBeTruthy());
  });

  it('shows the hero title', async () => {
    render(<ContactScreen />);
    await waitFor(() => expect(screen.getByText('Contact Mauritian Rides')).toBeTruthy());
  });

  it('fetches token on mount', async () => {
    render(<ContactScreen />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('action=mr_contact_token'),
      );
    });
  });

  it('shows error when name is empty', async () => {
    render(<ContactScreen />);
    // let fetchToken settle before interacting
    await waitFor(() => screen.getByTestId('contact-submit'));
    fireEvent.changeText(screen.getByTestId('contact-email'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('contact-message'), 'This is a long enough message for the form');
    fireEvent.press(screen.getByTestId('contact-submit'));
    await waitFor(() => expect(screen.getByText('Please enter your name.')).toBeTruthy());
  });

  it('shows error when email is invalid', async () => {
    render(<ContactScreen />);
    await waitFor(() => screen.getByTestId('contact-submit'));
    fireEvent.changeText(screen.getByTestId('contact-name'), 'John');
    fireEvent.changeText(screen.getByTestId('contact-email'), 'not-an-email');
    fireEvent.changeText(screen.getByTestId('contact-message'), 'This is a long enough message for the form');
    fireEvent.press(screen.getByTestId('contact-submit'));
    await waitFor(() => expect(screen.getByText('Please enter a valid email address.')).toBeTruthy());
  });

  it('shows error when message is too short', async () => {
    render(<ContactScreen />);
    await waitFor(() => screen.getByTestId('contact-submit'));
    fireEvent.changeText(screen.getByTestId('contact-name'), 'John');
    fireEvent.changeText(screen.getByTestId('contact-email'), 'john@example.com');
    fireEvent.changeText(screen.getByTestId('contact-message'), 'Short');
    fireEvent.press(screen.getByTestId('contact-submit'));
    await waitFor(() => expect(screen.getByText('Please enter a message (at least 10 characters).')).toBeTruthy());
  });

  it('submits form with valid data and shows success banner', async () => {
    render(<ContactScreen />);
    await waitFor(() => screen.getByTestId('contact-submit'));
    fireEvent.changeText(screen.getByTestId('contact-name'), 'John Doe');
    fireEvent.changeText(screen.getByTestId('contact-email'), 'john@example.com');
    fireEvent.changeText(screen.getByTestId('contact-message'), 'This is a long enough message to pass validation');
    fireEvent.press(screen.getByTestId('contact-submit'));
    await waitFor(() =>
      expect(screen.getByText('Thanks — your message has been sent. We will be in touch shortly.')).toBeTruthy(),
    );
  });
});
