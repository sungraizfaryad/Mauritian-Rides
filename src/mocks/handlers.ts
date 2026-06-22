import { http, HttpResponse, delay } from 'msw';

const BASE = 'https://mauritianrides.com/wp-json/mr/v1';
const WP_BASE = 'http://mauritianrides.local/wp-json/wp/v2';

const mockPosts = [
  {
    id: 1,
    slug: 'best-beaches-mauritius',
    title: { rendered: 'Best Beaches in Mauritius' },
    excerpt: { rendered: '<p>A guide to the top beaches on the island.</p>' },
    content: { rendered: '<h2 id="intro">Introduction</h2><p>Mauritius has stunning beaches.</p>' },
    date: '2026-06-01T10:00:00',
    mr_toc: [{ id: 'intro', text: 'Introduction', level: 2 }],
    _embedded: {
      'wp:featuredmedia': [{ source_url: 'https://picsum.photos/800/400', media_details: null }],
      'wp:term': [[{ id: 10, name: 'Travel', slug: 'travel' }], []],
    },
  },
  {
    id: 2,
    slug: 'airport-transfers-guide',
    title: { rendered: 'Airport Transfers: A Complete Guide' },
    excerpt: { rendered: '<p>Everything you need to know about getting from SSR Airport.</p>' },
    content: { rendered: '<h2 id="overview">Overview</h2><p>SSR Airport is the main gateway.</p>' },
    date: '2026-05-15T09:00:00',
    mr_toc: [{ id: 'overview', text: 'Overview', level: 2 }],
    _embedded: {
      'wp:featuredmedia': [{ source_url: 'https://picsum.photos/800/401', media_details: null }],
      'wp:term': [[{ id: 10, name: 'Travel', slug: 'travel' }], []],
    },
  },
];

const mockCategories = [
  { id: 10, name: 'Travel', slug: 'travel' },
  { id: 11, name: 'Tips', slug: 'tips' },
];

export const mockState = { accessTokenValid: true };

let mockBookingSeq = 0;
let mockDriverDrift = 0;

