import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { api } from '@/lib/api/client';
import { locationQueue } from '@/lib/stores/locationQueue';
import { useTrackingStore } from '@/lib/stores/useTrackingStore';

export const RIDE_SHARE_TASK = 'DRIVER_LOCATION_TASK';

// Holds the active ride id across task invocations; set by startSharing.
let activeRideId = 0;

// Must live at module scope — Expo registers tasks before any navigation renders.
// The Jest mock makes this a no-op so no native runtime is needed in tests.
TaskManager.defineTask(
  RIDE_SHARE_TASK,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
    if (error || !data?.locations?.length) return;
    if (!activeRideId) return;

    const loc = data.locations[0];
    if (!loc) return;

    const fresh = {
      rideId: activeRideId,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      heading: loc.coords.heading ?? 0,
      accuracy: loc.coords.accuracy ?? 0,
      ts: loc.timestamp,
    };

    useTrackingStore.getState().setDriverPosition({ lat: fresh.lat, lng: fresh.lng, heading: fresh.heading });

    // Drain any previously queued payloads first, then send the fresh one.
    const pending = locationQueue.flush();
    const batch = [...pending, fresh];

    for (const item of batch) {
      api
        .post(`/rides/${item.rideId}/location`, {
          lat: item.lat,
          lng: item.lng,
          heading: item.heading,
          accuracy: item.accuracy,
        })
        .catch(() => {
          locationQueue.enqueue(item);
        });
    }
  },
);

export type ShareResult = { status: 'ok' } | { status: 'denied' } | { status: 'error' };

export async function startSharing(rideId: number): Promise<ShareResult> {
  try {
    const already = await Location.hasStartedLocationUpdatesAsync(RIDE_SHARE_TASK);
    if (already) return { status: 'ok' };

    // Foreground permission required on both platforms.
    const fgPerm = await Location.requestForegroundPermissionsAsync();
    if (fgPerm.status !== 'granted') return { status: 'denied' };

    // Android 10+ requires background permission for foreground-service location tasks.
    // On iOS, the foreground permission covers in-use background location.
    if (Platform.OS === 'android') {
      const bgPerm = await Location.requestBackgroundPermissionsAsync();
      if (bgPerm.status !== 'granted') return { status: 'denied' };
    }

    activeRideId = rideId;
    useTrackingStore.getState().setActiveRideId(rideId);

    await Location.startLocationUpdatesAsync(RIDE_SHARE_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 20,
      deferredUpdatesInterval: 5000,
      foregroundService: {
        notificationTitle: 'Mauritian Rides',
        notificationBody: 'Sharing your location with the rider.',
        notificationColor: '#00b4d8',
      },
    });

    return { status: 'ok' };
  } catch {
    return { status: 'error' };
  }
}

export async function stopSharing(): Promise<void> {
  activeRideId = 0;
  locationQueue.clear();
  useTrackingStore.getState().setActiveRideId(null);
  useTrackingStore.getState().setDriverPosition(null);
  const running = await Location.hasStartedLocationUpdatesAsync(RIDE_SHARE_TASK);
  if (running) await Location.stopLocationUpdatesAsync(RIDE_SHARE_TASK);
}

export async function isSharing(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(RIDE_SHARE_TASK);
}
