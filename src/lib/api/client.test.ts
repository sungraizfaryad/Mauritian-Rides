import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { api } from './client';
import { setAccessToken, clearAccessToken } from '@/lib/auth/tokens';

const BASE = 'https://mauritianrides.com/wp-json/mr/v1';

describe('api client', () => {
  beforeEach(() => clearAccessToken());

  it('attaches the Bearer token from memory when present', async () => {
    setAccessToken('jwt.test');

    let seenAuth: string | null = null;
    server.use(
      http.get(`${BASE}/me`, ({ request }) => {
        seenAuth = request.headers.get('Authorization');
        return HttpResponse.json({ user_id: 1 });
      }),
    );

    await api.get('/me');
    expect(seenAuth).toBe('Bearer jwt.test');
  });

  it('normalizes error envelope on 4xx', async () => {
    server.use(
      http.get(`${BASE}/bookings/missing`, () =>
        HttpResponse.json({ code: 'not_found', message: 'No such ref' }, { status: 404 }),
      ),
    );

    await expect(api.get('/bookings/missing')).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
      message: 'No such ref',
    });
  });
});
