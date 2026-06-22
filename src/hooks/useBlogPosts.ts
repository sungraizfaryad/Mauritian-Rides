import { useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';
import { WP_BASE } from './useBlogCategories';

export { WP_BASE } from './useBlogCategories';

export interface WPPost {
  id: number;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  // injected by server if mr_toc custom field is registered
  mr_toc?: Array<{ id: string; text: string; level: number }>;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      media_details?: { sizes?: Record<string, { source_url: string }> };
    }>;
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string }>>;
  };
}

export function featuredImageUrl(post: WPPost, size = 'medium_large'): string | null {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return null;
  return media.media_details?.sizes?.[size]?.source_url ?? media.source_url;
}

export function postCategories(post: WPPost): Array<{ id: number; name: string; slug: string }> {
  const terms = post._embedded?.['wp:term'];
  return terms?.[0] ?? [];
}

const PER_PAGE = 10;

// Attach total pages to each page array so getNextPageParam can read it.
type PostPage = WPPost[] & { _totalPages?: number };

export function useBlogPosts(categoryId?: number) {
  return useInfiniteQuery<PostPage, Error, { pages: PostPage[]; pageParams: unknown[] }, readonly string[], number>({
    queryKey: ['wp', 'posts', categoryId != null ? String(categoryId) : 'all'] as const,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const cat = categoryId != null ? `&categories=${categoryId}` : '';
      const { data, headers } = await axios.get<PostPage>(
        `${WP_BASE}/posts?_embed&per_page=${PER_PAGE}&page=${pageParam}${cat}`,
      );
      data._totalPages = Number(headers['x-wp-totalpages'] ?? 1);
      return data;
    },
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const total = lastPage._totalPages ?? 1;
      return lastPageParam < total ? lastPageParam + 1 : undefined;
    },
    staleTime: 5 * 60_000,
  });
}
