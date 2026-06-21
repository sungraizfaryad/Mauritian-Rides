const mockResetIdentity = jest.fn();
const mockIdentifyUser = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: jest.fn(),
  identifyUser: (...a: unknown[]) => mockIdentifyUser(...a),
  setGuestPersona: jest.fn(),
  resetIdentity: (...a: unknown[]) => mockResetIdentity(...a),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useLogin, useLogout } from './useAuth';
import { useAuthStore } from './store';
import { getAccessToken } from './tokens';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAuthStore.getState().clearSession();
});

describe('useLogin', () => {
  it('logs a rider in and sets the session + access token', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ email: 'rider@x.com', password: 'secret12' });
    });
    await waitFor(() => expect(useAuthStore.getState().session?.persona).toBe('rider'));
    expect(getAccessToken()).toBe('mock.jwt.access');
    expect(mockIdentifyUser).toHaveBeenCalledWith(1, 'rider');
  });

  it('logs a driver in with persona driver', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ email: 'driver@x.com', password: 'secret12' });
    });
    await waitFor(() => expect(useAuthStore.getState().session?.persona).toBe('driver'));
  });
});

describe('useLogout', () => {
  it('clears the session', async () => {
    useAuthStore.getState().setSession({ userId: 1, persona: 'rider', displayName: 'X', locale: 'en' });
    const { result } = renderHook(() => useLogout(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    await waitFor(() => expect(useAuthStore.getState().session).toBeNull());
    expect(mockResetIdentity).toHaveBeenCalled();
  });
});
