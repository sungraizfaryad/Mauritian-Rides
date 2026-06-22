import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { WP_BASE, type WPPost } from './useBlogPosts';

export function useBlogPost(slug: string) {
  return useQuery<WPPost | null>({
    queryKey: ['wp', 'post', slug],
    queryFn: async () => {
      const { data } = await axios.get<WPPost[]>(
        `${WP_BASE}/posts?slug=${encodeURIComponent(slug)}&_embed`,
      );
      return data[0] ?? null;
    },
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}
