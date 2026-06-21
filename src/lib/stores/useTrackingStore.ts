import { create } from 'zustand';

interface DriverPosition {
  lat: number;
  lng: number;
  heading: number;
}

interface TrackingState {
  activeRideId: number | null;
  lastDriverPosition: DriverPosition | null;
  setActiveRideId: (id: number | null) => void;
  setDriverPosition: (pos: DriverPosition | null) => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  activeRideId: null,
  lastDriverPosition: null,
  setActiveRideId: (id) => set({ activeRideId: id }),
  setDriverPosition: (pos) => set({ lastDriverPosition: pos }),
}));
