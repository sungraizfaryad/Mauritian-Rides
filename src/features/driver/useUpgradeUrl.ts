import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

type Plan = 'silver' | 'gold' | 'fleet';

export function useUpgradeUrl(plan: Plan, enabled: boolean) {
  return useQuery<{ url: string }>({
    queryKey: ['me', 'upgrade-url', plan],
    queryFn: async () => {
      const { data } = await api.get<{ url: string }>(`/me/upgrade-url?plan=${plan}`);
      return data;
    },
    enabled,
    staleTime: 30_000,
  });
}
