import { safeNextRoute } from './safeNext';

describe('safeNextRoute', () => {
  it('keeps a same-app absolute path', () => {
    expect(safeNextRoute('/(rider)/bookings/MR-1')).toBe('/(rider)/bookings/MR-1');
  });

  it('falls back for protocol-relative, scheme, or backslash targets', () => {
    expect(safeNextRoute('//evil.com')).toBe('/(rider)');
    expect(safeNextRoute('/\\evil.com')).toBe('/(rider)');
    expect(safeNextRoute('https://evil.com')).toBe('/(rider)');
    expect(safeNextRoute('mr://evil')).toBe('/(rider)');
  });

  it('falls back for non-string or relative input', () => {
    expect(safeNextRoute(undefined)).toBe('/(rider)');
    expect(safeNextRoute('bookings')).toBe('/(rider)');
  });

  it('honors a custom fallback', () => {
    expect(safeNextRoute(undefined, '/(driver)/feed')).toBe('/(driver)/feed');
  });
});
