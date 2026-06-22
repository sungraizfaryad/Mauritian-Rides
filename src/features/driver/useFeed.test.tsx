import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useFeed } from './useFeed';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useFeed', () => {
  it('fetches feed response with open_rides array', async () => {
    const { result } = renderHook(() => useFeed(), { wrapper: wrap });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data?.open_rides)).toBe(true);
    expect(result.current.data?.open_rides.length).toBeGreaterThan(0);
    expect(result.current.data?.open_rides[0]?.status).toBe('open');
    expect(result.current.data?.cap_reached).toBeDefined();
    expect(result.current.data?.plan).toBeDefined();
  });
});
