import { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RideMap } from '@/lib/maps/RideMap';
import { useDriverBooking } from '@/features/driver/useDriverBooking';
import { useAcceptBooking } from '@/features/driver/useAcceptBooking';
import { useCancelBooking } from '@/features/driver/useCancelBooking';
import { useCompleteBooking } from '@/features/driver/useCompleteBooking';
import { startSharing, stopSharing } from '@/lib/location/rideShare';
import { track } from '@/lib/observability/analytics';
import { useTrackingStore } from '@/lib/stores/useTrackingStore';
import { CurrentRideCard } from '@/components/driver/CurrentRideCard';
import { Button } from '@/components/ui/Button';
import type { ApiError } from '@/lib/api/client';

// driver-side bookings include a `driver` field that the base Booking type doesn't model
type BookingWithDriver = {
  id: number;
  ref: string;
  status: string;
  pickup: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff: string;
  passengers: number;
  fare: string;
  driver?: { name?: string; car?: string; plate?: string; phone?: string };
};

export default function RideDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const rideId = Number(id);

  const booking = useDriverBooking(rideId);
  const accept = useAcceptBooking();
  const cancel = useCancelBooking();
  const complete = useCompleteBooking();

  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);

  const lastDriverPosition = useTrackingStore((s) => s.lastDriverPosition);

  useEffect(() => {
    return () => {
      if (sharingRef.current) void stopSharing();
    };
  }, []);

  useEffect(() => {
    sharingRef.current = sharing;
  }, [sharing]);

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
        try { await cancel.mutateAsync({ bookingId: rideId }); } catch { /* best-effort */ }
        setError(t('driver.location_denied'));
        return;
      }
      if (shareResult.status === 'error') {
        try { await cancel.mutateAsync({ bookingId: rideId }); } catch { /* best-effort */ }
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

  async function onRelease() {
    setError(null);
    try {
      await cancel.mutateAsync({ bookingId: rideId });
      await stopSharing();
      setSharing(false);
    } catch {
      // non-critical
    }
  }

  async function onEndRide() {
    setError(null);
    try {
      await complete.mutateAsync({ bookingId: rideId });
      await stopSharing();
      setSharing(false);
    } catch {
      // non-critical
    }
  }

  function onNavigate() {
    if (!booking.data) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.data.pickup_lat},${booking.data.pickup_lng}`;
    void Linking.openURL(url);
  }

  if (booking.isLoading || !booking.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-basalt-950">
        <ActivityIndicator color="#2cd4c4" />
      </SafeAreaView>
    );
  }

  const b = booking.data as unknown as BookingWithDriver;

  const markers: React.ComponentProps<typeof RideMap>['markers'] = [
    {
      id: 'pickup',
      latitude: b.pickup_lat,
      longitude: b.pickup_lng,
      title: t('driver.pickup_label'),
      tint: '#0bb8ad',
    },
  ];

  if (lastDriverPosition) {
    markers.push({
      id: 'driver',
      latitude: lastDriverPosition.lat,
      longitude: lastDriverPosition.lng,
      title: t('driver.driver_label'),
      tint: '#ffb24a',
    });
  }

  return (
    <View className="flex-1 bg-basalt-950">
      <View className="flex-1">
        <RideMap
          testID="ride-map"
          camera={{ latitude: b.pickup_lat, longitude: b.pickup_lng, zoom: 13 }}
          markers={markers}
        />
      </View>

      <SafeAreaView edges={['bottom']} className="bg-basalt-950">
        <View className="gap-3 px-0 pb-4 pt-2">
          {sharing ? (
            <View testID="live-share-banner" className="mx-4 rounded-md bg-lagoon-900 px-4 py-2">
              <Text className="text-center text-sm text-lagoon-400">
                {t('driver.live_share_active')}
              </Text>
            </View>
          ) : null}

          {error ? (
            <Text testID="accept-error" className="px-4 text-danger">
              {error}
            </Text>
          ) : null}

          {b.status === 'open' ? (
            <View className="px-4">
              <Button
                testID="accept-btn"
                label={t('driver.accept_cta')}
                loading={accept.isPending}
                disabled={accept.isPending}
                onPress={onAccept}
              />
            </View>
          ) : null}

          {b.status === 'accepted' ? (
            <CurrentRideCard
              ride={{
                id: b.id,
                ref: b.ref,
                pickup: b.pickup,
                dropoff: b.dropoff,
                fare: b.fare,
                passengers: b.passengers,
                rider_name: b.driver?.name,
                rider_phone: b.driver?.phone,
              }}
              onNavigate={onNavigate}
              onEndRide={onEndRide}
              onRelease={onRelease}
              endingRide={complete.isPending}
              releasing={cancel.isPending}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
