import { create } from 'zustand';

export interface DriverPosition {
  latitude: number;
  longitude: number;
  heading?: number;
}

interface TrackingState {
  activeRef: string | null;
  driverPosition: DriverPosition | null;
  setActiveRef: (ref: string | null) => void;
  setDriverPosition: (pos: DriverPosition | null) => void;
  reset: () => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  activeRef: null,
  driverPosition: null,
  setActiveRef: (activeRef) => set({ activeRef }),
  setDriverPosition: (driverPosition) => set({ driverPosition }),
  reset: () => set({ activeRef: null, driverPosition: null }),
}));
