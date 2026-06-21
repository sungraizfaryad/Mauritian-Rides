import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRideLocation } from './useRideLocation';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useRideLocation', () => {
  it('fetches the latest driver position when enabled', async () => {
    const { result } = renderHook(() => useRideLocation(42, true), { wrapper: wrap });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(typeof result.current.data?.latitude).toBe('number');
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => useRideLocation(42, false), { wrapper: wrap });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
