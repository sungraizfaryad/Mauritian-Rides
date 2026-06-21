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
import { useCancelBooking } from './useCancelBooking';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCancelBooking', () => {
  afterEach(() => mockTrack.mockClear());

  it('resolves with status cancelled and fires booking_cancelled event', async () => {
    const { result } = renderHook(() => useCancelBooking(), { wrapper: wrap });
    act(() => { result.current.mutate({ bookingId: 101 }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('cancelled');
    expect(mockTrack).toHaveBeenCalledWith('booking_cancelled', { booking_id: 101 });
  });
});
