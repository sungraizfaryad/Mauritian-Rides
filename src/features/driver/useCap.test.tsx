import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCap } from './useCap';
import { mockCapState } from '@/mocks/handlers';

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCap', () => {
  afterEach(() => { mockCapState.reached = false; });

  it('returns cap info with reached:false by default', async () => {
    const { result } = renderHook(() => useCap(), { wrapper: wrap });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.reached).toBe(false);
    expect(typeof result.current.data?.used).toBe('number');
  });

  it('returns reached:true when mockCapState.reached is set', async () => {
    mockCapState.reached = true;
    const { result } = renderHook(() => useCap(), { wrapper: wrap });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.reached).toBe(true);
  });
});
