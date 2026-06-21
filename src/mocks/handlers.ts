import { http, HttpResponse, delay } from 'msw';

const BASE = 'https://mauritianrides.com/wp-json/mr/v1';

export const mockState = { accessTokenValid: true };

export const handlers = [
  http.post(`${BASE}/auth/token`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as { email?: string };
    const isDriver = (body.email ?? '').toLowerCase().startsWith('driver');
    mockState.accessTokenValid = true;
    return HttpResponse.json({
      access_token: 'mock.jwt.access',
      refresh_token: 'mock.refresh',
      expires_in: 900,
      persona: isDriver ? 'driver' : 'rider',
      user_id: isDriver ? 2 : 1,
      display_name: isDriver ? 'Test Driver' : 'Test Rider',
      locale: 'en',
      plan: isDriver ? 'free' : undefined,
    });
  }),

  http.post(`${BASE}/auth/refresh`, async () => {
    await delay(20);
    mockState.accessTokenValid = true;
    return HttpResponse.json({
      access_token: 'mock.jwt.access.refreshed',
      refresh_token: 'mock.refresh.rotated',
      expires_in: 900,
    });
  }),

  http.get(`${BASE}/me`, () => {
    if (!mockState.accessTokenValid) {
      return HttpResponse.json({ code: 'jwt_expired', message: 'expired' }, { status: 401 });
    }
    return HttpResponse.json({
      user_id: 1,
      display_name: 'Test Rider',
      role: 'rider',
      locale: 'en',
    });
  }),

  http.get(`${BASE}/bookings/:ref`, ({ params }) => {
    return HttpResponse.json({
      id: 42,
      ref: params.ref,
      status: 'open',
      pickup: 'Port Louis',
      dropoff: 'Grand Baie',
      accepted_by: null,
      fare: '1500.00',
      created_at: new Date().toISOString(),
    });
  }),

  http.post(`${BASE}/drivers/register`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; persona?: string };
    return HttpResponse.json({
      access_token: 'mock.jwt.access',
      refresh_token: 'mock.refresh',
      expires_in: 900,
      persona: body.persona === 'driver' ? 'driver' : 'rider',
      user_id: 3,
      display_name: 'New User',
      locale: 'en',
    });
  }),

  http.post(`${BASE}/auth/revoke`, () => new HttpResponse(null, { status: 204 })),
];
