import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadDocument } from '@/lib/docs/uploadDocument';
import type { ImagePickerAsset } from 'expo-image-picker';

interface UploadInput { slug: string; asset: ImagePickerAsset }

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, asset }: UploadInput) => uploadDocument(slug, asset),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me', 'docs'] });
    },
  });
}
