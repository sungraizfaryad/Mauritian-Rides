import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { CreateBookingInput } from '@/schemas/booking';
import type { Booking } from './useBooking';

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBookingInput) => {
      const { data } = await api.post<Booking>('/bookings', input);
      return data;
    },
    onSuccess: (booking) => {
      qc.setQueryData(['booking', booking.ref], booking);
      void qc.invalidateQueries({ queryKey: ['bookings', 'mine'] });
    },
  });
}
