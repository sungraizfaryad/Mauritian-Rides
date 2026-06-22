import { View, Text } from 'react-native';
import { StatusPill } from './StatusPill';
import { DocUploadPressable } from './DocUploadPressable';
import type { DriverDocument } from '@/features/driver/useDriverDocuments';

interface DocRowProps {
  doc: DriverDocument;
  label: string;
  onUpload: () => void;
  uploading?: boolean;
  locked?: boolean;
}

export function DocRow({ doc, label, onUpload, uploading = false, locked = false }: DocRowProps) {
  const canUpload = !locked && doc.status !== 'approved';

  return (
    <View className="flex-row items-center gap-3 border-b border-basalt-700 py-3">
      <View className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-basalt-800">
        <Text className="text-lg">📄</Text>
      </View>

      <View className="min-w-0 flex-1">
        <Text className="text-sm font-semibold text-white">{label}</Text>
        {doc.filename ? (
          <Text className="mt-0.5 text-xs text-ink-400" numberOfLines={1}>{doc.filename}</Text>
        ) : (
          <Text className="mt-0.5 text-xs text-coral-400">Not uploaded</Text>
        )}
        {doc.rejection_reason ? (
          <Text className="mt-0.5 text-xs text-coral-400">{doc.rejection_reason}</Text>
        ) : null}
      </View>

      <View className="shrink-0 items-end gap-2">
        <StatusPill variant={doc.status} testID={`status-${doc.slug}`} />
        {canUpload && (
          <DocUploadPressable
            testID={`upload-${doc.slug}`}
            label={doc.filename ? 'Replace' : 'Upload'}
            uploading={uploading}
            onPress={onUpload}
          />
        )}
      </View>
    </View>
  );
}
