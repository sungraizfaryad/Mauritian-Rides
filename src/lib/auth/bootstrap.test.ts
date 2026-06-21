import { hydrateSession } from './bootstrap';
import { useAuthStore } from './store';
import * as tokens from './tokens';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

beforeEach(() => {
  useAuthStore.getState().clearSession();
  jest.restoreAllMocks();
});

describe('hydrateSession', () => {
  it('does nothing when there is no refresh token', async () => {
    jest.spyOn(tokens, 'getRefreshToken').mockResolvedValue(null);
    const ok = await hydrateSession();
    expect(ok).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('restores a rider session from /me when a refresh token exists', async () => {
    jest.spyOn(tokens, 'getRefreshToken').mockResolvedValue('mock.refresh');
    const ok = await hydrateSession();
    expect(ok).toBe(true);
    expect(useAuthStore.getState().session?.persona).toBe('rider');
  });
});
