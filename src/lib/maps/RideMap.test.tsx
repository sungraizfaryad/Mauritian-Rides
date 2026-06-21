jest.mock('./RideMap');
import { render, screen, fireEvent } from '@/test-utils/render';
import { RideMap } from './RideMap';

describe('RideMap (mock contract)', () => {
  it('renders a testID per marker and fires onPress with coordinates', () => {
    const onPress = jest.fn();
    render(
      <RideMap
        camera={{ latitude: -20.16, longitude: 57.5 }}
        markers={[{ id: 'pickup', latitude: -20.16, longitude: 57.5, title: 'Pickup' }]}
        onPress={onPress}
        testID="map"
      />,
    );
    expect(screen.getByTestId('marker-pickup')).toBeTruthy();
    fireEvent.press(screen.getByTestId('ride-map-press'));
    expect(onPress).toHaveBeenCalledWith({ latitude: -20.16, longitude: 57.5 });
  });
});
