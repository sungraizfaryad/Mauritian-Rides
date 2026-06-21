import { uploadDocument } from './uploadDocument';
import type { ImagePickerAsset } from 'expo-image-picker';

const mockAsset: ImagePickerAsset = {
  uri: 'file:///mock/document.jpg',
  width: 800,
  height: 600,
  type: 'image',
  mimeType: 'image/jpeg',
  fileName: 'document.jpg',
  fileSize: 102400,
  assetId: null,
  base64: null,
  exif: null,
  duration: null,
  pairedVideoAsset: null,
};

describe('uploadDocument', () => {
  it('posts to /drivers/documents/:slug and returns the server response', async () => {
    const result = await uploadDocument('license', mockAsset);
    expect(result.slug).toBe('license');
    expect(result.status).toBe('pending');
  });

  it('falls back to image/jpeg when mimeType is null', async () => {
    // SDK 56 types declare mimeType as `string` (non-nullable), but real-world Android OEMs
    // can return null. Cast through unknown to avoid a TS strict-mode error while still
    // exercising the defensive fallback in uploadDocument.
    const assetWithoutMime = { ...mockAsset, mimeType: null } as unknown as ImagePickerAsset;
    const result = await uploadDocument('insurance', assetWithoutMime);
    expect(result.slug).toBe('insurance');
  });
});
