// src/lib/location/rideShare.test.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { api } from '@/lib/api/client';
import { locationQueue } from '@/lib/stores/locationQueue';
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

  it('startSharing returns denied when Android background permission is refused', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });

    const result = await startSharing(42);
    expect(result.status).toBe('denied');
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();

    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  it('startSharing is a no-op and returns ok if already sharing', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValueOnce(true);
    const result = await startSharing(42);
    expect(result).toEqual({ status: 'ok' });
    expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('stopSharing calls stopLocationUpdatesAsync when the task is running', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValueOnce(true);
    await stopSharing();
    expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(RIDE_SHARE_TASK);
  });

  it('stopSharing does NOT call stopLocationUpdatesAsync when task was never started', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValueOnce(false);
    await stopSharing();
    expect(Location.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('isSharing delegates to hasStartedLocationUpdatesAsync', async () => {
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValueOnce(true);
    expect(await isSharing()).toBe(true);
  });

  it('enqueues the location payload when the POST fails', async () => {
    const enqueueSpy = jest.spyOn(locationQueue, 'enqueue');
    jest.spyOn(api, 'post').mockRejectedValueOnce(new Error('network'));

    // Grab the task callback registered with TaskManager.defineTask
    const defineTaskMock = TaskManager.defineTask as jest.Mock;
    const taskBody = defineTaskMock.mock.calls.find(
      ([name]: [string]) => name === RIDE_SHARE_TASK,
    )?.[1] as ((body: { data: { locations: Location.LocationObject[] }; error: null }) => Promise<void>) | undefined;

    expect(taskBody).toBeDefined();

    // Start sharing so activeRideId is non-zero
    await startSharing(99);

    await taskBody!({
      data: {
        locations: [
          {
            coords: {
              latitude: -20.16,
              longitude: 57.5,
              heading: 90,
              accuracy: 5,
              altitude: null,
              altitudeAccuracy: null,
              speed: null,
            },
            timestamp: Date.now(),
            mocked: false,
          },
        ],
      },
      error: null,
    });

    // Let the fire-and-forget POST rejection settle
    await Promise.resolve();

    expect(enqueueSpy).toHaveBeenCalledWith(
      expect.objectContaining({ rideId: 99, lat: -20.16, lng: 57.5 }),
    );

    enqueueSpy.mockRestore();
    (api.post as jest.Mock).mockRestore?.();
  });
});
