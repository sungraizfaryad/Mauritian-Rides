import * as LocalAuthentication from 'expo-local-authentication';
import { api } from '@/lib/api/client';
import { useAuthStore, type Persona } from './store';
import { getRefreshToken } from './tokens';

interface MeResponse {
  user_id: number;
  display_name: string;
  role: Persona;
  locale: 'en' | 'fr';
}

export async function hydrateSession(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const { data } = await api.get<MeResponse>('/me');
    useAuthStore.getState().setSession({
      userId: data.user_id,
      persona: data.role,
      displayName: data.display_name,
      locale: data.locale,
    });
    return true;
  } catch {
    return false;
  }
}

export async function biometricUnlock(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !enrolled) return true;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock your driver account',
  });
  return result.success;
}
