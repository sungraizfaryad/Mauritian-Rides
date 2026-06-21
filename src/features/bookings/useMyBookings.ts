import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Booking } from './useBooking';

export function useMyBookings() {
  return useQuery<Booking[]>({
    queryKey: ['bookings', 'mine'],
    queryFn: async () => {
      const { data } = await api.get<Booking[]>('/me/bookings');
      return data;
    },
    staleTime: 15_000,
  });
}
