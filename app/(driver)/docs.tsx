import { useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/Screen';
import { DocRow } from '@/components/driver/DocRow';
import { useDriverDocuments } from '@/features/driver/useDriverDocuments';
import { useSubmitForReview } from '@/features/driver/useSubmitForReview';
import { useUploadDocument } from '@/features/docs/useUploadDocument';
import type { ApiError } from '@/lib/api/client';

const DOC_SLUGS = [
  { slug: 'nid',     labelKey: 'driver.docs_nid'     },
  { slug: 'licence', labelKey: 'driver.docs_licence'  },
  { slug: 'psv',     labelKey: 'driver.docs_psv'      },
] as const;

type DocSlug = 'nid' | 'licence' | 'psv' | 'photo';

export default function DocsScreen() {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useDriverDocuments();
  const submitForReview = useSubmitForReview();
  const upload = useUploadDocument();
  const [uploading, setUploading] = useState<Partial<Record<DocSlug, boolean>>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload(slug: DocSlug) {
    setUploadError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading((u) => ({ ...u, [slug]: true }));
    try {
      await upload.mutateAsync({ slug, asset });
      void refetch();
    } catch (e) {
      setUploadError((e as ApiError).message || t('driver.docs_upload_failed'));
    } finally {
      setUploading((u) => ({ ...u, [slug]: false }));
    }
  }

  async function handleSubmit() {
    await submitForReview.mutateAsync();
  }

  if (isLoading) {
    return (
      <Screen dark testID="docs-screen" contentClassName="items-center justify-center">
        <ActivityIndicator color="#2cd4c4" />
      </Screen>
    );
  }

  const locked = data?.under_review || data?.driver_status === 'approved';

  return (
    <Screen dark scroll testID="docs-screen">
      <Text className="mb-1 text-2xl font-bold text-white">
        {t('driver.docs_title')}{' '}
        <Text className="italic text-ink-400">{t('driver.docs_title_em')}</Text>
      </Text>
      <Text className="mb-5 text-sm text-ink-400">{t('driver.docs_subtitle')}</Text>

      {locked && (
        <View
          testID="docs-locked-banner"
          className="mb-4 rounded-xl border border-amber-600/40 bg-amber-500/10 px-4 py-3"
        >
          <Text className="text-sm text-amber-400">{t('driver.docs_under_review')}</Text>
        </View>
      )}

      {/* Photo slot */}
      <View className="mb-6 items-center">
        <Pressable
          testID="upload-photo"
          onPress={() => { void handleUpload('photo'); }}
          disabled={locked || uploading.photo}
          className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-basalt-600 bg-basalt-800 active:opacity-70"
        >
          {data?.photo?.url ? (
            <Image source={{ uri: data.photo.url }} style={{ width: 80, height: 80 }} />
          ) : (
            <Text className="text-3xl">👤</Text>
          )}
        </Pressable>
        <Text className="mt-2 text-xs text-ink-400">{t('driver.docs_photo')}</Text>
      </View>

      {DOC_SLUGS.map(({ slug, labelKey }) => {
        const doc = data?.documents.find((d) => d.slug === slug) ?? {
          slug,
          status: 'missing' as const,
        };
        return (
          <DocRow
            key={slug}
            doc={doc}
            label={t(labelKey)}
            onUpload={() => { void handleUpload(slug); }}
            uploading={uploading[slug] ?? false}
            locked={locked}
          />
        );
      })}

      {uploadError && (
        <Text className="mt-3 text-xs text-coral-400">{uploadError}</Text>
      )}

      {data?.can_submit && !data.under_review && (
        <View testID="submit-review-section" className="mt-5 border-t border-basalt-700 pt-5">
          <Text className="mb-3 text-sm text-ink-400">{t('driver.docs_submit_hint')}</Text>
          <Pressable
            testID="submit-review-btn"
            onPress={() => { void handleSubmit(); }}
            disabled={submitForReview.isPending}
            className="items-center rounded-full bg-lagoon-500 py-3 active:opacity-80"
          >
            {submitForReview.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm font-semibold text-white">{t('driver.docs_submit_review')}</Text>
            )}
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
