import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

interface AcceptInput { bookingId: number }
interface AcceptResponse { id: number; status: string; accepted_by: number; accepted_at: string }

export function useAcceptBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId }: AcceptInput) => {
      const { data } = await api.post<AcceptResponse>(`/bookings/${bookingId}/accept`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rides', 'feed'] });
      void qc.invalidateQueries({ queryKey: ['me', 'cap'] });
    },
  });
}
