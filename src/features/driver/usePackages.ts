import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface Package {
  slug: string;
  name: string;
  price: number;
  limit: number | null; // null = unlimited
  perks: string[];
  featured?: boolean;
}

export function usePackages() {
  return useQuery<Package[]>({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data } = await api.get<Package[]>('/packages');
      return data;
    },
    staleTime: 5 * 60_000,
  });
}
