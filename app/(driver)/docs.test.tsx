const mockAsset = {
  uri: 'file:///mock/document.jpg',
  type: 'image' as const,
  mimeType: 'image/jpeg',
  fileName: 'document.jpg',
  fileSize: 102400,
  width: 800,
  height: 600,
  assetId: null,
  base64: null,
  exif: null,
  duration: null,
  pairedVideoAsset: null,
};
const mockPickDocument = jest.fn<Promise<typeof mockAsset | null>, [string]>(
  async () => mockAsset,
);
jest.mock('@/lib/docs/pickDocument', () => ({
  pickDocument: (a: string) => mockPickDocument(a),
}));

const mockMutateAsync = jest.fn(async () => ({
  slug: 'license',
  status: 'pending',
  uploaded_at: '2026-06-22T09:00:00Z',
}));
jest.mock('@/features/docs/useUploadDocument', () => ({
  useUploadDocument: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

import { render, screen, fireEvent, waitFor } from '@/test-utils/render';
import DocUpload from './docs';

describe('DocUpload', () => {
  beforeEach(() => {
    mockPickDocument.mockClear();
    mockMutateAsync.mockClear();
  });

  it('renders upload buttons for each document slot', () => {
    render(<DocUpload />);
    expect(screen.getByTestId('upload-license')).toBeTruthy();
    expect(screen.getByTestId('upload-insurance')).toBeTruthy();
    expect(screen.getByTestId('upload-vehicle_registration')).toBeTruthy();
  });

  it('calls pickDocument then mutateAsync and shows pending status', async () => {
    render(<DocUpload />);
    fireEvent.press(screen.getByTestId('upload-license'));
    await waitFor(() => expect(mockPickDocument).toHaveBeenCalledWith('library'));
    await waitFor(() => expect(screen.getByTestId('status-license')).toBeTruthy());
  });

  it('does not call mutateAsync when picker returns null (user cancelled)', async () => {
    mockPickDocument.mockResolvedValueOnce(null);
    render(<DocUpload />);
    fireEvent.press(screen.getByTestId('upload-license'));
    await waitFor(() => expect(mockPickDocument).toHaveBeenCalled());
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('shows error status when upload fails', async () => {
    mockMutateAsync.mockRejectedValueOnce({ status: 500, code: 'server_error', message: 'Upload failed. Try again.' });
    render(<DocUpload />);
    fireEvent.press(screen.getByTestId('upload-insurance'));
    await waitFor(() => expect(screen.getByTestId('status-insurance')).toBeTruthy());
    expect(screen.getByTestId('status-insurance').props.children).toBeTruthy();
  });
});
