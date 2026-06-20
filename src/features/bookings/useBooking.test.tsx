import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBooking } from './useBooking';
import type { ReactNode } from 'react';

function wrap(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useBooking', () => {
  it('returns the booking payload for a known ref (MSW mock)', async () => {
    const { result } = renderHook(() => useBooking('MR-ABC123'), {
      wrapper: ({ children }) => wrap(children),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.ref).toBe('MR-ABC123');
    expect(result.current.data?.status).toBe('open');
  });
});
