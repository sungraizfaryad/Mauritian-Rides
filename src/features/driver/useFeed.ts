import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface OpenRide {
  id: number;
  ref: string;
  status: 'open';
  pickup: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff: string;
  passengers: number;
  fare: string;
  distance_km: number;
  created_at: string;
}

export function useFeed() {
  return useQuery<OpenRide[]>({
    queryKey: ['rides', 'feed'],
    queryFn: async () => {
      const { data } = await api.get<OpenRide[]>('/rides/feed');
      return data;
    },
    refetchInterval: 8_000,
    // staleTime below refetchInterval so refetches never serve stale data
    staleTime: 4_000,
  });
}
