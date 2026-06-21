import axios, { type AxiosError, type AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import Constants from 'expo-constants';
import { getAccessToken } from '@/lib/auth/tokens';
import { installRefreshInterceptor } from './refresh';

const baseURL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'https://mauritianrides.com/wp-json/mr/v1';

export interface ApiError {
  status: number;
  code: string;
  message: string;
}

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 12_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Registered first → runs first on errors (FIFO). Sees raw AxiosError with .config/.response,
// retries on 401 after refreshing. On refresh failure, rejects with the raw error so
// normalize (registered second) can convert it to ApiError { status }.
installRefreshInterceptor(api, baseURL);

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ code?: string; message?: string }>) => {
    const status = err.response?.status ?? 0;
    const code = err.response?.data?.code ?? (err.code ?? 'network_error');
    const message = err.response?.data?.message ?? err.message;
    const apiError: ApiError = { status, code, message };
    return Promise.reject(apiError);
  },
);

// Registered after the response interceptors on purpose: 429 retries run before refresh in the error chain.
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (e) => e.response?.status === 429,
});
