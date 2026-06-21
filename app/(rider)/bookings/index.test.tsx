const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import Trips from './index';

describe('Trips history', () => {
  beforeEach(() => mockPush.mockClear());

  it('lists mocked bookings and opens the tracker on tap', async () => {
    render(<Trips />);
    await waitFor(() => expect(screen.getByText('MR-20260620-0042')).toBeTruthy());
    fireEvent.press(screen.getByTestId('trip-MR-20260620-0042'));
    expect(String(mockPush.mock.calls[0][0])).toContain('/(rider)/bookings/MR-20260620-0042');
  });
});
