import { locationQueue } from './locationQueue';

const item = { rideId: 42, lat: -20.16, lng: 57.5, heading: 90, accuracy: 5, ts: 1000 };

describe('locationQueue', () => {
  beforeEach(() => locationQueue.clear());

  it('enqueues an item and reports size', () => {
    locationQueue.enqueue(item);
    expect(locationQueue.size()).toBe(1);
  });

  it('flush returns all items and empties the queue', () => {
    locationQueue.enqueue(item);
    locationQueue.enqueue({ ...item, ts: 2000 });
    const flushed = locationQueue.flush();
    expect(flushed).toHaveLength(2);
    expect(flushed[0]?.ts).toBe(1000);
    expect(locationQueue.size()).toBe(0);
  });

  it('clear empties the queue', () => {
    locationQueue.enqueue(item);
    locationQueue.clear();
    expect(locationQueue.size()).toBe(0);
  });

  it('flush on an empty queue returns an empty array', () => {
    expect(locationQueue.flush()).toHaveLength(0);
  });
});
