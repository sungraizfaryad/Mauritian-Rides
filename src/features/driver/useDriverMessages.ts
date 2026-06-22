import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface DriverMessage {
  id: number;
  subject: string;
  body: string;
  read: boolean;
  created_at: string;
}

export function useDriverMessages(enabled = false) {
  return useQuery<DriverMessage[]>({
    queryKey: ['driver', 'messages'],
    queryFn: async () => {
      const { data } = await api.get<DriverMessage[]>('/driver/me/messages');
      return data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useUnreadCount(messages: DriverMessage[] | undefined) {
  if (!messages) return 0;
  return messages.filter((m) => !m.read).length;
}
