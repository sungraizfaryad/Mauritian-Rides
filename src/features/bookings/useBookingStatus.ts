import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { Booking } from './useBooking';

interface BookingWithDriver extends Booking {
  driver?: {
    name: string;
    car: string;
    plate: string;
    phone: string;
  };
}

const TERMINAL = new Set(['accepted', 'completed', 'expired', 'cancelled']);

export function useBookingStatus(ref: string | null) {
  return useQuery<BookingWithDriver>({
    queryKey: ['booking-status', ref],
    queryFn: async () => {
      const { data } = await api.get<BookingWithDriver>(`/bookings/${ref}`);
      return data;
    },
    enabled: ref != null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL.has(status) ? false : 3000;
    },
    staleTime: 0,
  });
}
