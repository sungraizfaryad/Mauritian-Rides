import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { track } from '@/lib/observability/analytics';
import { Sentry } from '@/lib/observability/sentry';
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
      track('booking_created', { ref: booking.ref, fare: Number(booking.fare) });
      qc.setQueryData(['booking', booking.ref], booking);
      void qc.invalidateQueries({ queryKey: ['bookings', 'mine'] });
    },
    onError: (err) => { Sentry.captureException(err); },
  });
}
