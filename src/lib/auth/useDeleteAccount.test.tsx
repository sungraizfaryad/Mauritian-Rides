// analytics.ts is imported transitively via useAuth.ts. Mock it here so the module
// resolves cleanly both before and after Task 6 wires the real implementation.
const mockResetIdentity = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: jest.fn(),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: (...a: unknown[]) => mockResetIdentity(...a),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useDeleteAccount } from '@/lib/auth/useAuth';
import { useAuthStore } from '@/lib/auth/store';
import { setAccessToken, getAccessToken, setRefreshToken } from '@/lib/auth/tokens';
import { mockDeleteAccountScenario } from '@/mocks/handlers';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useDeleteAccount', () => {
  beforeEach(async () => {
    mockDeleteAccountScenario.mode = '204';
    mockResetIdentity.mockClear();
    jest.mocked(SecureStore.deleteItemAsync).mockClear();
    setAccessToken('test-access-token');
    await setRefreshToken('test-refresh-token');
    useAuthStore.getState().setSession({
      userId: 1,
      persona: 'rider',
      displayName: 'Test User',
      locale: 'en',
    });
  });
  afterEach(() => {
    mockDeleteAccountScenario.mode = '204';
    useAuthStore.getState().clearSession();
  });

  it('clears session, tokens, and PostHog identity on success', async () => {
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: wrap });
    act(() => { result.current.mutate('test-pass'); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().session).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(jest.mocked(SecureStore.deleteItemAsync)).toHaveBeenCalled();
    expect(mockResetIdentity).toHaveBeenCalled();
  });

  it('rejects and leaves session intact on server error', async () => {
    mockDeleteAccountScenario.mode = '500';
    const { result } = renderHook(() => useDeleteAccount(), { wrapper: wrap });
    act(() => { result.current.mutate('test-pass'); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState().session?.userId).toBe(1);
  });
});
