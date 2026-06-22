import { View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import { AutocompleteDropdown } from '@/components/shared/AutocompleteDropdown';
import { estimateFare, type VehicleType } from '@/lib/fare/estimate';
import { LOCATIONS, type Location } from '@/constants/locations';

interface Props {
  title: string;
  liveLabel: string;
  pickupLabel: string;
  pickupPlaceholder: string;
  dropoffLabel: string;
  dropoffPlaceholder: string;
  fareLabel: string;
  distanceLabel: string;
  durationLabel: string;
  ctaLabel: string;
  estimateNote: string;
  onContinue: () => void;
}

// LOCATIONS is non-empty by construction — assert to satisfy strict noUncheckedIndexedAccess.
const SSR = LOCATIONS[0] as Location; // default pickup (SSR Airport)

export function FareEstimatorWidget({
  title, liveLabel, pickupLabel, pickupPlaceholder,
  dropoffLabel, dropoffPlaceholder, fareLabel,
  distanceLabel, durationLabel, ctaLabel, estimateNote,
  onContinue,
}: Props) {
  const [pickup, setPickup] = useState<Location>(SSR);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [vehicle] = useState<VehicleType>('sedan');

  const result = pickup && dropoff ? estimateFare(pickup, dropoff, vehicle) : null;

  // Rough duration estimate: 28 km/h avg island speed
  const durationMin = result ? Math.round((result.km / 28) * 60) : null;

  function swapLocations() {
    if (!dropoff) return;
    const tmp = pickup;
    setPickup(dropoff);
    setDropoff(tmp);
  }

  return (
    <View
      className="rounded-r-xl overflow-visible"
      style={{ backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } }}
    >
      {/* Widget header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-sand-100">
        <Text className="text-sm font-bold text-basalt-900">{title}</Text>
        <View className="flex-row items-center gap-1.5 bg-lagoon-500 rounded-pill px-2.5 py-1">
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
          <Text className="text-[10px] font-bold text-white">{liveLabel}</Text>
        </View>
      </View>

      <View className="px-4 pt-3 pb-1 z-10">
        {/* Pickup */}
        <AutocompleteDropdown
          label={pickupLabel}
          placeholder={pickupPlaceholder}
          value={pickup.name}
          onSelect={setPickup}
          dotColor="coral"
        />

        {/* Swap button */}
        <View className="flex-row justify-center my-1">
          <Pressable
            onPress={swapLocations}
            className="rounded-full border border-sand-200 p-2"
            style={{ backgroundColor: '#faf6ee' }}
          >
            <Text style={{ fontSize: 14, color: '#7d8ea3' }}>⇅</Text>
          </Pressable>
        </View>

        {/* Dropoff */}
        <AutocompleteDropdown
          label={dropoffLabel}
          placeholder={dropoffPlaceholder}
          value={dropoff?.name ?? ''}
          onSelect={setDropoff}
          dotColor="teal"
        />
      </View>

      {/* Fare output */}
      <View className="px-4 pt-3 pb-1 border-t border-sand-100 mt-3">
        <Text className="text-xs text-ink-400 mb-1">{fareLabel}</Text>
        <View className="flex-row items-baseline gap-1">
          <Text className="text-sm text-ink-400">Rs</Text>
          <Text className="text-3xl font-bold text-basalt-900">
            {result ? result.fare.toLocaleString() : '—'}
          </Text>
          {result && (
            <Text className="text-sm text-ink-400">
              ±{result.margin}
            </Text>
          )}
        </View>

        <View className="flex-row gap-4 mt-2">
          <View>
            <Text className="text-[10px] text-ink-400">{distanceLabel}</Text>
            <Text className="text-xs font-semibold text-basalt-900">
              {result ? `${result.km} km` : '—'}
            </Text>
          </View>
          <View>
            <Text className="text-[10px] text-ink-400">{durationLabel}</Text>
            <Text className="text-xs font-semibold text-basalt-900">
              {durationMin ? `~${durationMin} min` : '—'}
            </Text>
          </View>
        </View>

        <Text className="text-[10px] text-ink-400 mt-2 leading-3">{estimateNote}</Text>
      </View>

      {/* CTA */}
      <View className="px-4 pt-3 pb-4">
        <Pressable
          onPress={onContinue}
          className="rounded-pill py-4 items-center"
          style={{ backgroundColor: '#0bb8ad' }}
        >
          <Text className="font-bold text-white">{ctaLabel} →</Text>
        </Pressable>
      </View>
    </View>
  );
}
