import { http, HttpResponse, delay } from 'msw';

const BASE = 'https://mauritianrides.com/wp-json/mr/v1';

export const handlers = [
  http.post(`${BASE}/auth/token`, async () => {
    await delay(50);
    return HttpResponse.json({
      access_token: 'mock.jwt.access',
      refresh_token: 'mock.refresh',
      expires_in: 900,
      persona: 'rider',
      user_id: 1,
      display_name: 'Test Rider',
      locale: 'en',
    });
  }),

  http.post(`${BASE}/auth/refresh`, async () => {
    await delay(20);
    return HttpResponse.json({
      access_token: 'mock.jwt.access.refreshed',
      refresh_token: 'mock.refresh.rotated',
      expires_in: 900,
    });
  }),

  http.get(`${BASE}/me`, async ({ request }) => {
    if (!request.headers.get('Authorization')?.startsWith('Bearer ')) {
      return HttpResponse.json({ code: 'unauthorized' }, { status: 401 });
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
];
