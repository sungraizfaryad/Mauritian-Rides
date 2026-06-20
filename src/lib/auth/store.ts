import { create } from 'zustand';

export type Persona = 'rider' | 'driver';

export interface Session {
  userId: number;
  persona: Persona;
  displayName: string;
  locale: 'en' | 'fr';
  plan?: 'free' | 'silver' | 'gold' | 'fleet';
}

interface AuthState {
  session: Session | null;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
