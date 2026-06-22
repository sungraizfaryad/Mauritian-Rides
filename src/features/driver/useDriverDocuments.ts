import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface DriverDocument {
  slug: string;
  status: 'missing' | 'pending' | 'approved' | 'rejected';
  filename?: string;
  uploaded_at?: string;
  rejection_reason?: string;
}

export interface DriverDocumentsResponse {
  photo: DriverDocument & { url?: string };
  documents: DriverDocument[];
  driver_status: string;
  can_submit: boolean;
  under_review: boolean;
}

export function useDriverDocuments() {
  return useQuery<DriverDocumentsResponse>({
    queryKey: ['driver', 'documents'],
    queryFn: async () => {
      const { data } = await api.get<DriverDocumentsResponse>('/driver/me/documents');
      return data;
    },
    staleTime: 30_000,
  });
}
