const BASE = 'https://mauritianrides.com/wp-json/mr/v1';

describe('rider MSW handlers', () => {
  it('POST /bookings returns a created booking with an MR- ref', async () => {
    const res = await fetch(`${BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickup: { name: 'Port Louis Waterfront', lat: -20.16, lng: 57.5012 },
        dropoff: { name: 'Grand Baie', lat: -20.0135, lng: 57.5803 },
        rider_name: 'Test Rider',
        rider_phone: '+23057001234',
        rider_email: '',
        vehicle: 'sedan',
        vehicle_preference: 'Any sedan (1–3 passengers)',
        distance_km: 20,
        duration_min: 24,
        fare_mur: 710,
        notes: '',
        mr_hp_field: '',
        mr_form_ts: Math.floor(Date.now() / 1000),
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ref).toMatch(/^MR-\d{8}-\d{4}$/);
    expect(body.status).toBe('open');
    expect(body.dropoff).toBe('Grand Baie');
  });

  it('GET /me/bookings returns an array', async () => {
    const res = await fetch(`${BASE}/me/bookings`);
    expect(res.ok).toBe(true);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('GET /rides/:id/location returns coordinates', async () => {
    const res = await fetch(`${BASE}/rides/42/location`);
    const body = await res.json();
    expect(typeof body.latitude).toBe('number');
    expect(typeof body.longitude).toBe('number');
  });

  it('POST /me/device-token returns 204', async () => {
    const res = await fetch(`${BASE}/me/device-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'ExponentPushToken[x]', platform: 'ios' }),
    });
    expect(res.status).toBe(204);
  });
});
