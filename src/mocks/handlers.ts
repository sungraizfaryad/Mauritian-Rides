import { http, HttpResponse, delay } from 'msw';

const BASE = 'https://mauritianrides.com/wp-json/mr/v1';

export const mockState = { accessTokenValid: true };

let mockBookingSeq = 0;
let mockDriverDrift = 0;

export const mockAcceptScenario: { mode: '200' | '402' | '409' } = { mode: '200' };
export const mockCapState: { reached: boolean } = { reached: false };
export const mockDocUploadFail: { fail: boolean } = { fail: false };

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
      pickup_lat: -20.1609,
      pickup_lng: 57.5012,
      dropoff: 'Grand Baie',
      passengers: 2,
      accepted_by: null,
      fare: '1500.00',
      created_at: '2026-06-22T08:00:00.000Z',
    });
  }),

  http.post(`${BASE}/bookings`, async ({ request }) => {
    await delay(60);
    const body = (await request.json()) as {
      pickup?: { label?: string; latitude?: number; longitude?: number };
      dropoff?: string;
      passengers?: number;
    };
    mockBookingSeq += 1;
    const ref = `MR-20260622-${String(mockBookingSeq).padStart(4, '0')}`;
    return HttpResponse.json(
      {
        id: 1000 + mockBookingSeq,
        ref,
        status: 'open',
        pickup: body.pickup?.label ?? 'Pickup',
        pickup_lat: body.pickup?.latitude ?? -20.1609,
        pickup_lng: body.pickup?.longitude ?? 57.5012,
        dropoff: body.dropoff ?? '',
        passengers: body.passengers ?? 1,
        accepted_by: null,
        fare: '1500.00',
        created_at: '2026-06-22T08:00:00.000Z',
      },
      { status: 201 },
    );
  }),

  http.get(`${BASE}/me/bookings`, () => {
    return HttpResponse.json([
      {
        id: 42, ref: 'MR-20260620-0042', status: 'completed',
        pickup: 'Port Louis', pickup_lat: -20.1609, pickup_lng: 57.5012,
        dropoff: 'Grand Baie', passengers: 2, accepted_by: 2, fare: '1500.00',
        created_at: '2026-06-20T09:00:00.000Z',
      },
      {
        id: 43, ref: 'MR-20260621-0043', status: 'accepted',
        pickup: 'Flic en Flac', pickup_lat: -20.2747, pickup_lng: 57.3697,
        dropoff: 'Curepipe', passengers: 1, accepted_by: 2, fare: '900.00',
        created_at: '2026-06-21T14:00:00.000Z',
      },
    ]);
  }),

  http.get(`${BASE}/rides/:id/location`, () => {
    mockDriverDrift = (mockDriverDrift + 1) % 50;
    return HttpResponse.json({
      ride_id: 42,
      driver_id: 2,
      latitude: -20.16 + mockDriverDrift * 0.0006,
      longitude: 57.5 + mockDriverDrift * 0.0006,
      heading: 45,
      accuracy: 8,
      recorded_at: '2026-06-22T08:05:00.000Z',
    });
  }),

  http.post(`${BASE}/me/device-token`, () => new HttpResponse(null, { status: 204 })),

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

  http.get(`${BASE}/rides/feed`, () =>
    HttpResponse.json([
      {
        id: 101,
        ref: 'MR-20260622-0101',
        status: 'open',
        pickup: 'Port Louis',
        pickup_lat: -20.1609,
        pickup_lng: 57.5012,
        dropoff: 'Grand Baie',
        passengers: 2,
        fare: '1500.00',
        distance_km: 1.2,
        created_at: '2026-06-22T08:00:00.000Z',
      },
      {
        id: 102,
        ref: 'MR-20260622-0102',
        status: 'open',
        pickup: 'Curepipe',
        pickup_lat: -20.3160,
        pickup_lng: 57.5125,
        dropoff: 'Mahebourg',
        passengers: 1,
        fare: '900.00',
        distance_km: 4.7,
        created_at: '2026-06-22T08:15:00.000Z',
      },
    ]),
  ),

  // Numeric booking lookup for the driver detail screen.
  // The existing GET /bookings/:ref handler uses a string ref; this one takes a numeric id.
  http.get(`${BASE}/bookings/by-id/:id`, ({ params }) =>
    HttpResponse.json({
      id: Number(params.id),
      ref: `MR-20260622-${String(params.id).padStart(4, '0')}`,
      status: 'open',
      pickup: 'Port Louis',
      pickup_lat: -20.1609,
      pickup_lng: 57.5012,
      dropoff: 'Grand Baie',
      passengers: 2,
      accepted_by: null,
      fare: '1500.00',
      created_at: '2026-06-22T08:00:00.000Z',
    }),
  ),

  http.post(`${BASE}/bookings/:id/accept`, async ({ params }) => {
    await delay(80);
    if (mockAcceptScenario.mode === '402') {
      return HttpResponse.json(
        { code: 'cap_reached', message: 'Monthly cap reached. Upgrade your plan to accept more rides.' },
        { status: 402 },
      );
    }
    if (mockAcceptScenario.mode === '409') {
      return HttpResponse.json(
        { code: 'race_lost', message: 'Another driver accepted this ride first.' },
        { status: 409 },
      );
    }
    return HttpResponse.json({
      id: Number(params.id),
      status: 'accepted',
      accepted_by: 2,
      accepted_at: '2026-06-22T09:00:00.000Z',
    });
  }),

  http.post(`${BASE}/bookings/:id/cancel`, async () => {
    await delay(60);
    return HttpResponse.json({ status: 'cancelled' });
  }),

  http.post(`${BASE}/rides/:id/location`, async () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE}/me/cap`, () =>
    HttpResponse.json({
      plan: 'free',
      used: mockCapState.reached ? 10 : 3,
      limit: 10,
      reached: mockCapState.reached,
      reset_at: '2026-07-01T00:00:00.000Z',
    }),
  ),

  http.get(`${BASE}/me/upgrade-url`, ({ request }) => {
    const plan = new URL(request.url).searchParams.get('plan') ?? 'silver';
    return HttpResponse.json({
      url: `https://mauritianrides.com/checkout/upgrade?plan=${plan}&nonce=mock123`,
    });
  }),

  http.post(`${BASE}/drivers/documents/:slug`, async ({ params }) => {
    await delay(80);
    if (mockDocUploadFail.fail) {
      return HttpResponse.json(
        { code: 'unsupported_media_type', message: 'Unsupported file type.' },
        { status: 415 },
      );
    }
    return HttpResponse.json(
      { slug: params.slug, status: 'pending', uploaded_at: '2026-06-22T09:00:00.000Z' },
      { status: 201 },
    );
  }),
];