export const mockAcceptScenario: { mode: '200' | '402' | '409' } = { mode: '200' };
export const mockCapState: { reached: boolean } = { reached: false };
export const mockDocUploadFail: { fail: boolean } = { fail: false };
export const mockFeedState: { empty: boolean; driverStatus?: string } = { empty: false };
export const mockDeleteAccountScenario: { mode: '204' | '403' | '500' } = { mode: '204' };

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
    const hasDriver = String(params.ref).includes('MR');
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
      driver: hasDriver
        ? { name: 'Test Driver', car: 'Toyota Vios', plate: 'NM 1234', phone: '+23057123456' }
        : undefined,
    });
  }),

  http.get(`${BASE}/vehicles`, () =>
    HttpResponse.json({
      vehicles: [
        { slug: 'any_sedan', label: 'Any sedan (1–3 passengers)', capacity: 'sedan' },
        { slug: 'any_van',   label: 'Any van (4–7 passengers)',   capacity: 'van' },
      ],
    }),
  ),

  http.post(`${BASE}/bookings`, async ({ request }) => {
    await delay(60);
    const body = (await request.json()) as {
      pickup?: { name?: string; lat?: number; lng?: number };
      dropoff?: { name?: string };
      rider_name?: string;
      rider_phone?: string;
    };
    mockBookingSeq += 1;
    const ref = `MR-20260622-${String(mockBookingSeq).padStart(4, '0')}`;
    return HttpResponse.json(
      {
        id: 1000 + mockBookingSeq,
        ref,
        status: 'open',
        pickup: body.pickup?.name ?? 'Pickup',
        pickup_lat: body.pickup?.lat ?? -20.1609,
        pickup_lng: body.pickup?.lng ?? 57.5012,
        dropoff: body.dropoff?.name ?? '',
        passengers: 1,
        accepted_by: null,
        fare: '1500.00',
        created_at: '2026-06-22T08:00:00.000Z',
      },
      { status: 201 },
    );
  }),

  http.get(`${BASE}/me/bookings`, ({ request }) => {
    const status = new URL(request.url).searchParams.get('status');
    const all = [
      {
        id: 42, ref: 'MR-20260620-0042', status: 'completed',
        pickup: 'Port Louis', pickup_lat: -20.1609, pickup_lng: 57.5012,
        dropoff: 'Grand Baie', passengers: 2, accepted_by: 2, fare: '1500.00',
        rider_name: 'Test Rider',
        created_at: '2026-06-20T09:00:00.000Z',
      },
      {
        id: 43, ref: 'MR-20260621-0043', status: 'cancelled',
        pickup: 'Flic en Flac', pickup_lat: -20.2747, pickup_lng: 57.3697,
        dropoff: 'Curepipe', passengers: 1, accepted_by: 2, fare: '900.00',
        rider_name: 'Another Rider',
        created_at: '2026-06-21T14:00:00.000Z',
      },
    ];
    const rows = status ? all.filter((b) => b.status === status || status === 'completed' && b.status === 'cancelled') : all;
    return HttpResponse.json(rows);
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

  http.post(`${BASE}/drivers/register`, async () => {
    return HttpResponse.json({
      access_token: 'mock.jwt.access',
      refresh_token: 'mock.refresh',
      expires_in: 900,
      persona: 'driver',
      user_id: 3,
      display_name: 'New Driver',
      locale: 'en',
      plan: 'free',
    });
  }),

  http.post(`${BASE}/auth/revoke`, () => new HttpResponse(null, { status: 204 })),

  http.delete(`${BASE}/me/account`, async () => {
    await delay(60);
    if (mockDeleteAccountScenario.mode === '403') {
      return HttpResponse.json(
        { code: 'wrong_password', message: 'Current password is incorrect.' },
        { status: 403 },
      );
    }
    if (mockDeleteAccountScenario.mode === '500') {
      return HttpResponse.json(
        { code: 'server_error', message: 'Internal server error.' },
        { status: 500 },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE}/rides/feed`, () => {
    const openRides = mockFeedState.empty ? [] : [
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
    ];
    return HttpResponse.json({
      open_rides: openRides,
      current_ride: null,
      plan: 'free',
      used: mockCapState.reached ? 10 : 3,
      limit: 10,
      cap_reached: mockCapState.reached,
      reset_at: '2026-07-01T00:00:00.000Z',
      driver_name: 'Test Driver',
      driver_status: mockFeedState.driverStatus ?? 'active',
    });
  }),

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

  http.post(`${BASE}/rides/:id/cancel`, async () => {
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
      cap_reached: mockCapState.reached,
      reset_at: '2026-07-01T00:00:00.000Z',
    }),
  ),

  http.get(`${BASE}/packages`, () =>
    HttpResponse.json([
      {
        slug: 'free',
        name: 'Free',
        price: 0,
        limit: 5,
        perks: ['Up to 5 bookings/month'],
        featured: false,
      },
      {
        slug: 'silver',
        name: 'Silver',
        price: 500,
        limit: 30,
        perks: ['Up to 30 bookings/month', 'Priority listing'],
        featured: true,
      },
      {
        slug: 'gold',
        name: 'Gold',
        price: 1200,
        limit: null,
        perks: ['Unlimited bookings', 'Priority listing', 'Dashboard analytics'],
        featured: false,
      },
      {
        slug: 'fleet',
        name: 'Fleet',
        price: 0,
        limit: null,
        perks: ['Custom fleet pricing', 'Dedicated account manager'],
        featured: false,
      },
    ]),
  ),

  http.post(`${BASE}/bookings/:id/complete`, async ({ params }) => {
    await delay(60);
    return HttpResponse.json({ id: Number(params.id), status: 'completed' });
  }),

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

  http.get(`${BASE}/driver/me/documents`, () =>
    HttpResponse.json({
      photo: { slug: 'photo', status: 'missing' },
      documents: [
        { slug: 'nid',     status: 'missing' },
        { slug: 'licence', status: 'missing' },
        { slug: 'psv',     status: 'missing' },
      ],
      driver_status: 'pending',
      can_submit: false,
      under_review: false,
    }),
  ),

  http.post(`${BASE}/driver/me/submit-for-review`, async () => {
    await delay(60);
    return HttpResponse.json({ status: 'under_review' });
  }),

  http.post(`${BASE}/driver/me/profile`, async ({ request }) => {
    await delay(60);
    const body = (await request.json()) as { display_name?: string };
    return HttpResponse.json({ display_name: body.display_name ?? 'Test Driver' });
  }),

  http.get(`${BASE}/driver/me/messages`, async () => {
    await delay(40);
    return HttpResponse.json([
      {
        id: 1,
        subject: 'Welcome',
        body: 'Welcome to Mauritian Rides. Complete your documents to start accepting rides.',
        read: false,
        created_at: '2026-06-22T08:00:00.000Z',
      },
    ]);
  }),

  http.post(`${BASE}/driver/me/schedule`, async () => {
    await delay(80);
    return HttpResponse.json({ saved: true });
  }),

  // WP REST — blog posts
  http.get(`${WP_BASE}/posts`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    const headers = { 'X-WP-Total': '2', 'X-WP-TotalPages': '1' };
    if (slug) {
      const match = mockPosts.filter((p) => p.slug === slug);
      return HttpResponse.json(match, { headers });
    }
    return HttpResponse.json(mockPosts, { headers });
  }),

  // WP REST — categories
  http.get(`${WP_BASE}/categories`, async () => {
    await delay(20);
    return HttpResponse.json(mockCategories);
  }),
];
