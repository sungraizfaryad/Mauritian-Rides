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

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCreateBooking } from './useCreateBooking';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCreateBooking', () => {
  afterEach(() => mockTrack.mockClear());

  it('posts the draft and returns a booking with a ref', async () => {
    const { result } = renderHook(() => useCreateBooking(), { wrapper: wrap });
    result.current.mutate({
      pickup: { name: 'Port Louis Waterfront', lat: -20.16, lng: 57.5012 },
      dropoff: { name: 'Grand Baie', lat: -20.0135, lng: 57.5803 },
      rider_name: 'Test Rider',
      rider_phone: '+23057001234',
      rider_email: '',
      vehicle: 'sedan',
      vehicle_preference: 'Any sedan (1–3 passengers)',
      distance_km: 20,
      duration_min: 24,
      fare_mur: 710,
      notes: '',
      mr_hp_field: '',
      mr_form_ts: Math.floor(Date.now() / 1000),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.ref).toMatch(/^MR-/);
    expect(mockTrack).toHaveBeenCalledWith(
      'booking_created',
      expect.objectContaining({ ref: expect.stringMatching(/^MR-/) }),
    );
  });
});
