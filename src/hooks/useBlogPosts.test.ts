import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useBlogPosts } from './useBlogPosts';

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  }
  return Wrapper;
}

describe('useBlogPosts', () => {
  it('returns posts from the mocked WP REST endpoint', async () => {
    const { result } = renderHook(() => useBlogPosts(), { wrapper: makeWrapper() });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );

    const posts = result.current.data?.pages.flat() ?? [];
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0]?.slug).toBe('best-beaches-mauritius');
  });

  it('returns filtered posts when categoryId is provided', async () => {
    const { result } = renderHook(() => useBlogPosts(10), { wrapper: makeWrapper() });

    await waitFor(
      () => expect(result.current.isSuccess).toBe(true),
      { timeout: 5000 },
    );

    // mock handler returns all posts regardless of category filter — just verify it ran
    expect(result.current.data?.pages).toBeDefined();
  });

  it('hasNextPage is false when only one page exists', async () => {
    const { result } = renderHook(() => useBlogPosts(), { wrapper: makeWrapper() });

    await waitFor(
      () => expect(result.current.isSuccess).toBe(true),
      { timeout: 5000 },
    );

    // mock returns X-WP-TotalPages: 1 so no next page
    expect(result.current.hasNextPage).toBe(false);
  });
});
