import { useBookingDraftStore } from './bookingDraft';

describe('useBookingDraftStore', () => {
  beforeEach(() => useBookingDraftStore.getState().clear());

  it('stores partial draft fields and clears them', () => {
    useBookingDraftStore.getState().setDropoff('Grand Baie');
    useBookingDraftStore.getState().setPassengers(3);
    expect(useBookingDraftStore.getState().dropoff).toBe('Grand Baie');
    expect(useBookingDraftStore.getState().passengers).toBe(3);
    useBookingDraftStore.getState().clear();
    expect(useBookingDraftStore.getState().dropoff).toBe('');
    expect(useBookingDraftStore.getState().passengers).toBe(1);
  });
});
