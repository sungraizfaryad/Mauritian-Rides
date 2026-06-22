import { haversine, estimateFare } from './estimate';
import { LOCATIONS, type Location } from '@/constants/locations';

// Array access returns T | undefined in strict mode — assert presence.
const SSR       = LOCATIONS[0] as Location;
const GRAND_BAIE = LOCATIONS[2] as Location;
const LE_MORNE   = LOCATIONS[4] as Location;

describe('haversine', () => {
  it('returns 0 for identical points', () => {
    expect(haversine(SSR, SSR)).toBe(0);
  });

  it('SSR → Grand Baie is roughly 50 km straight-line', () => {
    const d = haversine(SSR, GRAND_BAIE);
    expect(d).toBeGreaterThan(40);
    expect(d).toBeLessThan(60);
  });

  it('SSR → Le Morne is roughly 35 km straight-line', () => {
    const d = haversine(SSR, LE_MORNE);
    expect(d).toBeGreaterThan(25);
    expect(d).toBeLessThan(50);
  });

  it('is symmetric', () => {
    const ab = haversine(SSR, GRAND_BAIE);
    const ba = haversine(GRAND_BAIE, SSR);
    expect(Math.abs(ab - ba)).toBeLessThan(0.001);
  });
});

describe('estimateFare', () => {
  it('minimum km is 1 for zero distance', () => {
    const result = estimateFare(SSR, SSR);
    expect(result.km).toBe(1);
  });

  it('returns correct fare for known route', () => {
    // SSR→Grand Baie: ~50km straight, *1.35 ≈ 68km road → 150 + 28*68 = 2054
    const result = estimateFare(SSR, GRAND_BAIE, 'sedan');
    expect(result.fare).toBeGreaterThan(1000);
    expect(result.margin).toBe(result.km * 3);
  });

  it('van multiplier (1.3x) yields higher fare than sedan', () => {
    const sedan = estimateFare(SSR, GRAND_BAIE, 'sedan');
    const van   = estimateFare(SSR, GRAND_BAIE, 'van');
    expect(van.fare).toBeGreaterThan(sedan.fare);
  });

  it('minibus multiplier (1.6x) is higher than van', () => {
    const van     = estimateFare(SSR, GRAND_BAIE, 'van');
    const minibus = estimateFare(SSR, GRAND_BAIE, 'minibus');
    expect(minibus.fare).toBeGreaterThan(van.fare);
  });

  it('margin equals km * 3', () => {
    const result = estimateFare(SSR, LE_MORNE, 'sedan');
    expect(result.margin).toBe(result.km * 3);
  });

  it('fare formula: 150 + 28 * km for sedan', () => {
    const result = estimateFare(SSR, GRAND_BAIE, 'sedan');
    expect(result.fare).toBe(150 + 28 * result.km);
  });
});
