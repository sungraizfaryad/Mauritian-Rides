import { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RideMap } from '@/lib/maps/RideMap';
import { Button } from '@/components/ui/Button';
import { getCurrentPickup } from '@/lib/location/currentPosition';
import type { Pickup } from '@/schemas/booking';

const MAURITIUS = { latitude: -20.2, longitude: 57.5, zoom: 10 };

interface PickupPickerProps {
  onConfirm: (pickup: Pickup) => void;
  onCancel: () => void;
}

export function PickupPicker({ onConfirm, onCancel }: PickupPickerProps) {
  const { t } = useTranslation();
  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  function onMapPress(coords: { latitude: number; longitude: number }) {
    setPickup({
      latitude: coords.latitude,
      longitude: coords.longitude,
      label: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
    });
  }

  async function useMyLocation() {
    setLocating(true);
    setDenied(false);
    const result = await getCurrentPickup();
    setLocating(false);
    if (result.status === 'ok') setPickup(result.pickup);
    else setDenied(true);
  }

  return (
    <View className="flex-1 bg-basalt-900">
      <View className="flex-1">
        <RideMap
          testID="pickup-map"
          camera={pickup ? { ...pickup, zoom: 14 } : MAURITIUS}
          markers={
            pickup
              ? [{ id: 'pickup', latitude: pickup.latitude, longitude: pickup.longitude, title: t('booking.pickup_label'), tint: '#00b4d8' }]
              : []
          }
          onPress={onMapPress}
        />
      </View>

      <View className="gap-3 px-6 py-4">
        {denied ? <Text className="text-danger">{t('booking.location_denied')}</Text> : null}
        {pickup ? (
          <Text className="text-basalt-300" numberOfLines={1}>
            {pickup.label}
          </Text>
        ) : null}

        <Button
          testID="pickup-use-location"
          variant="ghost"
          label={locating ? t('booking.locating') : t('booking.use_my_location')}
          loading={locating}
          onPress={useMyLocation}
        />
        <Button
          testID="pickup-confirm"
          label={t('booking.set_pickup_cta')}
          disabled={!pickup}
          onPress={() => pickup && onConfirm(pickup)}
        />
        <Button testID="pickup-cancel" variant="ghost" label={t('common.cancel')} onPress={onCancel} />
      </View>
    </View>
  );
}
