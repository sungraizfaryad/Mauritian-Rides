jest.mock('@/lib/maps/RideMap');
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ ref: 'MR-20260620-0042' }) }));

import { render, screen, waitFor } from '@/test-utils/render';
import Tracker from './[ref]';

describe('Tracker', () => {
  it('renders the pickup marker and a status banner from the mocked booking', async () => {
    render(<Tracker />);
    await waitFor(() => expect(screen.getByTestId('marker-pickup')).toBeTruthy());
    expect(screen.getByTestId('tracker-status')).toBeTruthy();
  });
});
