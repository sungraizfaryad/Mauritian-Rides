jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockMutateAsync = jest.fn(async () => ({
  slug: 'nid',
  status: 'pending',
  uploaded_at: '2026-06-22T09:00:00Z',
}));
jest.mock('@/features/docs/useUploadDocument', () => ({
  useUploadDocument: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

import { render, screen, waitFor } from '@/test-utils/render';
import DocsScreen from './docs';

describe('DocsScreen', () => {
  beforeEach(() => {
    mockMutateAsync.mockClear();
  });

  it('renders the three document rows after loading', async () => {
    render(<DocsScreen />);
    await waitFor(() => expect(screen.getByTestId('upload-nid')).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByTestId('upload-licence')).toBeTruthy();
    expect(screen.getByTestId('upload-psv')).toBeTruthy();
  });

  it('renders the photo upload slot', async () => {
    render(<DocsScreen />);
    await waitFor(() => expect(screen.getByTestId('upload-photo')).toBeTruthy(), { timeout: 3000 });
  });
});
