import * as Location from 'expo-location';
import { getCurrentPickup } from './currentPosition';

describe('getCurrentPickup', () => {
  it('returns a pickup with a label when permission granted', async () => {
    const result = await getCurrentPickup();
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.pickup.latitude).toBeCloseTo(-20.1609);
      expect(result.pickup.label.length).toBeGreaterThan(0);
    }
  });

  it('returns denied when permission refused', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    const result = await getCurrentPickup();
    expect(result.status).toBe('denied');
  });
});
