import { create } from 'zustand';
import type { Pickup } from '@/schemas/booking';

interface BookingDraftState {
  pickup: Pickup | null;
  dropoff: string;
  passengers: number;
  setPickup: (p: Pickup | null) => void;
  setDropoff: (d: string) => void;
  setPassengers: (n: number) => void;
  clear: () => void;
}

const initial = { pickup: null, dropoff: '', passengers: 1 };

export const useBookingDraftStore = create<BookingDraftState>((set) => ({
  ...initial,
  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),
  setPassengers: (passengers) => set({ passengers }),
  clear: () => set({ ...initial }),
}));
