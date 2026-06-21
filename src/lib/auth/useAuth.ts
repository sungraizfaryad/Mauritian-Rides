import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore, type Session, type Persona } from './store';
import { setAccessToken, setRefreshToken, clearAccessToken, clearRefreshToken, getRefreshToken } from './tokens';
import type { LoginInput, RegisterInput } from '@/schemas/auth';
import { identifyUser, resetIdentity } from '@/lib/observability/analytics';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  persona: Persona;
  user_id: number;
  display_name: string;
  locale: 'en' | 'fr';
  plan?: Session['plan'];
}

async function persist(res: TokenResponse): Promise<Session> {
  setAccessToken(res.access_token);
  await setRefreshToken(res.refresh_token);
  const session: Session = {
    userId: res.user_id,
    persona: res.persona,
    displayName: res.display_name,
    locale: res.locale,
    plan: res.plan,
  };
  useAuthStore.getState().setSession(session);
  identifyUser(session.userId, session.persona);
  return session;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post<TokenResponse>('/auth/token', input);
      return persist(data);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await api.post<TokenResponse>('/drivers/register', input);
      return persist(data);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/revoke', { refresh_token: refreshToken }).catch(() => undefined);
      }
      clearAccessToken();
      await clearRefreshToken();
      useAuthStore.getState().clearSession();
      resetIdentity();
    },
  });
}
