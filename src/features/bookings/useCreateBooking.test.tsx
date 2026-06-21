import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCreateBooking } from './useCreateBooking';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCreateBooking', () => {
  it('posts the draft and returns a booking with a ref', async () => {
    const { result } = renderHook(() => useCreateBooking(), { wrapper: wrap });
    result.current.mutate({
      pickup: { latitude: -20.16, longitude: 57.5, label: 'Port Louis' },
      dropoff: 'Grand Baie',
      passengers: 2,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.ref).toMatch(/^MR-/);
  });
});
