import { api } from '@/lib/api/client';
import type { ImagePickerAsset } from 'expo-image-picker';

interface UploadResult { slug: string; status: string; uploaded_at: string }

export async function uploadDocument(slug: string, asset: ImagePickerAsset): Promise<UploadResult> {
  // Fall back to image/jpeg — some Android OEM camera apps strip the mime type.
  const mime = asset.mimeType ?? 'image/jpeg';
  const name = asset.fileName ?? `doc-${slug}-${Date.now()}.jpg`;

  const form = new FormData();
  // RN's XHR layer recognises { uri, type, name } as a native file attachment.
  // The cast is needed because lib.dom FormData types expect a Blob.
  form.append('file', { uri: asset.uri, type: mime, name } as unknown as Blob);

  const { data } = await api.post<UploadResult>(
    `/drivers/documents/${slug}`,
    form,
    // Setting Content-Type to undefined lets RN's fetch layer write the correct
    // multipart boundary — hardcoding 'multipart/form-data' breaks it.
    { headers: { 'Content-Type': undefined } },
  );
  return data;
}
