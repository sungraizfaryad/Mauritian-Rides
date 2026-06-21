import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Booking } from '@/features/bookings/useBooking';

export function useDriverBooking(id: number) {
  return useQuery<Booking>({
    queryKey: ['driver-booking', id],
    queryFn: async () => {
      const { data } = await api.get<Booking>(`/bookings/by-id/${id}`);
      return data;
    },
    staleTime: 15_000,
    enabled: id > 0,
  });
}
