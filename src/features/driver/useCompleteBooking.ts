import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { track } from '@/lib/observability/analytics';
import { Sentry } from '@/lib/observability/sentry';

interface CompleteInput { bookingId: number }

export function useCompleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId }: CompleteInput) => {
      const { data } = await api.post<{ status: string }>(`/bookings/${bookingId}/complete`);
      return data;
    },
    onSuccess: (_data, vars) => {
      track('booking_completed', { booking_id: vars.bookingId });
      void qc.invalidateQueries({ queryKey: ['rides', 'feed'] });
      void qc.invalidateQueries({ queryKey: ['me', 'bookings'] });
    },
    onError: (err) => { Sentry.captureException(err); },
  });
}
