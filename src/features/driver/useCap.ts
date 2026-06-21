import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface DriverCap {
  plan: 'free' | 'silver' | 'gold' | 'fleet';
  used: number;
  limit: number;
  reached: boolean;
  reset_at: string;
}

export function useCap() {
  return useQuery<DriverCap>({
    queryKey: ['me', 'cap'],
    queryFn: async () => {
      const { data } = await api.get<DriverCap>('/me/cap');
      return data;
    },
    staleTime: 0,
  });
}
