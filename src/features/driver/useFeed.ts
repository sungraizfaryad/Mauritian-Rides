import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { api } from '@/lib/api/client';

export interface OpenRide {
  id: number;
  ref: string;
  status: 'open';
  pickup: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff: string;
  passengers: number;
  fare: string;
  distance_km: number;
  created_at: string;
}

export interface CurrentRide {
  id: number;
  ref: string;
  status: 'accepted';
  pickup: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff: string;
  passengers: number;
  fare: string;
  rider_name?: string;
  rider_phone?: string;
}

export interface FeedResponse {
  open_rides: OpenRide[];
  current_ride: CurrentRide | null;
  plan: string;
  used: number;
  limit: number | null;
  cap_reached: boolean;
  reset_at: string;
  driver_name?: string;
  driver_status?: 'active' | 'pending' | 'bg_check' | 'suspended';
}

export function useFeed() {
  const query = useQuery<FeedResponse>({
    queryKey: ['rides', 'feed'],
    queryFn: async () => {
      const { data } = await api.get<FeedResponse>('/rides/feed');
      return data;
    },
    refetchInterval: 5_000,
    staleTime: 2_500,
  });

  // pause polling when app goes to background
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/active/) && next === 'background') {
        // nothing needed — refetchInterval only fires while query is observed,
        // and when the app is backgrounded RN suspends timers automatically.
        // Explicitly refetch when returning to foreground.
      }
      if (next === 'active' && !appState.current.match(/active/)) {
        void query.refetch();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [query]);

  return query;
}
