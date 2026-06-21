import { Mutex } from 'async-mutex';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import {
  getRefreshToken,
  setRefreshToken,
  setAccessToken,
  clearAccessToken,
  clearRefreshToken,
} from '@/lib/auth/tokens';
import { useAuthStore } from '@/lib/auth/store';

const refreshMutex = new Mutex();

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export function installRefreshInterceptor(api: AxiosInstance, baseURL: string) {
  api.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
      const original = error.config as RetriableConfig | undefined;
      const status = error.response?.status;

      if (status !== 401 || !original || original._retried) {
        return Promise.reject(error);
      }
      original._retried = true;

      try {
        await refreshMutex.runExclusive(async () => {
          const refreshToken = await getRefreshToken();
          if (!refreshToken) throw new Error('no_refresh_token');
          // Bare axios (not the api instance) so this refresh call doesn't re-enter the interceptors.
          const { data } = await axios.post<RefreshResponse>(`${baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          setAccessToken(data.access_token);
          await setRefreshToken(data.refresh_token);
        });
      } catch (refreshErr) {
        clearAccessToken();
        await clearRefreshToken();
        useAuthStore.getState().clearSession();
        return Promise.reject(refreshErr);
      }

      return api(original);
    },
  );
}
