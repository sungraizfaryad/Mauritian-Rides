import { View, Text, Pressable, Linking, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

export interface CurrentRide {
  id: number;
  ref: string;
  pickup: string;
  dropoff: string;
  fare: string;
  passengers: number;
  rider_name?: string;
  rider_phone?: string;
}

interface CurrentRideCardProps {
  ride: CurrentRide;
  onNavigate: () => void;
  onEndRide: () => void;
  onRelease: () => void;
  endingRide?: boolean;
  releasing?: boolean;
}

export function CurrentRideCard({
  ride,
  onNavigate,
  onEndRide,
  onRelease,
  endingRide = false,
  releasing = false,
}: CurrentRideCardProps) {
  const { t } = useTranslation();

  function callRider() {
    if (ride.rider_phone) void Linking.openURL(`tel:${ride.rider_phone}`);
  }

  function whatsappRider() {
    if (ride.rider_phone) {
      const num = ride.rider_phone.replace(/\D/g, '');
      void Linking.openURL(`https://wa.me/${num}`);
    }
  }

  function confirmEnd() {
    Alert.alert(
      t('driver.current_ride_end_confirm_title'),
      t('driver.current_ride_end_confirm_body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('driver.current_ride_end_confirm_yes'), style: 'destructive', onPress: onEndRide },
      ],
    );
  }

  function confirmRelease() {
    Alert.alert(
      t('driver.current_ride_release_confirm_title'),
      t('driver.current_ride_release_confirm_body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('driver.current_ride_release_confirm_yes'), style: 'destructive', onPress: onRelease },
      ],
    );
  }

  return (
    <View testID="current-ride-card" className="mx-4 mb-3 overflow-hidden rounded-2xl">
      <LinearGradient
        colors={['#0bb8ad', '#0a4843']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-5"
      >
        <Text className="font-mono text-xs uppercase tracking-widest text-lagoon-200">
          {t('driver.current_ride_eyebrow')}
        </Text>
        <Text className="mt-1 text-xl font-bold text-white">{ride.ref}</Text>

        {/* rider block */}
        {ride.rider_name ? (
          <View className="mt-4 rounded-xl bg-white/10 p-3">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-semibold text-white">{ride.rider_name}</Text>
                {ride.rider_phone ? (
                  <Text className="font-mono text-xs text-lagoon-200">{ride.rider_phone}</Text>
                ) : null}
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  testID="current-ride-call"
                  onPress={callRider}
                  className="rounded-full bg-white/20 p-2 active:opacity-60"
                >
                  <Text className="text-base">📞</Text>
                </Pressable>
                <Pressable
                  testID="current-ride-whatsapp"
                  onPress={whatsappRider}
                  className="rounded-full bg-white/20 p-2 active:opacity-60"
                >
                  <Text className="text-base">💬</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {/* route block */}
        <View className="mt-4 gap-2">
          <View className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <Text className="flex-1 text-sm text-white">{ride.pickup}</Text>
          </View>
          <View className="ml-1 h-4 w-px border-l border-dashed border-white/40" />
          <View className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full bg-lagoon-300" />
            <Text className="flex-1 text-sm text-lagoon-100">{ride.dropoff}</Text>
          </View>
        </View>

        {/* fare block */}
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-sm text-lagoon-200">{t('driver.fare_label')}</Text>
          <Text className="text-xl font-bold text-white">Rs {ride.fare}</Text>
        </View>

        {/* act-row 1: Navigate + End Ride */}
        <View className="mt-5 flex-row gap-3">
          <Pressable
            testID="current-ride-navigate"
            onPress={onNavigate}
            className="flex-1 items-center justify-center rounded-full bg-white py-3 active:opacity-80"
          >
            <Text className="text-sm font-semibold text-lagoon-900">{t('driver.current_ride_navigate')}</Text>
          </Pressable>
          <Pressable
            testID="current-ride-end"
            onPress={confirmEnd}
            disabled={endingRide}
            className="flex-1 items-center justify-center rounded-full bg-black/35 py-3 active:opacity-80"
          >
            {endingRide ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm font-semibold text-white">{t('driver.current_ride_end')}</Text>
            )}
          </Pressable>
        </View>

        {/* act-row 2: Release */}
        <View className="mt-2.5">
          <Pressable
            testID="current-ride-release"
            onPress={confirmRelease}
            disabled={releasing}
            className="w-full items-center justify-center rounded-full border border-white/30 py-3 active:opacity-60"
          >
            {releasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm text-white/70">{t('driver.current_ride_release')}</Text>
            )}
          </Pressable>
          <Text className="mt-1.5 text-center text-xs text-white/40">
            {t('driver.current_ride_release_hint')}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
