import { createBookingSchema } from './booking';

describe('createBookingSchema', () => {
  const ok = {
    pickup: { latitude: -20.16, longitude: 57.5, label: 'Port Louis' },
    dropoff: 'Grand Baie',
    passengers: 2,
  };

  it('accepts a valid booking', () => {
    expect(createBookingSchema.safeParse(ok).success).toBe(true);
  });
  it('rejects an empty dropoff', () => {
    expect(createBookingSchema.safeParse({ ...ok, dropoff: '' }).success).toBe(false);
  });
  it('rejects passengers below 1 or above 8', () => {
    expect(createBookingSchema.safeParse({ ...ok, passengers: 0 }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...ok, passengers: 9 }).success).toBe(false);
  });
  it('requires a pickup with coordinates', () => {
    expect(createBookingSchema.safeParse({ ...ok, pickup: undefined }).success).toBe(false);
  });
});
