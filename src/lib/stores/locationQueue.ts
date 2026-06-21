import { MMKV } from 'react-native-mmkv';

export interface QueuedLocation {
  rideId: number;
  lat: number;
  lng: number;
  heading: number;
  accuracy: number;
  ts: number;
}

const storage = new MMKV({ id: 'location-queue' });
const KEY = 'ride_share_queue';

function read(): QueuedLocation[] {
  try {
    const raw = storage.getString(KEY);
    return raw ? (JSON.parse(raw) as QueuedLocation[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedLocation[]) {
  storage.set(KEY, JSON.stringify(items));
}

export const locationQueue = {
  enqueue(item: QueuedLocation) {
    write([...read(), item]);
  },
  flush(): QueuedLocation[] {
    const items = read();
    storage.delete(KEY);
    return items;
  },
  clear() {
    storage.delete(KEY);
  },
  size(): number {
    return read().length;
  },
};
