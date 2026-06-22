import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { track } from '@/lib/observability/analytics';
import { Sentry } from '@/lib/observability/sentry';

interface AcceptInput { bookingId: number }
interface AcceptResponse { id: number; status: string; accepted_by: number; accepted_at: string }

export type AcceptError = 'cap_reached' | 'docs_required' | 'race_lost' | 'generic';

export function parseAcceptError(err: unknown): AcceptError {
  const ae = err as { status?: number; code?: string };
  if (ae.status === 402 || ae.code === 'cap_reached') return 'cap_reached';
  if (ae.status === 403 && ae.code === 'mr_docs_required') return 'docs_required';
  if (ae.code === 'race_lost') return 'race_lost';
  return 'generic';
}

export function useAcceptBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId }: AcceptInput) => {
      const { data } = await api.post<AcceptResponse>(`/bookings/${bookingId}/accept`);
      return data;
    },
    onSuccess: (data) => {
      track('booking_accepted', { booking_id: data.id });
      void qc.invalidateQueries({ queryKey: ['rides', 'feed'] });
      void qc.invalidateQueries({ queryKey: ['me', 'cap'] });
    },
    onError: (err) => { Sentry.captureException(err); },
  });
}
