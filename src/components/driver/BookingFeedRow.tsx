import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface BookingFeedRowProps {
  id: number;
  ref: string;
  pickup: string;
  dropoff: string;
  fare: string;
  passengers: number;
  distanceKm: number;
  createdAt: string;
  locked?: boolean;      // another driver accepted just now
  capReached?: boolean;  // driver hit monthly cap
  accepting?: boolean;
  onAccept: () => void;
  onPass: () => void;
}

function TimeBlock({ iso }: { iso: string }) {
  const d = new Date(iso);
  const hhmm = d.toLocaleTimeString('en-MU', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dm = d.toLocaleDateString('en-MU', { day: 'numeric', month: 'short' });
  return (
    <View className="w-14 items-center justify-center pr-3 border-r border-basalt-700">
      <Text className="text-base font-bold text-white">{hhmm}</Text>
      <Text className="mt-0.5 text-xs text-ink-400">{dm}</Text>
    </View>
  );
}

export function BookingFeedRow({
  id,
  ref: bookingRef,
  pickup,
  dropoff,
  fare,
  passengers,
  distanceKm,
  createdAt,
  locked = false,
  capReached = false,
  accepting = false,
  onAccept,
  onPass,
}: BookingFeedRowProps) {
  const { t } = useTranslation();

  if (capReached) return null;

  return (
    <View
      testID={`feed-row-${id}`}
      className="mx-4 mb-3 overflow-hidden rounded-2xl border border-basalt-700 bg-basalt-800"
    >
      {locked && (
        <View
          testID="feed-row-locked"
          className="absolute inset-0 z-10 rounded-2xl bg-basalt-900/70"
          pointerEvents="none"
        />
      )}

      <View className="flex-row items-center gap-0 p-4">
        <TimeBlock iso={createdAt} />

        {/* route + meta */}
        <View className="flex-1 px-3">
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-coral-500" />
            <Text className="flex-1 text-sm text-white" numberOfLines={1}>{pickup}</Text>
          </View>
          <View className="ml-1 my-1 w-0.5 h-3 bg-basalt-600" />
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-lagoon-500" />
            <Text className="flex-1 text-sm text-ink-300" numberOfLines={1}>{dropoff}</Text>
          </View>

          <View className="mt-2 flex-row gap-3">
            <Text className="text-xs text-ink-400">
              {t('driver.passengers_label')}: {passengers}
            </Text>
            <Text className="text-xs text-ink-400">
              {distanceKm} km
            </Text>
          </View>
        </View>

        {/* fare */}
        <View className="items-end">
          <Text className="text-lg font-bold text-sunset-400">Rs {fare}</Text>
        </View>
      </View>

      {/* actions */}
      <View className="flex-row border-t border-basalt-700">
        <Pressable
          testID={`feed-pass-${id}`}
          onPress={onPass}
          disabled={locked || accepting}
          className="flex-1 items-center py-3 active:opacity-60"
        >
          <Text className="text-sm font-semibold text-ink-400">{t('driver.feed_pass')}</Text>
        </Pressable>

        <View className="w-px bg-basalt-700" />

        <Pressable
          testID={`feed-accept-${id}`}
          onPress={onAccept}
          disabled={locked || accepting}
          className="flex-1 overflow-hidden active:opacity-80"
        >
          <LinearGradient
            colors={['#ffb24a', '#ff7a54', '#ee5a30']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="flex-1 items-center justify-center py-3"
          >
            {accepting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-sm font-semibold text-white">{t('driver.feed_accept')}</Text>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
