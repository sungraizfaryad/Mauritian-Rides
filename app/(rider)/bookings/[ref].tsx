import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RideMap, type RideMarker } from '@/lib/maps/RideMap';
import { useBooking } from '@/features/bookings/useBooking';
import { useRideLocation } from '@/features/bookings/useRideLocation';

export default function Tracker() {
  const { t } = useTranslation();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const booking = useBooking(ref);

  const status = booking.data?.status ?? 'open';
  const isAccepted = status === 'accepted';
  const driver = useRideLocation(booking.data?.id ?? 0, isAccepted && !!booking.data);

  if (booking.isLoading || !booking.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-basalt-900">
        <ActivityIndicator color="#90e0ef" />
      </SafeAreaView>
    );
  }

  const b = booking.data;
  const markers: RideMarker[] = [
    { id: 'pickup', latitude: b.pickup_lat, longitude: b.pickup_lng, title: t('tracker.pickup_pin'), tint: '#00b4d8' },
  ];
  if (driver.data) {
    markers.push({
      id: 'driver',
      latitude: driver.data.latitude,
      longitude: driver.data.longitude,
      title: t('tracker.driver_pin'),
      tint: '#f59e0b',
    });
  }

  const camera = driver.data
    ? { latitude: driver.data.latitude, longitude: driver.data.longitude, zoom: 14 }
    : { latitude: b.pickup_lat, longitude: b.pickup_lng, zoom: 13 };

  return (
    <View className="flex-1 bg-basalt-900">
      <View className="flex-1">
        <RideMap testID="tracker-map" camera={camera} markers={markers} />
      </View>
      <SafeAreaView edges={['bottom']} className="bg-basalt-900">
        <View testID="tracker-status" className="gap-1 px-6 py-4">
          <Text className="text-lg font-semibold text-lagoon-300">{t(`tracker.status_${status}`)}</Text>
          <Text className="text-basalt-300">
            {b.pickup} → {b.dropoff}
          </Text>
          <Text className="text-basalt-300">
            {t('tracker.fare')}: Rs {b.fare}
          </Text>
          {isAccepted && !driver.data ? <Text className="text-basalt-500">{t('tracker.waiting_location')}</Text> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
