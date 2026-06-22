import { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFeed, type OpenRide } from '@/features/driver/useFeed';
import { useAcceptBooking, parseAcceptError } from '@/features/driver/useAcceptBooking';
import { usePackages } from '@/features/driver/usePackages';
import { track } from '@/lib/observability/analytics';

import { StatusBanner } from '@/components/driver/StatusBanner';
import { GreetingCard } from '@/components/driver/GreetingCard';
import { BookingFeedRow } from '@/components/driver/BookingFeedRow';
import { CurrentRideCard } from '@/components/driver/CurrentRideCard';
import { EarnSummaryCard } from '@/components/driver/EarnSummaryCard';
import { CapModal } from '@/components/driver/CapModal';
import { DocGateSheet } from '@/components/driver/DocGateSheet';

import { useCompleteBooking } from '@/features/driver/useCompleteBooking';
import { useCancelBooking } from '@/features/driver/useCancelBooking';
import { Linking } from 'react-native';

export default function DriverFeed() {
  const { t } = useTranslation();
  const { data, isLoading, isRefetching, refetch } = useFeed();
  const accept = useAcceptBooking();
  const complete = useCompleteBooking();
  const cancel = useCancelBooking();
  const pkgs = usePackages();

  const [capModalVisible, setCapModalVisible] = useState(false);
  const [docGateVisible, setDocGateVisible] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [passedIds, setPassedIds] = useState<Set<number>>(new Set());

  useEffect(() => { track('ride_feed_viewed'); }, []);

  const handleAccept = useCallback(async (rideId: number) => {
    setAcceptingId(rideId);
    try {
      await accept.mutateAsync({ bookingId: rideId });
      router.push(`/(driver)/ride/${rideId}` as never);
    } catch (err) {
      const kind = parseAcceptError(err);
      if (kind === 'cap_reached') {
        setCapModalVisible(true);
      } else if (kind === 'docs_required') {
        setDocGateVisible(true);
      }
      // race_lost / generic — feed will repoll; nothing else needed
    } finally {
      setAcceptingId(null);
    }
  }, [accept]);

  const handlePass = useCallback((rideId: number) => {
    setPassedIds((prev) => new Set(prev).add(rideId));
    track('ride_passed', { ride_id: rideId });
  }, []);

  function handleNavigate(ride: { pickup_lat: number; pickup_lng: number; pickup: string }) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${ride.pickup_lat},${ride.pickup_lng}`;
    void Linking.openURL(url);
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-basalt-950">
        <ActivityIndicator color="#2cd4c4" />
      </SafeAreaView>
    );
  }

  const feed = data ?? {
    open_rides: [],
    current_ride: null,
    plan: 'free',
    used: 0,
    limit: 10,
    cap_reached: false,
    reset_at: '',
    driver_name: '',
    driver_status: 'active' as const,
  };

  const visibleRides = (feed.open_rides ?? []).filter((r) => !passedIds.has(r.id));

  const driverStatus = feed.driver_status ?? 'active';
  const showBanner = driverStatus !== 'active';

  // header rendered above FlashList data
  function ListHeader() {
    return (
      <>
        {showBanner && (
          <StatusBanner
            status={driverStatus as 'pending' | 'bg_check' | 'suspended'}
            onCta={driverStatus === 'pending' ? () => setDocGateVisible(true) : undefined}
          />
        )}
        <GreetingCard
          name={feed.driver_name ?? ''}
          plan={feed.plan}
        />
        <View className="mt-4 mb-2 px-4">
          <Text className="font-mono text-xs uppercase tracking-widest text-ink-400">
            {t('driver.feed_section_label')}
          </Text>
        </View>
        {feed.current_ride && (
          <CurrentRideCard
            ride={feed.current_ride}
            onNavigate={() =>
              handleNavigate({
                pickup_lat: feed.current_ride!.pickup_lat,
                pickup_lng: feed.current_ride!.pickup_lng,
                pickup: feed.current_ride!.pickup,
              })
            }
            onEndRide={async () => {
              try {
                await complete.mutateAsync({ bookingId: feed.current_ride!.id });
              } catch {
                // non-critical; driver can retry
              }
            }}
            onRelease={async () => {
              try {
                await cancel.mutateAsync({ bookingId: feed.current_ride!.id });
              } catch {
                // best-effort
              }
            }}
            endingRide={complete.isPending}
            releasing={cancel.isPending}
          />
        )}
        {!feed.current_ride && (
          <EarnSummaryCard
            used={feed.used}
            limit={feed.limit}
            plan={feed.plan}
          />
        )}
      </>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-basalt-950">
      <FlashList
        data={visibleRides}
        keyExtractor={(item: OpenRide) => item.id.toString()}
        renderItem={({ item }: { item: OpenRide }) => (
          <BookingFeedRow
            id={item.id}
            ref={item.ref}
            pickup={item.pickup}
            dropoff={item.dropoff}
            fare={item.fare}
            passengers={item.passengers}
            distanceKm={item.distance_km}
            createdAt={item.created_at}
            capReached={feed.cap_reached}
            accepting={acceptingId === item.id}
            onAccept={() => void handleAccept(item.id)}
            onPass={() => handlePass(item.id)}
          />
        )}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          feed.cap_reached ? (
            <View className="px-4 py-6">
              <Text className="text-center text-ink-400">{t('driver.cap_reached')}</Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center px-6 py-12">
              <Text className="text-center text-ink-400">{t('driver.feed_empty')}</Text>
            </View>
          )
        }
      />

      <CapModal
        visible={capModalVisible}
        onClose={() => setCapModalVisible(false)}
        packages={pkgs.data ?? []}
        loadingPackages={pkgs.isLoading}
        currentPlan={feed.plan}
        resetAt={feed.reset_at || new Date().toISOString()}
        onUpgrade={(plan) => {
          setCapModalVisible(false);
          router.push({ pathname: '/(driver)/plan', params: { upgrade: plan } } as never);
        }}
      />

      <DocGateSheet
        visible={docGateVisible}
        onClose={() => setDocGateVisible(false)}
        onSubmit={() => setDocGateVisible(false)}
      />
    </SafeAreaView>
  );
}
