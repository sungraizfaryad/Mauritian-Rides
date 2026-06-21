import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

interface CancelInput { bookingId: number }

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId }: CancelInput) => {
      const { data } = await api.post<{ status: string }>(`/bookings/${bookingId}/cancel`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rides', 'feed'] });
    },
  });
}
