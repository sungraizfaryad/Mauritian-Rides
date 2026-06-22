import { create } from 'zustand';
import type { Pickup } from '@/schemas/booking';

interface BookingDraftState {
  pickup: Pickup | null;
  dropoff: string;
  passengers: number;
  rider_name: string;
  rider_phone: string;
  rider_email: string;
  vehicle: 'sedan' | 'van' | 'minibus';
  vehicle_preference: string;
  distance_km: number | null;
  duration_min: number | null;
  fare_mur: number | null;
  notes: string;
  setPickup: (p: Pickup | null) => void;
  setDropoff: (d: string) => void;
  setPassengers: (n: number) => void;
  setRiderName: (v: string) => void;
  setRiderPhone: (v: string) => void;
  setRiderEmail: (v: string) => void;
  setVehicle: (v: 'sedan' | 'van' | 'minibus') => void;
  setVehiclePreference: (v: string) => void;
  setDistanceKm: (v: number | null) => void;
  setDurationMin: (v: number | null) => void;
  setFareMur: (v: number | null) => void;
  setNotes: (v: string) => void;
  clear: () => void;
}

const initial: Omit<BookingDraftState, `set${string}` | 'clear'> = {
  pickup: null,
  dropoff: '',
  passengers: 1,
  rider_name: '',
  rider_phone: '',
  rider_email: '',
  vehicle: 'sedan',
  vehicle_preference: '',
  distance_km: null,
  duration_min: null,
  fare_mur: null,
  notes: '',
};

export const useBookingDraftStore = create<BookingDraftState>((set) => ({
  ...initial,
  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),
  setPassengers: (passengers) => set({ passengers }),
  setRiderName: (rider_name) => set({ rider_name }),
  setRiderPhone: (rider_phone) => set({ rider_phone }),
  setRiderEmail: (rider_email) => set({ rider_email }),
  setVehicle: (vehicle) => set({ vehicle }),
  setVehiclePreference: (vehicle_preference) => set({ vehicle_preference }),
  setDistanceKm: (distance_km) => set({ distance_km }),
  setDurationMin: (duration_min) => set({ duration_min }),
  setFareMur: (fare_mur) => set({ fare_mur }),
  setNotes: (notes) => set({ notes }),
  clear: () => set({ ...initial }),
}));
