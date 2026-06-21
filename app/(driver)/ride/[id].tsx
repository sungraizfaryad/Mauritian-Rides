import { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RideMap } from '@/lib/maps/RideMap';
import { Button } from '@/components/ui/Button';
import { useDriverBooking } from '@/features/driver/useDriverBooking';
import { useAcceptBooking } from '@/features/driver/useAcceptBooking';
import { useCancelBooking } from '@/features/driver/useCancelBooking';
import { startSharing, stopSharing } from '@/lib/location/rideShare';
import { track } from '@/lib/observability/analytics';
import { useTrackingStore } from '@/lib/stores/useTrackingStore';
import type { ApiError } from '@/lib/api/client';

export default function RideDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const rideId = Number(id);

  const booking = useDriverBooking(rideId);
  const accept = useAcceptBooking();
  const cancel = useCancelBooking();

  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  // keep a ref so the unmount cleanup always sees the latest value without
  // re-registering the effect (which would cause a double-stop on manual cancel)
  const sharingRef = useRef(false);

  const lastDriverPosition = useTrackingStore((s) => s.lastDriverPosition);

  // stop location task on unmount only
  useEffect(() => {
    return () => {
      if (sharingRef.current) void stopSharing();
    };
  }, []);

  // keep ref in sync
  useEffect(() => {
    sharingRef.current = sharing;
  }, [sharing]);

  // spec §7: stop sharing automatically when the ride ends
  useEffect(() => {
    const status = booking.data?.status;
    if (status === 'completed' || status === 'cancelled') {
      void stopSharing().then(() => setSharing(false));
    }
    if (status === 'completed') {
      track('booking_completed', { booking_id: booking.data?.id ?? 0 });
    }
  }, [booking.data?.status]);

  async function onAccept() {
    setError(null);
    try {
      await accept.mutateAsync({ bookingId: rideId });

      const shareResult = await startSharing(rideId);
      if (shareResult.status === 'denied') {
        try {
          await cancel.mutateAsync({ bookingId: rideId });
        } catch {
          // best-effort; surface the location error regardless
        }
        setError(t('driver.location_denied'));
        return;
      }
      if (shareResult.status === 'error') {
        try {
          await cancel.mutateAsync({ bookingId: rideId });
        } catch {
          // best-effort
        }
        setError(t('driver.live_share_start_failed'));
        return;
      }
      setSharing(true);
    } catch (e) {
      const ae = e as ApiError;
      if (ae.code === 'cap_reached') {
        setError(t('driver.cap_reached'));
      } else if (ae.code === 'race_lost') {
        setError(t('driver.race_lost'));
      } else {
        setError(t('driver.accept_failed'));
      }
    }
  }

  async function onCancel() {
    setError(null);
    try {
      await cancel.mutateAsync({ bookingId: rideId });
      await stopSharing();
      setSharing(false);
    } catch {
      // non-critical; driver can retry
    }
  }

  if (booking.isLoading || !booking.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-basalt-900">
        <ActivityIndicator color="#90e0ef" />
      </SafeAreaView>
    );
  }

  const b = booking.data;

  const markers: React.ComponentProps<typeof RideMap>['markers'] = [
    {
      id: 'pickup',
      latitude: b.pickup_lat,
      longitude: b.pickup_lng,
      title: t('driver.pickup_label'),
      tint: '#00b4d8',
    },
  ];

  if (lastDriverPosition) {
    markers.push({
      id: 'driver',
      latitude: lastDriverPosition.lat,
      longitude: lastDriverPosition.lng,
      title: t('driver.driver_label'),
      tint: '#f59e0b',
    });
  }

  return (
    <View className="flex-1 bg-basalt-900">
      <View className="flex-1">
        <RideMap
          testID="ride-map"
          camera={{ latitude: b.pickup_lat, longitude: b.pickup_lng, zoom: 13 }}
          markers={markers}
        />
      </View>

      <SafeAreaView edges={['bottom']} className="bg-basalt-900">
        <View className="gap-3 px-6 py-4">
          {sharing ? (
            <View testID="live-share-banner" className="rounded-md bg-lagoon-900 px-4 py-2">
              <Text className="text-center text-sm text-lagoon-300">
                {t('driver.live_share_active')}
              </Text>
            </View>
          ) : null}

          <Text className="text-xl font-bold text-white">{b.ref}</Text>
          <Text className="text-basalt-300">{b.pickup} → {b.dropoff}</Text>
          <View className="flex-row gap-4">
            <Text className="text-sm text-basalt-400">
              {t('driver.fare_label')}: Rs {b.fare}
            </Text>
            <Text className="text-sm text-basalt-400">
              {t('driver.passengers_label')}: {b.passengers}
            </Text>
          </View>

          {error ? (
            <Text testID="accept-error" className="text-danger">
              {error}
            </Text>
          ) : null}

          {b.status === 'open' ? (
            <Button
              testID="accept-btn"
              label={t('driver.accept_cta')}
              loading={accept.isPending}
              disabled={accept.isPending}
              onPress={onAccept}
            />
          ) : null}

          {b.status === 'accepted' ? (
            <Button
              testID="cancel-btn"
              variant="ghost"
              label={t('driver.cancel_ride')}
              loading={cancel.isPending}
              disabled={cancel.isPending}
              onPress={onCancel}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
