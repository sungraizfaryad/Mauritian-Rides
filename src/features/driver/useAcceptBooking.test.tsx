const mockTrack = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: (...a: unknown[]) => mockTrack(...a),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));
const mockCaptureException = jest.fn();
jest.mock('@/lib/observability/sentry', () => ({
  Sentry: { captureException: (...a: unknown[]) => mockCaptureException(...a), init: jest.fn(), captureMessage: jest.fn() },
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { ApiError } from '@/lib/api/client';
import { useAcceptBooking } from './useAcceptBooking';
import { mockAcceptScenario } from '@/mocks/handlers';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useAcceptBooking', () => {
  afterEach(() => {
    mockAcceptScenario.mode = '200';
    mockTrack.mockClear();
  });

  it('resolves with status accepted on success', async () => {
    const { result } = renderHook(() => useAcceptBooking(), { wrapper: wrap });
    act(() => { result.current.mutate({ bookingId: 101 }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('accepted');
    expect(mockTrack).toHaveBeenCalledWith('booking_accepted', { booking_id: expect.any(Number) });
  });

  it('rejects with ApiError code cap_reached on 402', async () => {
    mockAcceptScenario.mode = '402';
    const { result } = renderHook(() => useAcceptBooking(), { wrapper: wrap });
    act(() => { result.current.mutate({ bookingId: 101 }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    const err = result.current.error as unknown as ApiError;
    expect(err.code).toBe('cap_reached');
    expect(err.status).toBe(402);
  });

  it('rejects with ApiError code race_lost on 409', async () => {
    mockAcceptScenario.mode = '409';
    const { result } = renderHook(() => useAcceptBooking(), { wrapper: wrap });
    act(() => { result.current.mutate({ bookingId: 101 }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    const err = result.current.error as unknown as ApiError;
    expect(err.code).toBe('race_lost');
    expect(err.status).toBe(409);
  });
});
