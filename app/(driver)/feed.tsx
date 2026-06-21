import { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFeed, type OpenRide } from '@/features/driver/useFeed';
import { track } from '@/lib/observability/analytics';

function RideCard({ ride }: { ride: OpenRide }) {
  const { t } = useTranslation();
  return (
    <Pressable
      testID={`feed-card-${ride.id}`}
      onPress={() => router.push(`/(driver)/ride/${ride.id}` as never)}
      className="rounded-md border border-basalt-500 bg-basalt-700 p-4 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-white">{ride.ref}</Text>
        <Text className="text-amber-400">Rs {ride.fare}</Text>
      </View>
      <Text className="mt-1 text-basalt-300">{ride.pickup} → {ride.dropoff}</Text>
      <View className="mt-2 flex-row gap-4">
        <Text className="text-sm text-basalt-400">{t('driver.passengers_label')}: {ride.passengers}</Text>
        <Text className="text-sm text-basalt-400">{t('driver.distance_label')}: {ride.distance_km} km</Text>
      </View>
    </Pressable>
  );
}

export default function DriverFeed() {
  const { t } = useTranslation();
  const { data, isLoading, isRefetching, refetch } = useFeed();

  useEffect(() => { track('ride_feed_viewed'); }, []);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-basalt-900">
        <ActivityIndicator color="#90e0ef" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-basalt-900">
      <View className="px-6 py-4">
        <Text className="text-3xl font-bold text-lagoon-300">{t('driver.feed_title')}</Text>
      </View>
      <FlashList
        data={data ?? []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View className="px-6 pb-3">
            <RideCard ride={item} />
          </View>
        )}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6 py-16">
            <Text className="text-center text-basalt-400">{t('driver.feed_empty')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
