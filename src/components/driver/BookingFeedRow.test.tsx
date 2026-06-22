import { render, screen, fireEvent } from '@/test-utils/render';
import { BookingFeedRow } from './BookingFeedRow';

const baseProps = {
  id: 1,
  ref: 'MR-20260622-0001',
  pickup: 'Port Louis',
  dropoff: 'Grand Baie',
  fare: '1500.00',
  passengers: 2,
  distanceKm: 12.5,
  createdAt: '2026-06-22T08:00:00.000Z',
  onAccept: jest.fn(),
  onPass: jest.fn(),
};

describe('BookingFeedRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pickup, dropoff, and fare', () => {
    render(<BookingFeedRow {...baseProps} />);
    expect(screen.getByText('Port Louis')).toBeTruthy();
    expect(screen.getByText('Grand Baie')).toBeTruthy();
    expect(screen.getByText('Rs 1500.00')).toBeTruthy();
  });

  it('calls onAccept when Accept is pressed', () => {
    render(<BookingFeedRow {...baseProps} />);
    fireEvent.press(screen.getByTestId('feed-accept-1'));
    expect(baseProps.onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onPass when Pass is pressed', () => {
    render(<BookingFeedRow {...baseProps} />);
    fireEvent.press(screen.getByTestId('feed-pass-1'));
    expect(baseProps.onPass).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when capReached is true', () => {
    render(<BookingFeedRow {...baseProps} capReached />);
    expect(screen.queryByTestId('feed-row-1')).toBeNull();
  });

  it('shows locked overlay when locked is true', () => {
    render(<BookingFeedRow {...baseProps} locked />);
    expect(screen.getByTestId('feed-row-locked')).toBeTruthy();
  });
});
