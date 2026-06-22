import type { Location } from '@/constants/locations';

// Straight-line distance in km between two lat/lng points.
export function haversine(a: Location, b: Location): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

// Road distance factor — matches page-home.js exactly.
const ROAD_FACTOR = 1.35;

// Vehicle multipliers (sedan=1, van=1.3, minibus=1.6).
export type VehicleType = 'sedan' | 'van' | 'minibus';

const MULTIPLIERS: Record<VehicleType, number> = {
  sedan:   1.0,
  van:     1.3,
  minibus: 1.6,
};

export interface FareResult {
  km: number;
  fare: number;
  margin: number;
}

// Client-side fare estimate matching the website formula.
// fare = 150 + 28 * km * vehicleMultiplier
// margin = km * 3
export function estimateFare(
  pickup: Location,
  dropoff: Location,
  vehicle: VehicleType = 'sedan',
): FareResult {
  const straight = haversine(pickup, dropoff);
  const km = Math.max(1, Math.round(straight * ROAD_FACTOR));
  const multiplier = MULTIPLIERS[vehicle];
  const fare = Math.round(150 + 28 * km * multiplier);
  const margin = Math.round(km * 3);
  return { km, fare, margin };
}
