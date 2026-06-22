import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const WP_BASE = 'http://mauritianrides.local/wp-json/wp/v2';

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
}

export function useBlogCategories() {
  return useQuery<WPCategory[]>({
    queryKey: ['wp', 'categories'],
    queryFn: async () => {
      const { data } = await axios.get<WPCategory[]>(
        `${WP_BASE}/categories?_fields=id,name,slug&per_page=20`,
      );
      return data;
    },
    staleTime: 10 * 60_000,
  });
}
