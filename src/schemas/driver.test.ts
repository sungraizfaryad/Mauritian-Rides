import { locationUpdateSchema, documentUploadSchema } from './driver';

describe('locationUpdateSchema', () => {
  const ok = { latitude: -20.16, longitude: 57.5, heading: 45, accuracy: 8 };
  it('accepts a valid location update', () => {
    expect(locationUpdateSchema.safeParse(ok).success).toBe(true);
  });
  it('rejects missing latitude', () => {
    expect(locationUpdateSchema.safeParse({ ...ok, latitude: undefined }).success).toBe(false);
  });
  it('rejects non-numeric heading', () => {
    expect(locationUpdateSchema.safeParse({ ...ok, heading: 'north' }).success).toBe(false);
  });
});

describe('documentUploadSchema', () => {
  it('accepts a valid slug', () => {
    expect(documentUploadSchema.safeParse({ slug: 'license' }).success).toBe(true);
  });
  it('rejects an empty slug', () => {
    expect(documentUploadSchema.safeParse({ slug: '' }).success).toBe(false);
  });
});
