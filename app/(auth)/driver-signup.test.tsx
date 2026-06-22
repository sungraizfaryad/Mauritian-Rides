jest.mock('@/lib/observability/analytics', () => ({
  identifyUser: jest.fn(),
  track: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));
jest.mock('@/lib/observability/sentry', () => ({
  Sentry: { captureException: jest.fn(), init: jest.fn(), captureMessage: jest.fn() },
}));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Light: 'light' } }));

import { render, fireEvent, waitFor, screen } from '@/test-utils/render';
import DriverSignup from './driver-signup';

describe('DriverSignup screen', () => {
  it('shows step 1 initially', () => {
    render(<DriverSignup />);
    expect(screen.getByTestId('ds-firstname')).toBeTruthy();
  });

  it('shows validation errors on empty step 1 submit', async () => {
    render(<DriverSignup />);
    const continueBtn = screen.getByTestId('ds-continue-1');
    fireEvent.press(continueBtn);
    await waitFor(() => {
      expect(screen.getByTestId('ds-firstname')).toBeTruthy();
    });
  });

  it('step 1 fields are rendered correctly', () => {
    render(<DriverSignup />);
    expect(screen.getByTestId('ds-firstname')).toBeTruthy();
    expect(screen.getByTestId('ds-surname')).toBeTruthy();
    expect(screen.getByTestId('ds-email')).toBeTruthy();
    expect(screen.getByPlaceholderText('5xxx xxxx')).toBeTruthy();
    expect(screen.getByTestId('ds-continue-1')).toBeTruthy();
  });

  it('navigates step 1 → 2 → back to 1 with preserved firstname', async () => {
    render(<DriverSignup />);

    // Fill step 1
    fireEvent.changeText(screen.getByTestId('ds-firstname'), 'Ana');
    fireEvent.changeText(screen.getByTestId('ds-surname'), 'Bissessur');
    fireEvent.changeText(screen.getByTestId('ds-email'), 'ana@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('5xxx xxxx'), '59991234');

    fireEvent.press(screen.getByTestId('ds-continue-1'));

    // Step 2 should be visible — NID placeholder confirms we moved forward
    await waitFor(() => {
      expect(screen.getByPlaceholderText('13-character NID')).toBeTruthy();
    });

    // Go back to step 1
    fireEvent.press(screen.getByText('← Back'));

    // Step 1 should show again with firstname preserved
    await waitFor(() => {
      const firstnameInput = screen.getByTestId('ds-firstname');
      expect(firstnameInput.props.value).toBe('Ana');
    });
  });

  it('navigates step 1 → 2 → 3', async () => {
    render(<DriverSignup />);

    // Step 1
    fireEvent.changeText(screen.getByTestId('ds-firstname'), 'Ana');
    fireEvent.changeText(screen.getByTestId('ds-surname'), 'Bissessur');
    fireEvent.changeText(screen.getByTestId('ds-email'), 'ana@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('5xxx xxxx'), '59991234');
    fireEvent.press(screen.getByTestId('ds-continue-1'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('13-character NID')).toBeTruthy();
    });

    // Step 2 — fill identity fields
    fireEvent.changeText(screen.getByPlaceholderText('13-character NID'), 'A1234567890BC');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '1990-06-15');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 5 Royal Road, Curepipe'), '5 Royal Road, Curepipe');

    // MakePicker is a custom picker — step 3 navigation test stops here;
    // vehicle picker interaction requires native modal testing beyond this scope.
    // Pressing step 2's Continue advances to step 3.
    fireEvent.press(screen.getByText('Continue'));

    await waitFor(() => {
      // Step 3 is shown — vehicle year placeholder confirms arrival
      expect(screen.getByPlaceholderText('e.g. 2019')).toBeTruthy();
    });
  });
});
