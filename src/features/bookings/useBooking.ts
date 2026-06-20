import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface Booking {
  id: number;
  ref: string;
  status: 'open' | 'accepted' | 'completed' | 'cancelled' | 'expired';
  pickup: string;
  dropoff: string;
  accepted_by: number | null;
  fare: string;
  created_at: string;
}

export function useBooking(ref: string) {
  return useQuery<Booking>({
    queryKey: ['booking', ref],
    queryFn: async () => {
      const { data } = await api.get<Booking>(`/bookings/${ref}`);
      return data;
    },
    staleTime: 10_000,
  });
}
