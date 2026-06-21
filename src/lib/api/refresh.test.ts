import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { mockState } from '@/mocks/handlers';
import { api } from './client';
import * as tokens from '@/lib/auth/tokens';
import { useAuthStore } from '@/lib/auth/store';

// Spy on the SecureStore-backed fns so the interceptor gets a refresh token.
// We can't mock the whole module because setAccessToken/getAccessToken use
// a module-level variable — replacing the module gives a separate instance.
let getRefreshSpy: jest.SpyInstance;
let setRefreshSpy: jest.SpyInstance;

beforeAll(() => {
  getRefreshSpy = jest.spyOn(tokens, 'getRefreshToken').mockResolvedValue('mock.refresh');
  setRefreshSpy = jest.spyOn(tokens, 'setRefreshToken').mockResolvedValue(undefined);
});

afterAll(() => {
  getRefreshSpy.mockRestore();
  setRefreshSpy.mockRestore();
});

beforeEach(() => {
  tokens.clearAccessToken();
  mockState.accessTokenValid = true;
  useAuthStore.getState().clearSession();
});

describe('refresh interceptor', () => {
  it('refreshes once on 401 then retries the original request', async () => {
    tokens.setAccessToken('stale');
    mockState.accessTokenValid = false; // first /me will 401

    const res = await api.get('/me');

    expect(res.status).toBe(200);
    expect(res.data.user_id).toBe(1);
  });

  it('rejects when refresh itself fails', async () => {
    tokens.setAccessToken('stale');
    mockState.accessTokenValid = false;
    server.use(
      http.post('https://mauritianrides.com/wp-json/mr/v1/auth/refresh', () =>
        HttpResponse.json({ code: 'invalid_refresh' }, { status: 401 }),
      ),
    );

    await expect(api.get('/me')).rejects.toMatchObject({ status: 401 });
  });

  it('clears the session when refresh fails', async () => {
    useAuthStore.getState().setSession({ userId: 1, persona: 'rider', displayName: 'X', locale: 'en' });
    tokens.setAccessToken('stale');
    mockState.accessTokenValid = false;
    server.use(
      http.post('https://mauritianrides.com/wp-json/mr/v1/auth/refresh', () =>
        HttpResponse.json({ code: 'invalid_refresh' }, { status: 401 }),
      ),
    );
    await expect(api.get('/me')).rejects.toBeDefined();
    expect(useAuthStore.getState().session).toBeNull();
  });
});
