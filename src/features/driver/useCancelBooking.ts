import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { track } from '@/lib/observability/analytics';
import { Sentry } from '@/lib/observability/sentry';

interface CancelInput { bookingId: number }

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId }: CancelInput) => {
      const { data } = await api.post<{ status: string }>(`/rides/${bookingId}/cancel`);
      return data;
    },
    onSuccess: (_data, vars) => {
      track('booking_cancelled', { booking_id: vars.bookingId });
      void qc.invalidateQueries({ queryKey: ['rides', 'feed'] });
    },
    onError: (err) => { Sentry.captureException(err); },
  });
}
