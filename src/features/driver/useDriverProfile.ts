import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface ProfilePayload {
  display_name?: string;
  current_password?: string;
  new_password?: string;
}

export interface ProfileResponse {
  display_name: string;
}

export function useDriverProfile() {
  return useMutation({
    mutationFn: async (payload: ProfilePayload) => {
      const { data } = await api.post<ProfileResponse>('/driver/me/profile', payload);
      return data;
    },
  });
}
