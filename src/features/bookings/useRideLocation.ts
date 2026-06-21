import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface DriverLocation {
  ride_id: number;
  driver_id: number;
  latitude: number;
  longitude: number;
  heading?: number;
  accuracy?: number;
  recorded_at: string;
}

/** Polls the driver's last position every 5s while `enabled` (i.e. ride is accepted). */
export function useRideLocation(rideId: number, enabled: boolean) {
  return useQuery<DriverLocation>({
    queryKey: ['ride', rideId, 'location'],
    queryFn: async () => {
      const { data } = await api.get<DriverLocation>(`/rides/${rideId}/location`);
      return data;
    },
    enabled,
    refetchInterval: enabled ? 5_000 : false,
    staleTime: 4_000,
  });
}
