import { View, Text } from 'react-native';
import type { DriverMessage } from '@/features/driver/useDriverMessages';

interface MessageItemProps {
  message: DriverMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const date = new Date(message.created_at).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View className="border-b border-basalt-700 py-4">
      <View className="mb-1 flex-row items-center gap-2">
        {!message.read && (
          <View className="h-2 w-2 shrink-0 rounded-full bg-coral-500" />
        )}
        <Text className="flex-1 text-xs text-ink-400">
          {message.subject ? `${message.subject} · ` : ''}{date}
        </Text>
      </View>
      <Text className="text-sm leading-relaxed text-ink-200">{message.body}</Text>
    </View>
  );
}
