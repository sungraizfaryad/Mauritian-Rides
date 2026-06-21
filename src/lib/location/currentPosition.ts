import * as Location from 'expo-location';
import type { Pickup } from '@/schemas/booking';

export type PickupResult =
  | { status: 'ok'; pickup: Pickup }
  | { status: 'denied' }
  | { status: 'error' };

export async function getCurrentPickup(): Promise<PickupResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { status: 'denied' };

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { latitude, longitude } = pos.coords;

    let label = 'Current location';
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = places[0];
      label = place?.name ?? place?.city ?? label;
    } catch {
      // reverse geocode is best-effort; keep the fallback label
    }

    return { status: 'ok', pickup: { latitude, longitude, label } };
  } catch {
    return { status: 'error' };
  }
}
