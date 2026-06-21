import { mockAcceptScenario, mockCapState, mockDocUploadFail } from '@/mocks/handlers';

const BASE = 'https://mauritianrides.com/wp-json/mr/v1';

describe('driver MSW handlers', () => {
  afterEach(() => {
    mockAcceptScenario.mode = '200';
    mockCapState.reached = false;
    mockDocUploadFail.fail = false;
  });

  it('GET /rides/feed returns an array of open rides', async () => {
    const res = await fetch(`${BASE}/rides/feed`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { id: number; status: string }[];
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]?.status).toBe('open');
  });

  it('GET /bookings/by-id/:id returns a booking shape', async () => {
    const res = await fetch(`${BASE}/bookings/by-id/101`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { id: number; status: string };
    expect(body.id).toBe(101);
    expect(body.status).toBe('open');
  });

  it('POST /bookings/:id/accept returns 200 on success', async () => {
    const res = await fetch(`${BASE}/bookings/101/accept`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('accepted');
  });

  it('POST /bookings/:id/accept returns 402 when cap reached', async () => {
    mockAcceptScenario.mode = '402';
    const res = await fetch(`${BASE}/bookings/101/accept`, { method: 'POST' });
    expect(res.status).toBe(402);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('cap_reached');
  });

  it('POST /bookings/:id/accept returns 409 on race lost', async () => {
    mockAcceptScenario.mode = '409';
    const res = await fetch(`${BASE}/bookings/101/accept`, { method: 'POST' });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('race_lost');
  });

  it('POST /bookings/:id/cancel returns 200', async () => {
    const res = await fetch(`${BASE}/bookings/101/cancel`, { method: 'POST' });
    expect(res.status).toBe(200);
  });

  it('POST /rides/:id/location returns 204', async () => {
    const res = await fetch(`${BASE}/rides/42/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: -20.16, lng: 57.5, heading: 90, accuracy: 5 }),
    });
    expect(res.status).toBe(204);
  });

  it('GET /me/cap returns plan info with reached:false by default', async () => {
    const res = await fetch(`${BASE}/me/cap`);
    const body = (await res.json()) as { plan: string; used: number; limit: number; reached: boolean };
    expect(body.plan).toBe('free');
    expect(typeof body.used).toBe('number');
    expect(body.reached).toBe(false);
  });

  it('GET /me/cap returns reached:true when mockCapState.reached is set', async () => {
    mockCapState.reached = true;
    const res = await fetch(`${BASE}/me/cap`);
    const body = (await res.json()) as { reached: boolean };
    expect(body.reached).toBe(true);
  });

  it('GET /me/upgrade-url returns a url containing the plan', async () => {
    const res = await fetch(`${BASE}/me/upgrade-url?plan=silver`);
    const body = (await res.json()) as { url: string };
    expect(body.url).toContain('silver');
  });

  it('POST /drivers/documents/:slug returns 201', async () => {
    const res = await fetch(`${BASE}/drivers/documents/license`, { method: 'POST' });
    expect(res.status).toBe(201);
  });

  it('POST /drivers/documents/:slug returns 415 when mockDocUploadFail.fail is set', async () => {
    mockDocUploadFail.fail = true;
    const res = await fetch(`${BASE}/drivers/documents/license`, { method: 'POST' });
    expect(res.status).toBe(415);
  });
});
