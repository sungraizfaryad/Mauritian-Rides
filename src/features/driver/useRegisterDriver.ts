import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore, type Session, type Persona } from '@/lib/auth/store';
import { setAccessToken, setRefreshToken } from '@/lib/auth/tokens';
import { identifyUser } from '@/lib/observability/analytics';
import type { DriverSignupPayload } from '@/schemas/driverSignup';

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

export function useRegisterDriver() {
  return useMutation({
    mutationFn: async (payload: DriverSignupPayload) => {
      const body = {
        ...payload,
        mobile: `+230${payload.mobile}`,
      };
      const { data } = await api.post<TokenResponse>('/drivers/register', body);
      return persist(data);
    },
  });
}
