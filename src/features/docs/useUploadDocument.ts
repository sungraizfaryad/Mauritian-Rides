import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadDocument } from '@/lib/docs/uploadDocument';
import { track } from '@/lib/observability/analytics';
import { Sentry } from '@/lib/observability/sentry';
import type { ImagePickerAsset } from 'expo-image-picker';

interface UploadInput { slug: string; asset: ImagePickerAsset }

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, asset }: UploadInput) => uploadDocument(slug, asset),
    onSuccess: (_data, vars) => {
      track('driver_doc_uploaded', { slug: vars.slug });
      void qc.invalidateQueries({ queryKey: ['me', 'docs'] });
    },
    onError: (err) => { Sentry.captureException(err); },
  });
}
