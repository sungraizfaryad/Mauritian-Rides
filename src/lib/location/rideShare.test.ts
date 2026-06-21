// src/lib/location/rideShare.test.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { startSharing, stopSharing, isSharing, RIDE_SHARE_TASK } from './rideShare';

describe('rideShare helper', () => {
  beforeEach(() => {
    (Location.startLocationUpdatesAsync as jest.Mock).mockClear();
    (Location.stopLocationUpdatesAsync as jest.Mock).mockClear();
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    // Background permission mock is defined in jest.setup-globals.ts; reset here so
    // each test starts from a clean granted state.
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  });

  it('exports RIDE_SHARE_TASK as a non-empty string', () => {
    expect(typeof RIDE_SHARE_TASK).toBe('string');
    expect(RIDE_SHARE_TASK.length).toBeGreaterThan(0);
  });

  it('calls defineTask at module load', () => {
    expect(TaskManager.defineTask).toHaveBeenCalledWith(RIDE_SHARE_TASK, expect.any(Function));
  });

  it('startSharing returns ok and calls startLocationUpdatesAsync when permission is granted', async () => {
    const result = await startSharing(42);
    expect(result.status).toBe('ok');
    expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
      RIDE_SHARE_TASK,
      expect.objectContaining({ accuracy: 6, distanceInterval: 20 }),
    );
  });

  it('startSharing returns denied when foreground permission is refused', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    const result = await startSharing(42);
    expect(result.status).toBe('denied');
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('startSharing is a no-op and returns ok if already sharing', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValueOnce(true);
    await startSharing(42);
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('stopSharing calls stopLocationUpdatesAsync with the task name', async () => {
    await stopSharing();
    expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(RIDE_SHARE_TASK);
  });

  it('isSharing delegates to hasStartedLocationUpdatesAsync', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValueOnce(true);
    expect(await isSharing()).toBe(true);
  });
});
