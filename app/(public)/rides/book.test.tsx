jest.mock('@/lib/maps/RideMap');
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { useBookingDraftStore } from '@/lib/stores/bookingDraft';
import GuestBook from './book';

describe('Guest booking', () => {
  beforeEach(() => {
    mockPush.mockClear();
    useBookingDraftStore.getState().clear();
  });

  it('persists the draft and routes to register with a next param', async () => {
    render(<GuestBook />);
    fireEvent.press(screen.getByTestId('booking-open-picker'));
    fireEvent.press(screen.getByTestId('ride-map-press'));
    fireEvent.press(screen.getByTestId('pickup-confirm'));
    fireEvent.changeText(screen.getByTestId('booking-dropoff'), 'Grand Baie');
    fireEvent.press(screen.getByTestId('booking-confirm'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(String(mockPush.mock.calls[0][0])).toContain('/(auth)/register');
    expect(useBookingDraftStore.getState().dropoff).toBe('Grand Baie');
  });
});
