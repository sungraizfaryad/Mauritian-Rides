const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...a: unknown[]) => mockReplace(...a) } }));
jest.mock('@/lib/observability/analytics', () => ({
  track: jest.fn(),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { useAuthStore } from '@/lib/auth/store';
import { mockDeleteAccountScenario } from '@/mocks/handlers';
import AccountRoute from './account';

describe('AccountScreen', () => {
  beforeEach(() => {
    mockDeleteAccountScenario.mode = '204';
    mockReplace.mockClear();
    useAuthStore.getState().setSession({
      userId: 1,
      persona: 'rider',
      displayName: 'Test Rider',
      locale: 'en',
    });
  });
  afterEach(() => {
    useAuthStore.getState().clearSession();
    mockDeleteAccountScenario.mode = '204';
  });

  it('renders the display name and a delete button', () => {
    render(<AccountRoute />);
    expect(screen.getByText('Test Rider')).toBeTruthy();
    expect(screen.getByTestId('delete-account-btn')).toBeTruthy();
  });

  it('shows the confirm step only after tapping delete', () => {
    render(<AccountRoute />);
    expect(screen.queryByTestId('delete-confirm-view')).toBeNull();
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    expect(screen.getByTestId('delete-confirm-view')).toBeTruthy();
  });

  it('hides confirm when cancel is pressed, leaves session intact', () => {
    render(<AccountRoute />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent.press(screen.getByTestId('delete-cancel-btn'));
    expect(screen.queryByTestId('delete-confirm-view')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('navigates to (public) after confirmed delete', async () => {
    render(<AccountRoute />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent.press(screen.getByTestId('delete-confirm-yes-btn'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(public)'));
  });

  it('shows error text when deletion fails', async () => {
    mockDeleteAccountScenario.mode = '500';
    render(<AccountRoute />);
    fireEvent.press(screen.getByTestId('delete-account-btn'));
    fireEvent.press(screen.getByTestId('delete-confirm-yes-btn'));
    await waitFor(() => expect(screen.getByTestId('delete-error')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
