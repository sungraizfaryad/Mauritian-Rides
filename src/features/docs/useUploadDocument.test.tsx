const mockTrack = jest.fn();
jest.mock('@/lib/observability/analytics', () => ({
  track: (...a: unknown[]) => mockTrack(...a),
  identifyUser: jest.fn(),
  setGuestPersona: jest.fn(),
  resetIdentity: jest.fn(),
  grantConsent: jest.fn(),
  revokeConsent: jest.fn(),
}));
const mockCaptureException = jest.fn();
jest.mock('@/lib/observability/sentry', () => ({
  Sentry: { captureException: (...a: unknown[]) => mockCaptureException(...a), init: jest.fn(), captureMessage: jest.fn() },
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useUploadDocument } from './useUploadDocument';
import type { ImagePickerAsset } from 'expo-image-picker';
import { mockDocUploadFail } from '@/mocks/handlers';

const mockAsset: ImagePickerAsset = {
  uri: 'file:///mock/doc.jpg',
  width: 800,
  height: 600,
  type: 'image',
  mimeType: 'image/jpeg',
  fileName: 'doc.jpg',
  fileSize: 102400,
  assetId: null,
  base64: null,
  exif: null,
  duration: null,
  pairedVideoAsset: null,
};

function wrap({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useUploadDocument', () => {
  afterEach(() => {
    mockTrack.mockClear();
    mockDocUploadFail.fail = false;
  });

  it('fires driver_doc_uploaded on success', async () => {
    const { result } = renderHook(() => useUploadDocument(), { wrapper: wrap });
    act(() => { result.current.mutate({ slug: 'license', asset: mockAsset }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockTrack).toHaveBeenCalledWith('driver_doc_uploaded', { slug: 'license' });
  });

  it('does not fire event on failure', async () => {
    mockDocUploadFail.fail = true;
    const { result } = renderHook(() => useUploadDocument(), { wrapper: wrap });
    act(() => { result.current.mutate({ slug: 'license', asset: mockAsset }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
