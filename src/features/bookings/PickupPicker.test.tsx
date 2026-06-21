jest.mock('@/lib/maps/RideMap');
import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import { PickupPicker } from './PickupPicker';

describe('PickupPicker', () => {
  it('confirms the pickup chosen by tapping the map', async () => {
    const onConfirm = jest.fn();
    render(<PickupPicker onConfirm={onConfirm} onCancel={jest.fn()} />);
    fireEvent.press(screen.getByTestId('ride-map-press')); // mock fires { -20.16, 57.5 }
    fireEvent.press(screen.getByTestId('pickup-confirm'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ latitude: -20.16, longitude: 57.5 });
  });

  it('uses device location when the button is pressed', async () => {
    const onConfirm = jest.fn();
    render(<PickupPicker onConfirm={onConfirm} onCancel={jest.fn()} />);
    fireEvent.press(screen.getByTestId('pickup-use-location'));
    await waitFor(() => expect(screen.getByTestId('pickup-confirm')).toBeTruthy());
    fireEvent.press(screen.getByTestId('pickup-confirm'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm.mock.calls[0][0].label).toBe('Port Louis'); // from mocked reverseGeocode
  });
});
