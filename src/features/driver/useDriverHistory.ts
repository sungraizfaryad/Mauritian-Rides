import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface HistoryBooking {
  id: number;
  ref: string;
  status: 'completed' | 'cancelled';
  pickup: string;
  dropoff: string;
  fare: string;
  passengers: number;
  rider_name?: string;
  created_at: string;
}

export function useDriverHistory() {
  return useQuery<HistoryBooking[]>({
    queryKey: ['me', 'bookings', 'history'],
    queryFn: async () => {
      const { data } = await api.get<HistoryBooking[]>('/me/bookings?status=completed');
      return data;
    },
    staleTime: 60_000,
  });
}
