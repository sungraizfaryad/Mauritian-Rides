import { useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { MessageItem } from '@/components/driver/MessageItem';
import { useDriverMessages } from '@/features/driver/useDriverMessages';

export default function MessagesScreen() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useDriverMessages(true);

  useEffect(() => {
    void refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <Screen dark testID="messages-screen" contentClassName="items-center justify-center">
        <ActivityIndicator color="#2cd4c4" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen dark testID="messages-screen">
        <Text className="text-sm text-coral-400">{t('driver.messages_error')}</Text>
      </Screen>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Screen dark testID="messages-screen" contentClassName="items-center justify-center">
        <Text className="text-center text-sm text-ink-400">{t('driver.messages_empty')}</Text>
      </Screen>
    );
  }

  const sorted = [...data].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <Screen dark testID="messages-screen">
      <Text className="mb-4 text-xl font-bold text-white">{t('driver.messages_title')}</Text>
      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <MessageItem message={item} />}
        scrollEnabled={false}
      />
    </Screen>
  );
}
