import { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { pickDocument } from '@/lib/docs/pickDocument';
import { useUploadDocument } from '@/features/docs/useUploadDocument';
import type { ApiError } from '@/lib/api/client';

const SLOTS = [
  { slug: 'license', labelKey: 'driver.docs_license' },
  { slug: 'insurance', labelKey: 'driver.docs_insurance' },
  { slug: 'vehicle_registration', labelKey: 'driver.docs_registration' },
] as const;

type SlugKey = (typeof SLOTS)[number]['slug'];
interface SlotStatus { status: string; error?: string }

export default function DocUpload() {
  const { t } = useTranslation();
  const upload = useUploadDocument();
  const [statuses, setStatuses] = useState<Partial<Record<SlugKey, SlotStatus>>>({});
  const [uploading, setUploading] = useState<Partial<Record<SlugKey, boolean>>>({});

  async function onUpload(slug: SlugKey) {
    const asset = await pickDocument('library');
    if (!asset) return;

    setUploading((u) => ({ ...u, [slug]: true }));
    try {
      const result = await upload.mutateAsync({ slug, asset });
      setStatuses((s) => ({ ...s, [slug]: { status: result.status } }));
    } catch (e) {
      setStatuses((s) => ({
        ...s,
        [slug]: {
          status: 'error',
          error: (e as ApiError).message || t('driver.docs_upload_failed'),
        },
      }));
    } finally {
      setUploading((u) => ({ ...u, [slug]: false }));
    }
  }

  return (
    <Screen scroll testID="docs-screen">
      <Text className="mb-6 text-3xl font-bold text-lagoon-400">{t('driver.docs_title')}</Text>

      <View className="gap-5">
        {SLOTS.map(({ slug, labelKey }) => {
          const st = statuses[slug];
          const busy = uploading[slug] ?? false;
          return (
            <View key={slug} className="rounded-md border border-basalt-700 bg-basalt-800 p-4">
              <Text className="mb-2 font-semibold text-white">{t(labelKey)}</Text>
              {st ? (
                <Text
                  testID={`status-${slug}`}
                  className={st.status === 'error' ? 'text-danger' : 'text-lagoon-400'}
                >
                  {st.status === 'error'
                    ? (st.error ?? t('driver.docs_upload_failed'))
                    : t(`driver.docs_status_${st.status}`)}
                </Text>
              ) : null}
              <Button
                testID={`upload-${slug}`}
                variant="secondary"
                label={busy ? t('driver.docs_uploading') : t('driver.docs_upload_cta')}
                loading={busy}
                disabled={busy}
                onPress={() => { void onUpload(slug); }}
              />
            </View>
          );
        })}
      </View>
    </Screen>
  );
}
