import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useMyBookings } from '@/features/bookings/useMyBookings';

export default function Trips() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyBookings();

  if (isLoading) {
    return (
      <Screen testID="trips-screen" contentClassName="items-center justify-center">
        <ActivityIndicator color="#90e0ef" />
      </Screen>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Screen testID="trips-screen" contentClassName="items-center justify-center">
        <Text className="mb-6 text-center text-basalt-300">{t('trips.empty')}</Text>
        <Button label={t('trips.book_cta')} onPress={() => router.push('/(rider)')} />
      </Screen>
    );
  }

  return (
    <Screen testID="trips-screen">
      <Text className="mb-4 text-3xl font-bold text-lagoon-300">{t('trips.title')}</Text>
      <FlatList
        data={data}
        keyExtractor={(b) => b.ref}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <Pressable
            testID={`trip-${item.ref}`}
            onPress={() => router.push(`/(rider)/bookings/${item.ref}`)}
            className="rounded-md border border-basalt-500 bg-basalt-700 p-4 active:opacity-80"
          >
            <Text className="font-semibold text-white">{item.ref}</Text>
            <Text className="text-basalt-300">
              {item.pickup} → {item.dropoff}
            </Text>
            <Text className="mt-1 text-sm text-lagoon-300">{t(`tracker.status_${item.status}`)}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
