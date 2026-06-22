import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export function useSubmitForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ status: string }>('/driver/me/submit-for-review');
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['driver', 'documents'] });
    },
  });
}
