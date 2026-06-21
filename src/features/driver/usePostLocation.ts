import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

// Exposed for flush logic that needs to retry queued payloads
export interface LocationPostPayload {
  rideId: number;
  lat: number;
  lng: number;
  heading: number;
  accuracy: number;
}

export function usePostLocation() {
  return useMutation({
    mutationFn: async ({ rideId, lat, lng, heading, accuracy }: LocationPostPayload) => {
      await api.post(`/rides/${rideId}/location`, { lat, lng, heading, accuracy });
    },
  });
}
