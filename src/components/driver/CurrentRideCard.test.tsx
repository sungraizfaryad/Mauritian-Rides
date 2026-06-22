import { Alert, Linking } from 'react-native';
const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
import { render, screen, fireEvent } from '@/test-utils/render';
import { CurrentRideCard, type CurrentRide } from './CurrentRideCard';

const mockRide: CurrentRide = {
  id: 101,
  ref: 'MR-20260622-0101',
  pickup: 'Port Louis',
  dropoff: 'Grand Baie',
  fare: '1500.00',
  passengers: 2,
  rider_name: 'Test Rider',
  rider_phone: '+23057123456',
};

const baseProps = {
  ride: mockRide,
  onNavigate: jest.fn(),
  onEndRide: jest.fn(),
  onRelease: jest.fn(),
};

describe('CurrentRideCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  it('shows rider name and phone', () => {
    render(<CurrentRideCard {...baseProps} />);
    expect(screen.getByText('Test Rider')).toBeTruthy();
    expect(screen.getByText('+23057123456')).toBeTruthy();
  });

  it('shows pickup and dropoff', () => {
    render(<CurrentRideCard {...baseProps} />);
    expect(screen.getByText('Port Louis')).toBeTruthy();
    expect(screen.getByText('Grand Baie')).toBeTruthy();
  });

  it('calls onNavigate when Navigate is pressed', () => {
    render(<CurrentRideCard {...baseProps} />);
    fireEvent.press(screen.getByTestId('current-ride-navigate'));
    expect(baseProps.onNavigate).toHaveBeenCalledTimes(1);
  });

  it('shows Alert before calling onEndRide', () => {
    render(<CurrentRideCard {...baseProps} />);
    fireEvent.press(screen.getByTestId('current-ride-end'));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('shows Alert before calling onRelease', () => {
    render(<CurrentRideCard {...baseProps} />);
    fireEvent.press(screen.getByTestId('current-ride-release'));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('opens tel: link when Call is pressed', () => {
    render(<CurrentRideCard {...baseProps} />);
    fireEvent.press(screen.getByTestId('current-ride-call'));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:+23057123456');
  });

  it('opens wa.me link when WhatsApp is pressed', () => {
    render(<CurrentRideCard {...baseProps} />);
    fireEvent.press(screen.getByTestId('current-ride-whatsapp'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://wa.me/23057123456');
  });
});
