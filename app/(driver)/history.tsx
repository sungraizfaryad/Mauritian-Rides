import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDriverHistory, type HistoryBooking } from '@/features/driver/useDriverHistory';

function HistoryRow({ booking }: { booking: HistoryBooking }) {
  const { t } = useTranslation();
  const date = new Date(booking.created_at).toLocaleDateString('en-MU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View
      testID={`history-row-${booking.id}`}
      className="mx-4 mb-3 rounded-xl border border-basalt-700 bg-basalt-800 p-4"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-ink-400">{date}</Text>
        <Text className="text-sm font-bold text-sunset-400">Rs {booking.fare}</Text>
      </View>
      <View className="mt-2 gap-1">
        <View className="flex-row items-center gap-2">
          <View className="h-1.5 w-1.5 rounded-full bg-coral-500" />
          <Text className="flex-1 text-sm text-white" numberOfLines={1}>{booking.pickup}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-1.5 w-1.5 rounded-full bg-lagoon-500" />
          <Text className="flex-1 text-sm text-ink-300" numberOfLines={1}>{booking.dropoff}</Text>
        </View>
      </View>
      {booking.rider_name ? (
        <Text className="mt-2 text-xs text-ink-400">
          {t('driver.history_rider')}: {booking.rider_name}
        </Text>
      ) : null}
      <View
        className={`mt-2 self-start rounded-full px-2 py-0.5 ${
          booking.status === 'completed' ? 'bg-lagoon-900' : 'bg-basalt-700'
        }`}
      >
        <Text
          className={`text-xs font-semibold ${
            booking.status === 'completed' ? 'text-lagoon-400' : 'text-ink-400'
          }`}
        >
          {booking.status === 'completed'
            ? t('driver.history_status_completed')
            : t('driver.history_status_cancelled')}
        </Text>
      </View>
    </View>
  );
}

export default function DriverHistory() {
  const { t } = useTranslation();
  const { data, isLoading, isRefetching, refetch } = useDriverHistory();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-basalt-950">
        <ActivityIndicator color="#2cd4c4" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-basalt-950">
      <View className="px-4 pb-2 pt-6">
        <Text className="text-2xl font-bold text-white">{t('driver.history_title')}</Text>
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <HistoryRow booking={item} />}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6 py-16">
            <Text className="text-center text-ink-400">{t('driver.history_empty')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
