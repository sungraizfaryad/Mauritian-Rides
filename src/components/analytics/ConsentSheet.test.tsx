const mockGrantConsent = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/observability/analytics', () => ({
  track: jest.fn(),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: (...a: unknown[]) => mockGrantConsent(...a),
  revokeConsent: jest.fn(),
}));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { ConsentSheet } from './ConsentSheet';
import { initI18n } from '@/lib/i18n';

describe('ConsentSheet', () => {
  beforeEach(() => mockGrantConsent.mockClear());

  it('renders the consent modal with accept and decline buttons', () => {
    render(<ConsentSheet onAccept={jest.fn()} onDecline={jest.fn()} />);
    expect(screen.getByTestId('consent-sheet')).toBeTruthy();
    expect(screen.getByTestId('consent-accept-btn')).toBeTruthy();
    expect(screen.getByTestId('consent-decline-btn')).toBeTruthy();
  });

  it('calls grantConsent then onAccept when accept is pressed', async () => {
    const onAccept = jest.fn();
    render(<ConsentSheet onAccept={onAccept} onDecline={jest.fn()} />);
    fireEvent.press(screen.getByTestId('consent-accept-btn'));
    await waitFor(() => expect(onAccept).toHaveBeenCalled());
    expect(mockGrantConsent).toHaveBeenCalled();
  });

  it('calls onDecline without calling grantConsent when decline is pressed', async () => {
    const onDecline = jest.fn();
    render(<ConsentSheet onAccept={jest.fn()} onDecline={onDecline} />);
    fireEvent.press(screen.getByTestId('consent-decline-btn'));
    await waitFor(() => expect(onDecline).toHaveBeenCalled());
    expect(mockGrantConsent).not.toHaveBeenCalled();
  });

  describe('FR copy', () => {
    // beforeAll must return the Promise so Jest awaits the locale switch before running the it block.
    beforeAll(async () => {
      await initI18n('fr');
    });
    afterAll(async () => {
      await initI18n('en');
    });

    it('renders French accept label text', () => {
      render(<ConsentSheet onAccept={jest.fn()} onDecline={jest.fn()} />);
      // Assert the actual French string, not just element presence — vacuously-true checks miss locale bugs.
      expect(screen.getByText('Accepter les analyses')).toBeTruthy();
    });
  });
});
