import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface Vehicle {
  slug: string;
  label: string;
  capacity: 'sedan' | 'van';
}

const FALLBACK: Vehicle[] = [
  { slug: 'any_sedan', label: 'Any sedan (1–3 passengers)', capacity: 'sedan' },
  { slug: 'any_van',   label: 'Any van (4–7 passengers)',   capacity: 'van' },
];

export function useVehicles(): { vehicles: Vehicle[]; isLoading: boolean } {
  const { data, isLoading } = useQuery<{ vehicles: Vehicle[] }>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data } = await api.get<{ vehicles: Vehicle[] }>('/vehicles');
      return data;
    },
    staleTime: 60_000 * 10,
    retry: 1,
  });

  return {
    vehicles: data?.vehicles?.length ? data.vehicles : FALLBACK,
    isLoading,
  };
}
