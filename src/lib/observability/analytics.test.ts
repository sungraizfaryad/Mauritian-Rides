// Analytics helper is tested in isolation — posthog.ts is mocked so no MMKV init fires.
jest.mock('@/lib/observability/posthog', () => ({
  getPostHog: jest.fn(() => null),
  initPostHog: jest.fn(),
}));

import { track, identifyUser, setGuestPersona, resetIdentity, grantConsent, revokeConsent } from './analytics';
import { getPostHog } from './posthog';

describe('analytics helpers', () => {
  const mockCapture = jest.fn();
  const mockIdentify = jest.fn();
  const mockSetPersonProps = jest.fn();
  const mockReset = jest.fn();
  const mockOptIn = jest.fn().mockResolvedValue(undefined);
  const mockOptOut = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (getPostHog as jest.Mock).mockReturnValue({
      capture: mockCapture,
      identify: mockIdentify,
      setPersonProperties: mockSetPersonProps,
      reset: mockReset,
      optIn: mockOptIn,
      optOut: mockOptOut,
    });
  });

  it('track calls capture with event name and props', () => {
    track('booking_created', { ref: 'MR-001', fare: 1500 });
    expect(mockCapture).toHaveBeenCalledWith('booking_created', { ref: 'MR-001', fare: 1500 });
  });

  it('track is a no-op when getPostHog returns null', () => {
    (getPostHog as jest.Mock).mockReturnValue(null);
    expect(() => track('booking_created')).not.toThrow();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('identifyUser calls identify with stringified userId and persona set', () => {
    identifyUser(42, 'driver');
    expect(mockIdentify).toHaveBeenCalledWith('42', { $set: { persona: 'driver' } });
  });

  it('setGuestPersona calls setPersonProperties', () => {
    setGuestPersona();
    expect(mockSetPersonProps).toHaveBeenCalledWith({ persona: 'guest' });
  });

  it('resetIdentity calls reset', () => {
    resetIdentity();
    expect(mockReset).toHaveBeenCalled();
  });

  it('grantConsent calls optIn', async () => {
    await grantConsent();
    expect(mockOptIn).toHaveBeenCalled();
  });

  it('revokeConsent calls optOut', async () => {
    await revokeConsent();
    expect(mockOptOut).toHaveBeenCalled();
  });
});
